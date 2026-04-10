import { useState, useCallback, useEffect, useRef } from 'react';
import {
  calcOldRegime, calcNewRegime, fmt,
  calcEPFContribution, calcOtherIncome, calcFreelanceIncome,
  EMPTY_DEDUCTIONS, EMPTY_OTHER_INCOME, EMPTY_FREELANCE,
  getRegimeRecommendation, total80C,
  MAX_80C, MAX_80D_SELF, MAX_80D_SELF_SENIOR, MAX_80D_PARENT, MAX_80D_PARENT_SENIOR,
  MAX_HOME_LOAN_INTEREST,
} from './tax';
import type {
  TaxResult, Deductions, Deductions80C, EPFInput, HRAInput,
  Section80DInput, NPS80CCD1BInput, HomeLoanInterestInput,
  EducationLoanInput, PerquisiteAllowances, OtherIncome, FreelanceIncome,
} from './tax';
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
import ChangelogPage from './components/ChangelogPage';
import { trackEvent } from './analytics';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';

const SALARIED_TABS_OLD = [
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

const SALARIED_TABS_NEW = [
  { id: 'perquisites',    label: 'Perquisites' },
  { id: 'other-income',  label: 'Other Income' },
  { id: 'capital-gains', label: 'Capital Gains' },
];

const FREELANCE_TABS_OLD = [
  { id: 'freelance',     label: 'Freelance Income' },
  { id: 'other-income',  label: 'Other Income' },
  { id: 'capital-gains', label: 'Capital Gains' },
  { id: '80c',           label: '80C' },
  { id: '80d',           label: '80D' },
  { id: 'nps',           label: 'NPS' },
  { id: 'home-loan',     label: 'Home Loan 24b' },
  { id: 'edu-loan',      label: 'Education Loan' },
];

const FREELANCE_TABS_NEW = [
  { id: 'freelance',     label: 'Freelance Income' },
  { id: 'other-income',  label: 'Other Income' },
  { id: 'capital-gains', label: 'Capital Gains' },
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
  const [viewMode, setViewMode]           = useState<'landing' | 'main' | 'detail' | 'summary' | 'changelog'>(saved?.userType ? 'main' : 'landing');
  const [activeDetailTab, setActiveDetailTab] = useState<string>('other-income');
  const [selectedRegime, setSelectedRegime]   = useState<'old' | 'new'>('old');

  const lastInferredBasic  = useRef<number>(0);
  const prefillTimer       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSalaryVal    = useRef<number>(0);
  const otherIncomeRef     = useRef<OtherIncome>(saved?.otherIncome ?? EMPTY_OTHER_INCOME);
  const freelanceIncomeRef = useRef<FreelanceIncome>(saved?.freelanceIncome ?? EMPTY_FREELANCE);
  const scrollPanelRef     = useRef<HTMLDivElement>(null);
  const scrollHideTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const activeTabs = userType === 'freelance'
    ? (selectedRegime === 'new' ? FREELANCE_TABS_NEW : FREELANCE_TABS_OLD)
    : (selectedRegime === 'new' ? SALARIED_TABS_NEW  : SALARIED_TABS_OLD);

  // ── Tab filled detection (for sidebar ticks) ──────────────────────
  function hasTabData(tabId: string): boolean {
    switch (tabId) {
      case 'freelance':
        return freelanceIncome.grossReceipts > 0 || freelanceIncome.manualProfit > 0;
      case 'other-income':
        return otherIncome.savingsInterest > 0 || otherIncome.fdInterest > 0
          || otherIncome.dividends > 0 || otherIncome.rentalIncome > 0;
      case 'capital-gains':
        return otherIncome.ltcgEquity > 0 || otherIncome.stcgEquity > 0
          || otherIncome.ltcgOther > 0 || otherIncome.stcgOther > 0;
      case '80c':
        return Object.values(deductions.section80C).some(v => typeof v === 'number' && v > 0);
      case 'hra':
        return deductions.hraInput.rentPaid > 0;
      case '80d':
        return deductions.section80D.selfPremium > 0 || deductions.section80D.parentPremium > 0;
      case 'nps':
        return deductions.nps80CCD1B.amount > 0;
      case 'home-loan':
        return deductions.homeLoanInterest.interestPaid > 0;
      case 'edu-loan':
        return deductions.educationLoan.interestPaid > 0;
      case 'perquisites':
        return Object.values(deductions.perquisites).some(v => typeof v === 'number' && v > 0);
      default:
        return false;
    }
  }
  const epf           = deductions.section80C.epf;
  const oldHigher     = result !== null && result.old.total > result.new.total;
  const newHigher     = result !== null && result.new.total > result.old.total;

  // ── Summary page headroom items ───────────────────────────────────
  const summaryRec  = result ? getRegimeRecommendation(result.old, result.new, deductions) : null;
  const marginalRate = summaryRec?.marginalRate ?? 0;
  const headroomItems = result ? [
    {
      label: 'Section 80C',
      used: Math.min(total80C(deductions.section80C), MAX_80C),
      max: MAX_80C,
      headroom: Math.max(0, MAX_80C - Math.min(total80C(deductions.section80C), MAX_80C)),
      taxSaving: Math.round(Math.max(0, MAX_80C - Math.min(total80C(deductions.section80C), MAX_80C)) * marginalRate),
    },
    {
      label: 'Section 80D',
      used: deductions.section80D.selfPremium + deductions.section80D.parentPremium,
      max: (deductions.section80D.selfSenior ? MAX_80D_SELF_SENIOR : MAX_80D_SELF) +
           (deductions.section80D.parentSenior ? MAX_80D_PARENT_SENIOR : MAX_80D_PARENT),
      headroom: Math.max(0,
        (deductions.section80D.selfSenior ? MAX_80D_SELF_SENIOR : MAX_80D_SELF) +
        (deductions.section80D.parentSenior ? MAX_80D_PARENT_SENIOR : MAX_80D_PARENT) -
        deductions.section80D.selfPremium - deductions.section80D.parentPremium),
      taxSaving: Math.round(Math.max(0,
        (deductions.section80D.selfSenior ? MAX_80D_SELF_SENIOR : MAX_80D_SELF) +
        (deductions.section80D.parentSenior ? MAX_80D_PARENT_SENIOR : MAX_80D_PARENT) -
        deductions.section80D.selfPremium - deductions.section80D.parentPremium) * marginalRate),
    },
    {
      label: 'NPS 80CCD(1B)',
      used: deductions.nps80CCD1B.amount,
      max: 50_000,
      headroom: Math.max(0, 50_000 - deductions.nps80CCD1B.amount),
      taxSaving: Math.round(Math.max(0, 50_000 - deductions.nps80CCD1B.amount) * marginalRate),
    },
    {
      label: 'Home Loan Interest (24b)',
      used: deductions.homeLoanInterest.isSelfOccupied
        ? Math.min(deductions.homeLoanInterest.interestPaid, MAX_HOME_LOAN_INTEREST) : 0,
      max: MAX_HOME_LOAN_INTEREST,
      headroom: deductions.homeLoanInterest.isSelfOccupied
        ? Math.max(0, MAX_HOME_LOAN_INTEREST - Math.min(deductions.homeLoanInterest.interestPaid, MAX_HOME_LOAN_INTEREST)) : 0,
      taxSaving: deductions.homeLoanInterest.isSelfOccupied
        ? Math.round(Math.max(0, MAX_HOME_LOAN_INTEREST - Math.min(deductions.homeLoanInterest.interestPaid, MAX_HOME_LOAN_INTEREST)) * marginalRate) : 0,
    },
  ].filter(i => i.headroom > 0 && i.taxSaving > 0) : [];
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

  // ── Changelog ─────────────────────────────────────────────────────
  if (viewMode === 'changelog') {
    return <ChangelogPage onBack={() => setViewMode('landing')} />;
  }

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
        onChangelog={() => setViewMode('changelog')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-[#004030] font-sans">

      {/* ── Header — full width ── */}
      <header className="no-print bg-[#B6FF00] px-4 pt-4 pb-8 rounded-b-[40px]">
        <div className={`${viewMode === 'detail' || viewMode === 'summary' ? 'md:max-w-[48vw]' : 'md:max-w-[35vw]'} mx-auto`}>
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
        ) : viewMode === 'summary' ? (
          <div className="flex items-center justify-center">
            <span className="text-sm font-semibold text-[#004030]">Tax Summary</span>
          </div>
        ) : userType === 'freelance' ? (
          <div>
            <div className="flex justify-start mb-3">
              <button
                onClick={() => setViewMode('landing')}
                className="text-xs font-semibold text-[#004030]/60 hover:text-[#004030] flex items-center gap-1"
              >
                ← Home
              </button>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#004030] text-center">What's My Tax?</h1>
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
            <div className="flex justify-start mb-3">
              <button
                onClick={() => setViewMode('landing')}
                className="text-xs font-semibold text-[#004030]/60 hover:text-[#004030] flex items-center gap-1"
              >
                ← Home
              </button>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#004030] text-center">What's My Tax?</h1>
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
                className="pl-7 h-auto py-2 text-base font-medium bg-white border-[#004030]/20 focus-visible:ring-[#004030]/40"
              />
            </div>
            {error && <p className="text-destructive text-xs mt-1.5">{error}</p>}
            <CTCHelper onUseGross={gross => setSalary(String(gross))} />
          </div>
        )}
        </div>
      </header>

      {/* ── Body content ── */}
      <div className={`${viewMode === 'detail' ? 'md:max-w-[48vw]' : 'md:max-w-[35vw]'} mx-auto`}>

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
            <TaxRow label="New Regime" tax={result.new.total} inHand={newInHand} isHigher={newHigher} regime="new" isFreelance={userType === 'freelance'} selected={selectedRegime === 'new'} onClick={() => { setSelectedRegime('new'); setActiveDetailTab('perquisites'); setViewMode('detail'); }} />
            <TaxRow label="Old Regime" tax={result.old.total} inHand={oldInHand} isHigher={oldHigher} regime="old" isFreelance={userType === 'freelance'} selected={selectedRegime === 'old'} onClick={() => { setSelectedRegime('old'); setActiveDetailTab('perquisites'); setViewMode('detail'); }} />
          </div>


        </>
      )}

      {/* Fixed CTA — always visible on main view */}
      {viewMode === 'main' && (
        <div className="no-print fixed bottom-0 left-0 right-0 bg-white border-t">
          <div className="md:max-w-[35vw] mx-auto px-4 pt-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
            <Button
              className="w-full h-12 bg-[#004030] text-[#B6FF00] rounded-xl text-sm font-semibold hover:bg-[#004030]/90 transition-transform duration-100 ease-out active:scale-[0.995]"
              onClick={() => {
                setActiveDetailTab(activeTabs[0].id);
                setViewMode('detail');
                trackEvent('detail_opened', { userType, regime: selectedRegime });
              }}
            >
              {result ? `Add ${selectedRegime === 'new' ? 'New' : 'Old'} Regime details →` : 'Add income details →'}
            </Button>
          </div>
        </div>
      )}

      {/* ── Summary view ── */}
      {viewMode === 'summary' && result && (
        <div className="md:max-w-[48vw] mx-auto pb-10">
          <p className="text-center text-[10px] text-[#004030]/40 font-medium pt-3 pb-4">
            FY 2024–25 · Based on Finance Act 2024 · Last updated March 2025
          </p>

          {/* 1 ── Old Regime breakdown */}
          <div className="mx-4 mb-4">
            <p className="text-xs font-semibold text-[#004030]/50 uppercase tracking-wider mb-2">Old Regime</p>
            <div className="bg-card rounded-2xl ring-1 ring-foreground/10 overflow-hidden">
              <div className="px-4 pt-4 pb-3 space-y-2">
                {/* Gross */}
                <div className="flex justify-between">
                  <span className="text-sm text-[#004030]/70">Gross Income</span>
                  <span className="text-sm font-semibold text-[#004030]">{fmt(result.gross)}</span>
                </div>
                {/* Deductions */}
                {result.old.stdDeduction > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-[#004030]/50">Standard Deduction</span>
                    <span className="text-sm text-[#004030]/50">− {fmt(result.old.stdDeduction)}</span>
                  </div>
                )}
                {result.old.deduction80C > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-[#004030]/50">
                      80C <span className="text-[11px]">({fmt(result.old.deduction80C)} of {fmt(MAX_80C)})</span>
                    </span>
                    <span className="text-sm text-[#004030]/50">− {fmt(result.old.deduction80C)}</span>
                  </div>
                )}
                {result.old.deductionHRA > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-[#004030]/50">HRA Exemption</span>
                    <span className="text-sm text-[#004030]/50">− {fmt(result.old.deductionHRA)}</span>
                  </div>
                )}
                {result.old.deduction80D > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-[#004030]/50">Section 80D</span>
                    <span className="text-sm text-[#004030]/50">− {fmt(result.old.deduction80D)}</span>
                  </div>
                )}
                {result.old.deductionNPS > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-[#004030]/50">NPS 80CCD(1B)</span>
                    <span className="text-sm text-[#004030]/50">− {fmt(result.old.deductionNPS)}</span>
                  </div>
                )}
                {result.old.deductionHomeLoan > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-[#004030]/50">Home Loan Interest (24b)</span>
                    <span className="text-sm text-[#004030]/50">− {fmt(result.old.deductionHomeLoan)}</span>
                  </div>
                )}
                {result.old.deductionEducationLoan > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-[#004030]/50">Education Loan (80E)</span>
                    <span className="text-sm text-[#004030]/50">− {fmt(result.old.deductionEducationLoan)}</span>
                  </div>
                )}
                {result.old.deductionPerquisites > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-[#004030]/50">Perquisites</span>
                    <span className="text-sm text-[#004030]/50">− {fmt(result.old.deductionPerquisites)}</span>
                  </div>
                )}
              </div>
              <div className="border-t px-4 py-3 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-[#004030]/50">Taxable Income</span>
                  <span className="text-sm font-semibold text-[#004030]">{fmt(result.old.taxableIncome)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-[#004030]">Tax + Cess</span>
                  <span className="text-lg font-bold text-[#004030]">{fmt(result.old.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2 ── Invest more to save (only when headroom exists) */}
          {headroomItems.length > 0 && (
            <div className="mx-4 mb-4">
              <p className="text-xs font-semibold text-[#004030]/50 uppercase tracking-wider mb-2">Invest more to save tax</p>
              <div className="bg-card rounded-2xl ring-1 ring-foreground/10 divide-y divide-border">
                {headroomItems.map(item => (
                  <div key={item.label} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-[#004030]">{item.label}</p>
                      <p className="text-xs text-[#004030]/50">{fmt(item.headroom)} more available</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-[#004030]/40 uppercase tracking-wide">Saves up to</p>
                      <p className="text-sm font-bold text-[#004030]">{fmt(item.taxSaving)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3 ── Which regime is better */}
          <div className="mx-4 mb-4">
            <p className="text-xs font-semibold text-[#004030]/50 uppercase tracking-wider mb-2">Which regime is better?</p>
            <div className="bg-card rounded-2xl ring-1 ring-foreground/10 overflow-hidden">
              {[
                { label: 'New Regime', tax: result.new.total, inHand: newInHand, better: oldHigher },
                { label: 'Old Regime', tax: result.old.total, inHand: oldInHand, better: newHigher },
              ].map(r => (
                <div key={r.label} className={`flex items-center justify-between px-4 py-3 border-b last:border-0 ${r.better ? 'bg-[#B6FF00]/20' : ''}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#004030]">{r.label}</span>
                    {r.better && (
                      <span className="text-[10px] font-bold bg-[#004030] text-[#B6FF00] px-2 py-0.5 rounded-full">Better</span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#004030]">{fmt(r.tax)}</p>
                    <p className="text-xs text-[#004030]/50">{fmt(r.inHand)}/mo</p>
                  </div>
                </div>
              ))}
              {result.old.total !== result.new.total && (
                <div className="px-4 py-2.5 bg-[#004030]/5 border-t">
                  <p className="text-xs font-semibold text-[#004030]">
                    {oldHigher
                      ? `Switch to New Regime — save ${fmt(result.old.total - result.new.total)} in tax`
                      : `Your deductions make Old Regime better — saving ${fmt(result.new.total - result.old.total)}`}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 4 ── CA CTA */}
          <div className="mx-4 bg-[#004030] rounded-2xl px-5 py-5">
            <p className="text-xs font-semibold text-[#B6FF00]/70 uppercase tracking-wider mb-1">Want expert help?</p>
            <p className="text-[15px] md:text-base font-bold text-white mb-1">Get a CA to review &amp; file for you</p>
            <p className="text-xs text-white/50 mb-4">Share your details and a qualified CA will reach out to verify your numbers and file your return.</p>
            <a
              href="https://forms.gle/vdF6KuRz1DqBZbKv6"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-[#B6FF00] text-[#004030] text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-[#B6FF00]/90 transition-colors"
            >
              I'm interested →
            </a>
          </div>

        </div>
      )}

      {/* ── Detail view ── */}
      {viewMode === 'detail' && (
        <>
          {/* Layout: sidebar on desktop, tab bar on mobile */}
          <div className="md:flex md:flex-row md:h-[calc(100vh-88px)] md:overflow-hidden">

            {/* ── Sidebar — desktop only ── */}
            <aside className="hidden md:flex md:flex-col w-[172px] shrink-0 border-r border-[#004030]/10 pt-3 px-2 gap-0.5">
              {activeTabs.map(tab => {
                const filled = hasTabData(tab.id);
                const isActive = activeDetailTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveDetailTab(tab.id);
                      trackEvent('tab_viewed', { tab: tab.id });
                    }}
                    className={`flex items-center justify-between gap-1 w-full px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${
                      isActive
                        ? 'bg-[#B6FF00] font-bold text-[#004030]'
                        : 'font-medium text-[#004030]/60 hover:bg-[#004030]/5'
                    }`}
                  >
                    <span className="truncate">{tab.label}</span>
                    {filled && (
                      <span className={`text-xs shrink-0 ${isActive ? 'text-[#004030]' : 'text-[#004030]/50'}`}>✓</span>
                    )}
                  </button>
                );
              })}
            </aside>

            {/* ── Right side: tab bar (mobile) + panel ── */}
            <div className="flex-1 flex flex-col min-w-0 md:overflow-hidden">

              {/* Tab bar — mobile only, with dot indicator for filled tabs */}
              <div className="md:hidden flex overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {activeTabs.map(tab => {
                  const filled = hasTabData(tab.id);
                  return (
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
                      {filled && (
                        <span className="absolute top-2 right-1 w-1.5 h-1.5 rounded-full bg-[#004030]/60" />
                      )}
                      {activeDetailTab === tab.id && (
                        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#004030]" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Panel content */}
              <div
                ref={scrollPanelRef}
                className="scroll-panel overflow-y-auto pb-24 px-4 pt-4 md:flex-1"
                onScroll={() => {
                  const el = scrollPanelRef.current;
                  if (!el) return;
                  el.classList.add('is-scrolling');
                  if (scrollHideTimer.current) clearTimeout(scrollHideTimer.current);
                  scrollHideTimer.current = setTimeout(() => {
                    el.classList.remove('is-scrolling');
                  }, 1000);
                }}
              >
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
                    gross={result?.gross ?? 0}
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
            </div>
          </div>

          {/* Fixed Next/Done */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t">
            <div className="md:max-w-[48vw] mx-auto px-4 pt-3 flex gap-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
              <Button
                variant="outline"
                className="h-12 px-4 rounded-xl text-sm font-semibold border-[#004030]/30 text-[#004030] hover:bg-[#004030]/5 transition-transform duration-100 ease-out active:scale-[0.995]"
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
                className="flex-1 h-12 bg-[#004030] text-[#B6FF00] rounded-xl text-sm font-semibold hover:bg-[#004030]/90 transition-transform duration-100 ease-out active:scale-[0.995]"
                onClick={() => {
                  const i = activeTabs.findIndex(t => t.id === activeDetailTab);
                  if (i < activeTabs.length - 1) {
                    const nextTab = activeTabs[i + 1].id;
                    setActiveDetailTab(nextTab);
                    trackEvent('tab_viewed', { tab: nextTab });
                  } else {
                    setViewMode('summary');
                    window.scrollTo({ top: 0, behavior: 'instant' });
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

function TaxRow({ label, tax, inHand, isHigher, regime, isFreelance, selected, onClick }: {
  label: string; tax: number; inHand: number; isHigher: boolean; regime: 'old' | 'new';
  isFreelance?: boolean; selected?: boolean; onClick?: () => void;
}) {
  const bg = selected
    ? 'bg-[#004030] ring-2 ring-[#004030]'
    : regime === 'new' ? 'bg-[rgba(0,128,0,0.05)] ring-1 ring-foreground/10' : 'bg-card ring-1 ring-foreground/10';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full grid grid-cols-2 gap-2 mb-2 last:mb-0 rounded-xl px-4 py-4 text-left transition-all active:scale-[0.995] ${bg} ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-[#004030]/40' : ''}`}
    >
      <div>
        <p className={`text-xs font-medium mb-1 ${selected ? 'text-white/60' : 'text-[#004030]/50'}`}>{label}</p>
        <p className={`text-[22px] md:text-2xl font-bold ${selected ? 'text-white' : isHigher ? 'text-[#C44A3A]' : 'text-[#004030]'}`}>
          {fmt(tax)}
        </p>
      </div>
      <div className="text-right">
        <p className={`text-xs font-medium mb-1 ${selected ? 'text-white/60' : 'text-[#004030]/50'}`}>
          {isFreelance ? 'Monthly Est.' : 'In-Hand Salary'}
        </p>
        <p className={`text-[22px] md:text-2xl font-bold ${selected ? 'text-white' : 'text-[#004030]'}`}>{fmt(inHand)}</p>
      </div>
      <div className={`col-span-2 border-t mt-1 pt-2 ${selected ? 'border-white/20' : 'border-[#004030]/10'}`}>
        <p className={`text-xs font-semibold ${selected ? 'text-[#B6FF00]' : 'text-[#004030]/40'}`}>
          Calculate tax →
        </p>
      </div>
    </button>
  );
}

