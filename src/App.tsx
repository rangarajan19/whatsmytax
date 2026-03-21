import { useState, useCallback, useEffect, useRef } from 'react';
import {
  calcOldRegime, calcNewRegime, fmt,
  calcEPFContribution, calcOtherIncome, calcFreelanceIncome,
  EMPTY_DEDUCTIONS, EMPTY_OTHER_INCOME, EMPTY_FREELANCE,
} from './tax';
import type {
  TaxResult, Deductions, Deductions80C, EPFInput, HRAInput,
  Section80DInput, NPS80CCD1BInput, HomeLoanInterestInput,
  EducationLoanInput, PerquisiteAllowances, OtherIncome, FreelanceIncome,
} from './tax';
import { RegimeBreakdown } from './components/RegimeCard';
import DeductionsPanel from './components/DeductionsPanel';
import HRAPanel from './components/HRAPanel';
import Section80DPanel from './components/Section80DPanel';
import NPSPanel from './components/NPSPanel';
import HomeLoanInterestPanel from './components/HomeLoanInterestPanel';
import EducationLoanPanel from './components/EducationLoanPanel';
import PerquisiteAllowancesPanel from './components/PerquisiteAllowancesPanel';
import OtherIncomePanel from './components/OtherIncomePanel';
import CapitalGainsPanel from './components/CapitalGainsPanel';
import FreelancePanel from './components/FreelancePanel';
import CTCHelper from './components/CTCHelper';
import LandingPage from './components/LandingPage';
import { trackEvent } from './analytics';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { ToggleGroup, ToggleGroupItem } from './components/ui/toggle-group';

const SALARIED_TABS = [
  { id: 'perquisites',    label: 'Perquisites' },
  { id: 'other-income',  label: 'Other Income' },
  { id: 'capital-gains', label: 'Capital Gains' },
  { id: '80c',           label: '80C' },
  { id: 'hra',           label: 'HRA' },
  { id: '80d',           label: '80D' },
  { id: 'nps',           label: 'NPS' },
  { id: 'home-loan',     label: 'Home Loan 24b' },
  { id: 'edu-loan',      label: 'Education Loan' },
];

const FREELANCE_TABS = [
  { id: 'freelance',     label: 'Freelance Income' },
  { id: 'other-income',  label: 'Other Income' },
  { id: 'capital-gains', label: 'Capital Gains' },
  { id: '80c',           label: '80C' },
  { id: '80d',           label: '80D' },
  { id: 'nps',           label: 'NPS' },
  { id: 'home-loan',     label: 'Home Loan 24b' },
  { id: 'edu-loan',      label: 'Education Loan' },
];

function inferAnnualBasic(grossAnnual: number): number {
  return Math.round(grossAnnual * 0.40);
}

const STORAGE_KEY = 'whatsmytax_v1';

function loadStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as {
      salary: string;
      deductions: Deductions;
      otherIncome: OtherIncome;
      freelanceIncome?: FreelanceIncome;
      userType?: 'salaried' | 'freelance';
    };
  } catch { return null; }
}

export default function App() {
  const saved = loadStorage();
  const [salary, setSalary]               = useState(saved?.salary ?? '');
  const [result, setResult]               = useState<TaxResult | null>(null);
  const [error, setError]                 = useState('');
  const [deductions, setDeductions]       = useState<Deductions>(saved?.deductions ?? { ...EMPTY_DEDUCTIONS });
  const [otherIncome, setOtherIncome]     = useState<OtherIncome>(saved?.otherIncome ?? { ...EMPTY_OTHER_INCOME });
  const [freelanceIncome, setFreelanceIncome] = useState<FreelanceIncome>(saved?.freelanceIncome ?? { ...EMPTY_FREELANCE });
  const [userType, setUserType]           = useState<'salaried' | 'freelance'>(saved?.userType ?? 'salaried');
  const [viewMode, setViewMode]           = useState<'landing' | 'main' | 'detail'>(saved?.userType ? 'main' : 'landing');
  const [activeDetailTab, setActiveDetailTab] = useState<string>('other-income');
  const [activeTaxTab, setActiveTaxTab]       = useState<'old' | 'new'>('new');

  const lastInferredBasic  = useRef<number>(0);
  const prefillTimer       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSalaryVal    = useRef<number>(0);
  const otherIncomeRef     = useRef<OtherIncome>(saved?.otherIncome ?? EMPTY_OTHER_INCOME);
  const freelanceIncomeRef = useRef<FreelanceIncome>(saved?.freelanceIncome ?? EMPTY_FREELANCE);

  // ── Analytics refs (one-shot per session) ────────────────────────
  const hasSalaryTracked = useRef(false);
  const trackedTabData   = useRef<Set<string>>(new Set());

  function trackFirstData(tab: string, hasData: boolean) {
    if (hasData && !trackedTabData.current.has(tab)) {
      trackEvent('tab_has_data', { tab });
      trackedTabData.current.add(tab);
    }
  }

  // ── Persist state to localStorage ────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ salary, deductions, otherIncome, freelanceIncome, userType }));
    } catch { /* storage full — ignore */ }
  }, [salary, deductions, otherIncome, freelanceIncome, userType]);

  // ── Live recalculation ───────────────────────────────────────────
  const recalculate = useCallback((gross: number, ded: Deductions, oi: OtherIncome, fl: FreelanceIncome) => {
    const oiResult = calcOtherIncome(oi);
    const flResult = calcFreelanceIncome(fl);
    setResult({
      gross,
      deductions: ded,
      otherIncome: oi,
      otherIncomeResult: oiResult,
      freelanceIncome: fl,
      freelanceResult: flResult,
      old: calcOldRegime(gross, ded, oi, fl),
      new: calcNewRegime(gross, oi, ded.perquisites, fl),
    });
  }, []);

  useEffect(() => {
    const raw = salary.replace(/,/g, '').trim();
    const val = parseFloat(raw) || 0; // allow 0 for pure freelancers
    if (raw && isNaN(parseFloat(raw))) {
      setError('Please enter a valid amount.');
      setResult(null);
      return;
    }
    // Show results if salary > 0 OR freelance income is set
    const hasFreelance = freelanceIncomeRef.current.scheme !== 'none'
      && (freelanceIncomeRef.current.grossReceipts > 0 || freelanceIncomeRef.current.manualProfit > 0);
    if (!raw && !hasFreelance) {
      setError('');
      setResult(null);
      latestSalaryVal.current = 0;
      if (prefillTimer.current) clearTimeout(prefillTimer.current);
      return;
    }
    setError('');
    latestSalaryVal.current = val;
    if (val > 0 && !hasSalaryTracked.current) {
      trackEvent('salary_entered');
      hasSalaryTracked.current = true;
    }
    setDeductions(prev => {
      recalculate(val, prev, otherIncomeRef.current, freelanceIncomeRef.current);
      return prev;
    });
    if (prefillTimer.current) clearTimeout(prefillTimer.current);
    if (val > 0) {
      prefillTimer.current = setTimeout(() => {
        const finalVal = latestSalaryVal.current;
        const annualBasic = inferAnnualBasic(finalVal);
        setDeductions(prev => {
          const prevInferred = lastInferredBasic.current;
          const epfUnchanged = prev.epfInput.basicSalary === 0 || prev.epfInput.basicSalary === prevInferred;
          const hraUnchanged = prev.hraInput.basicSalary === 0 || prev.hraInput.basicSalary === prevInferred;
          const updatedEPF   = epfUnchanged ? { ...prev.epfInput, basicSalary: annualBasic } : prev.epfInput;
          const updatedHRA   = hraUnchanged ? { ...prev.hraInput, basicSalary: annualBasic } : prev.hraInput;
          const epfContrib   = calcEPFContribution(updatedEPF);
          lastInferredBasic.current = annualBasic;
          const updated: Deductions = {
            ...prev,
            epfInput:   updatedEPF,
            section80C: { ...prev.section80C, epf: epfContrib },
            hraInput:   updatedHRA,
          };
          recalculate(finalVal, updated, otherIncomeRef.current, freelanceIncomeRef.current);
          return updated;
        });
      }, 600);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salary]);

  // ── Handlers ─────────────────────────────────────────────────────
  function handleEPFChange(epfInput: EPFInput) {
    const epfAmount = calcEPFContribution(epfInput);
    const updated: Deductions = {
      ...deductions,
      epfInput,
      section80C: { ...deductions.section80C, epf: epfAmount },
      hraInput: deductions.hraInput.basicSalary === 0 && epfInput.basicSalary > 0
        ? { ...deductions.hraInput, basicSalary: epfInput.basicSalary }
        : deductions.hraInput,
    };
    setDeductions(updated);
    if (result) recalculate(result.gross, updated, otherIncomeRef.current, freelanceIncomeRef.current);
  }

  function handle80CChange(key: keyof Deductions80C, value: number) {
    const updated: Deductions = {
      ...deductions,
      section80C: { ...deductions.section80C, [key]: value },
    };
    setDeductions(updated);
    if (result) recalculate(result.gross, updated, otherIncomeRef.current, freelanceIncomeRef.current);
    trackFirstData('80c', value > 0);
  }

  function handleHRAChange(hraInput: HRAInput) {
    const updated: Deductions = { ...deductions, hraInput };
    setDeductions(updated);
    if (result) recalculate(result.gross, updated, otherIncomeRef.current, freelanceIncomeRef.current);
    trackFirstData('hra', hraInput.rentPaid > 0);
  }

  function handle80DChange(section80D: Section80DInput) {
    const updated: Deductions = { ...deductions, section80D };
    setDeductions(updated);
    if (result) recalculate(result.gross, updated, otherIncomeRef.current, freelanceIncomeRef.current);
    trackFirstData('80d', section80D.selfPremium > 0 || section80D.parentPremium > 0);
  }

  function handleNPSChange(nps80CCD1B: NPS80CCD1BInput) {
    const updated: Deductions = { ...deductions, nps80CCD1B };
    setDeductions(updated);
    if (result) recalculate(result.gross, updated, otherIncomeRef.current, freelanceIncomeRef.current);
    trackFirstData('nps', nps80CCD1B.amount > 0);
  }

  function handleHomeLoanChange(homeLoanInterest: HomeLoanInterestInput) {
    const updated: Deductions = { ...deductions, homeLoanInterest };
    setDeductions(updated);
    if (result) recalculate(result.gross, updated, otherIncomeRef.current, freelanceIncomeRef.current);
    trackFirstData('home-loan', homeLoanInterest.interestPaid > 0);
  }

  function handleEducationLoanChange(educationLoan: EducationLoanInput) {
    const updated: Deductions = { ...deductions, educationLoan };
    setDeductions(updated);
    if (result) recalculate(result.gross, updated, otherIncomeRef.current, freelanceIncomeRef.current);
    trackFirstData('edu-loan', educationLoan.interestPaid > 0);
  }

  function handlePerquisitesChange(perquisites: PerquisiteAllowances) {
    const updated: Deductions = { ...deductions, perquisites };
    setDeductions(updated);
    if (result) recalculate(result.gross, updated, otherIncomeRef.current, freelanceIncomeRef.current);
    const hasPerq = Object.values(perquisites).some(v => typeof v === 'number' && v > 0);
    trackFirstData('perquisites', hasPerq);
  }

  function handleOtherIncomeChange(oi: OtherIncome) {
    otherIncomeRef.current = oi;
    setOtherIncome(oi);
    if (result) recalculate(result.gross, deductions, oi, freelanceIncomeRef.current);
    const hasOI = oi.savingsInterest > 0 || oi.fdInterest > 0 || oi.dividends > 0 || oi.rentalIncome > 0;
    trackFirstData('other-income', hasOI);
    const hasCG = oi.ltcgEquity > 0 || oi.stcgEquity > 0 || oi.ltcgOther > 0 || oi.stcgOther > 0;
    trackFirstData('capital-gains', hasCG);
  }

  function handleFreelanceChange(fl: FreelanceIncome) {
    freelanceIncomeRef.current = fl;
    setFreelanceIncome(fl);
    const gross = parseFloat(salary.replace(/,/g, '').trim()) || 0;
    recalculate(gross, deductions, otherIncomeRef.current, fl);
    trackFirstData('freelance', fl.grossReceipts > 0 || fl.manualProfit > 0);
  }

  // ── Derived values ────────────────────────────────────────────────
  const activeTabs  = userType === 'freelance' ? FREELANCE_TABS : SALARIED_TABS;
  const epf         = deductions.section80C.epf;
  const oldHigher   = result !== null && result.old.total > result.new.total;
  const newHigher   = result !== null && result.new.total > result.old.total;
  const oiResult    = result ? result.otherIncomeResult : calcOtherIncome(EMPTY_OTHER_INCOME);
  const flResult    = result ? result.freelanceResult   : calcFreelanceIncome(EMPTY_FREELANCE);

  // In-hand: salaried = (gross - tax - EPF) / 12
  //          freelancer = (gross receipts - tax) / 12 — EPF not applicable
  const freelanceGross = userType === 'freelance'
    ? (freelanceIncome.scheme === 'manual' ? freelanceIncome.manualProfit : freelanceIncome.grossReceipts)
    : 0;
  const newInHand = userType === 'freelance'
    ? Math.round(Math.max(0, freelanceGross - (result?.new.total ?? 0)) / 12)
    : result ? Math.round(Math.max(0, result.gross - result.new.total - epf) / 12) : 0;
  const oldInHand = userType === 'freelance'
    ? Math.round(Math.max(0, freelanceGross - (result?.old.total ?? 0)) / 12)
    : result ? Math.round(Math.max(0, result.gross - result.old.total - epf) / 12) : 0;

  // ── Landing page ──────────────────────────────────────────────────
  if (viewMode === 'landing') {
    return (
      <LandingPage
        onSelect={(type) => {
          setUserType(type);
          if (type === 'freelance') setSalary('0');
          setViewMode('main');
          trackEvent('flow_selected', { type });
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-[#004030] font-sans">
      <div className="md:max-w-[35vw] mx-auto">

      {/* ── Header ── */}
      <header className="bg-[#B6FF00] px-4 pt-4 pb-8 rounded-b-[40px]">
        {viewMode === 'detail' ? (
          <div className="flex items-center justify-between">
            <button
              className="flex items-center gap-1.5 text-sm font-semibold text-[#004030]"
              onClick={() => setViewMode('main')}
            >
              ← Back
            </button>
            <span className="text-sm font-semibold text-[#004030]">
              Old Regime {result ? fmt(result.old.total) : ''}
            </span>
          </div>
        ) : userType === 'freelance' ? (
          <div>
            <button
              onClick={() => setViewMode('landing')}
              className="text-xs font-semibold text-[#004030]/60 hover:text-[#004030] mb-3 flex items-center gap-1"
            >
              ← Home
            </button>
            <h1 className="text-2xl font-bold tracking-tight text-[#004030] text-center">What's My Tax?</h1>
            <p className="text-[#004030]/60 text-sm mt-0.5 mb-4 text-center">
              Freelancer · FY 2024–25 (AY 2025–26)
            </p>
            {flResult.taxableIncome > 0 ? (
              <div className="bg-white/70 rounded-xl px-4 py-3 border border-[#004030]/15">
                <p className="text-xs font-semibold text-[#004030]/50 mb-0.5">Freelance Income (taxable)</p>
                <p className="text-xl font-bold text-[#004030]">{fmt(flResult.taxableIncome)}</p>
                <p className="text-xs text-[#004030]/50 mt-0.5">
                  {freelanceIncome.scheme === '44ADA' && `50% of ${fmt(freelanceIncome.grossReceipts)} receipts (44ADA)`}
                  {freelanceIncome.scheme === '44AD'  && `Presumptive income from ${fmt(freelanceIncome.grossReceipts)} turnover (44AD)`}
                  {freelanceIncome.scheme === 'manual' && `Net profit (books of accounts)`}
                </p>
              </div>
            ) : (
              <button
                onClick={() => {
                  setActiveDetailTab('freelance');
                  setViewMode('detail');
                }}
                className="w-full bg-[#004030] text-[#B6FF00] rounded-xl px-4 py-3 text-sm font-semibold hover:bg-[#004030]/90 transition-colors"
              >
                Add your freelance income →
              </button>
            )}
          </div>
        ) : (
          <div>
            <button
              onClick={() => setViewMode('landing')}
              className="text-xs font-semibold text-[#004030]/60 hover:text-[#004030] mb-3 flex items-center gap-1"
            >
              ← Home
            </button>
            <h1 className="text-2xl font-bold tracking-tight text-[#004030] text-center">What's My Tax?</h1>
            <p className="text-[#004030]/60 text-sm mt-0.5 mb-4 text-center">
              Income Tax Calculator — FY 2024–25 (AY 2025–26)
            </p>
            <p className="text-xs font-semibold text-[#004030]/70 mb-1.5">Gross Annual Salary</p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#004030] font-semibold pointer-events-none">₹</span>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={salary}
                onChange={e => setSalary(e.target.value)}
                className="pl-7 h-auto py-3 text-base font-semibold bg-white border-[#004030]/20 focus-visible:ring-[#004030]/40"
              />
            </div>
            {error && <p className="text-destructive text-xs mt-1.5">{error}</p>}
            <CTCHelper onUseGross={gross => setSalary(String(gross))} />
          </div>
        )}
      </header>

      {/* ── Main view ── */}
      {result && viewMode === 'main' && (
        <>
          {/* Finance Act label */}
          <p className="text-center text-[10px] text-[#004030]/40 font-medium pt-3 pb-1">
            FY 2024–25 · Based on Finance Act 2024 · Last updated March 2025
          </p>

          {/* Tax & In-hand Salary */}
          <div className="px-4 py-4 border-b">
            <p className="text-xs font-semibold text-[#004030]/50 uppercase tracking-wider mb-3">
              Tax & In-hand Salary
            </p>
            <TaxRow label="New Regime" tax={result.new.total} inHand={newInHand} isHigher={newHigher} regime="new" isFreelance={userType === 'freelance'} />
            <TaxRow label="Old Regime" tax={result.old.total} inHand={oldInHand} isHigher={oldHigher} regime="old" isFreelance={userType === 'freelance'} />
          </div>

          {/* Tax Calculations */}
          <p className="text-xs font-semibold text-[#004030]/50 uppercase tracking-wider px-4 pt-4 pb-2">
            Tax Calculations
          </p>
          <div className="mx-4 bg-card rounded-xl ring-1 ring-foreground/10 overflow-hidden">
            <div className="border-b px-4 py-3">
              <ToggleGroup
                value={activeTaxTab}
                onValueChange={(v) => {
                  if (v) {
                    setActiveTaxTab(v as 'old' | 'new');
                    window.scrollTo({ top: 0, behavior: 'instant' });
                  }
                }}
                className="w-full"
              >
                <ToggleGroupItem value="old">Old Regime</ToggleGroupItem>
                <ToggleGroupItem value="new">New Regime</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="px-4 py-4 pb-28">
              {activeTaxTab === 'old' && (
                <RegimeBreakdown
                  regime="old"
                  label="Pre-2020 slabs with deductions"
                  result={result.old}
                  isHigher={oldHigher}
                  gross={result.gross}
                  epf={epf}
                  isFreelance={userType === 'freelance'}
                />
              )}
              {activeTaxTab === 'new' && (
                <RegimeBreakdown
                  regime="new"
                  label="Simplified slabs, higher std. deduction (₹75K)"
                  result={result.new}
                  isHigher={newHigher}
                  gross={result.gross}
                  epf={epf}
                  isFreelance={userType === 'freelance'}
                />
              )}
            </div>
          </div>

        </>
      )}

      {/* Fixed CTA — always visible on main view */}
      {viewMode === 'main' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t">
          <div className="md:max-w-[35vw] mx-auto px-4 py-3">
            <Button
              className="w-full h-12 bg-[#004030] text-[#B6FF00] rounded-xl text-sm font-semibold hover:bg-[#004030]/90 active:scale-[0.98]"
              onClick={() => {
                setActiveDetailTab(activeTabs[0].id);
                setViewMode('detail');
                trackEvent('detail_opened', { userType });
              }}
            >
              {result ? 'Next →' : 'Add income details →'}
            </Button>
          </div>
        </div>
      )}

      {/* ── Detail view ── */}
      {viewMode === 'detail' && (
        <>
          {/* Progress indicator */}
          {(() => {
            const i = activeTabs.findIndex(t => t.id === activeDetailTab);
            return (
              <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                <div className="flex-1 h-1 bg-[#004030]/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#004030] rounded-full transition-all duration-300"
                    style={{ width: `${((i + 1) / activeTabs.length) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] font-semibold text-[#004030]/50 shrink-0">
                  {i + 1} / {activeTabs.length}
                </span>
              </div>
            );
          })()}

          {/* Horizontal tab bar — underline style matching Figma */}
          <div className="flex overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {activeTabs.map(tab => (
              <button
                key={tab.id}
                className={`relative shrink-0 px-3 py-3 text-sm transition-colors whitespace-nowrap ${
                  activeDetailTab === tab.id
                    ? 'font-semibold text-[#004030]'
                    : 'font-medium text-[#004030]/50'
                }`}
                onClick={() => {
                  setActiveDetailTab(tab.id);
                  trackEvent('tab_viewed', { tab: tab.id });
                }}
              >
                {tab.label}
                {activeDetailTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#004030]" />
                )}
              </button>
            ))}
          </div>

          {/* Panel content — strip card bg/ring so panels sit on page bg */}
          <div className="overflow-y-auto pb-24 px-4 pt-4">
            {activeDetailTab === 'other-income' && (
              <OtherIncomePanel value={otherIncome} result={oiResult} onChange={handleOtherIncomeChange} />
            )}
            {activeDetailTab === 'capital-gains' && (
              <CapitalGainsPanel value={otherIncome} result={oiResult} onChange={handleOtherIncomeChange} />
            )}
            {activeDetailTab === 'freelance' && (
              <FreelancePanel value={freelanceIncome} result={flResult} onChange={handleFreelanceChange} isFreelanceOnly={userType === 'freelance'} />
            )}
            {activeDetailTab === '80c' && (
              <DeductionsPanel
                epfInput={deductions.epfInput}
                onEPFChange={handleEPFChange}
                values={deductions.section80C}
                onChange={handle80CChange}
              />
            )}
            {activeDetailTab === 'hra' && (
              <HRAPanel hraInput={deductions.hraInput} onChange={handleHRAChange} />
            )}
            {activeDetailTab === '80d' && (
              <Section80DPanel value={deductions.section80D} onChange={handle80DChange} />
            )}
            {activeDetailTab === 'nps' && (
              <NPSPanel value={deductions.nps80CCD1B} onChange={handleNPSChange} />
            )}
            {activeDetailTab === 'home-loan' && (
              <HomeLoanInterestPanel value={deductions.homeLoanInterest} onChange={handleHomeLoanChange} />
            )}
            {activeDetailTab === 'edu-loan' && (
              <EducationLoanPanel values={deductions.educationLoan} onChange={handleEducationLoanChange} />
            )}
            {activeDetailTab === 'perquisites' && (
              <PerquisiteAllowancesPanel values={deductions.perquisites} onChange={handlePerquisitesChange} />
            )}
          </div>

          {/* Fixed Next/Done */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t">
            <div className="md:max-w-[35vw] mx-auto px-4 py-3 flex gap-3">
              <Button
                variant="outline"
                className="h-12 px-5 rounded-xl text-sm font-semibold border-[#004030]/30 text-[#004030] hover:bg-[#004030]/5 active:scale-[0.98]"
                onClick={() => {
                  const i = activeTabs.findIndex(t => t.id === activeDetailTab);
                  if (i > 0) {
                    const prevTab = activeTabs[i - 1].id;
                    setActiveDetailTab(prevTab);
                    trackEvent('tab_viewed', { tab: prevTab });
                  } else {
                    setViewMode('main');
                  }
                }}
              >
                ← Back
              </Button>
              <Button
                className="flex-1 h-12 bg-[#004030] text-[#B6FF00] rounded-xl text-sm font-semibold hover:bg-[#004030]/90 active:scale-[0.98]"
                onClick={() => {
                  const i = activeTabs.findIndex(t => t.id === activeDetailTab);
                  if (i < activeTabs.length - 1) {
                    const nextTab = activeTabs[i + 1].id;
                    setActiveDetailTab(nextTab);
                    trackEvent('tab_viewed', { tab: nextTab });
                  } else {
                    setActiveTaxTab('old');
                    setViewMode('main');
                  }
                }}
              >
                {activeDetailTab === activeTabs.at(-1)?.id ? 'Done' : 'Next →'}
              </Button>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
}

// ─── Helper components ─────────────────────────────────────────────────────

function TaxRow({ label, tax, inHand, isHigher, regime, isFreelance }: {
  label: string; tax: number; inHand: number; isHigher: boolean; regime: 'old' | 'new'; isFreelance?: boolean;
}) {
  const bg = regime === 'new' ? 'bg-[rgba(0,128,0,0.05)]' : 'bg-card ring-1 ring-foreground/10';
  return (
    <div className={`grid grid-cols-2 gap-2 mb-2 last:mb-0 rounded-xl px-4 py-4 ${bg}`}>
      <div>
        <p className="text-xs text-[#004030]/50 font-medium mb-1">{label}</p>
        <p className={`text-xl font-bold ${isHigher ? 'text-[#C44A3A]' : 'text-[#004030]'}`}>
          {fmt(tax)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-xs text-[#004030]/50 font-medium mb-1">
          {isFreelance ? 'Monthly Est.' : 'In-Hand Salary'}
        </p>
        <p className="text-xl font-bold text-[#004030]">{fmt(inHand)}</p>
      </div>
    </div>
  );
}

