import { useState, useCallback, useEffect, useRef } from 'react';
import {
  calcOldRegime, calcNewRegime, fmt,
  calcEPFContribution, calcOtherIncome,
  EMPTY_DEDUCTIONS, EMPTY_OTHER_INCOME,
} from './tax';
import type {
  TaxResult, Deductions, Deductions80C, EPFInput, HRAInput,
  Section80DInput, NPS80CCD1BInput, HomeLoanInterestInput,
  EducationLoanInput, PerquisiteAllowances, OtherIncome,
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
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { ToggleGroup, ToggleGroupItem } from './components/ui/toggle-group';

const DETAIL_TABS = [
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

function inferAnnualBasic(grossAnnual: number): number {
  return Math.round(grossAnnual * 0.40);
}

const STORAGE_KEY = 'whatsmytax_v1';

function loadStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { salary: string; deductions: Deductions; otherIncome: OtherIncome };
  } catch { return null; }
}

export default function App() {
  const saved = loadStorage();
  const [salary, setSalary]           = useState(saved?.salary ?? '');
  const [result, setResult]           = useState<TaxResult | null>(null);
  const [error, setError]             = useState('');
  const [deductions, setDeductions]   = useState<Deductions>(saved?.deductions ?? { ...EMPTY_DEDUCTIONS });
  const [otherIncome, setOtherIncome] = useState<OtherIncome>(saved?.otherIncome ?? { ...EMPTY_OTHER_INCOME });
  const [viewMode, setViewMode]       = useState<'main' | 'detail'>('main');
  const [activeDetailTab, setActiveDetailTab] = useState<string>('other-income');
  const [activeTaxTab, setActiveTaxTab]       = useState<'old' | 'new'>('new');

  const lastInferredBasic = useRef<number>(0);
  const prefillTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSalaryVal   = useRef<number>(0);
  const otherIncomeRef    = useRef<OtherIncome>(saved?.otherIncome ?? EMPTY_OTHER_INCOME);

  // ── Persist state to localStorage ────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ salary, deductions, otherIncome }));
    } catch { /* storage full — ignore */ }
  }, [salary, deductions, otherIncome]);

  // ── Live recalculation ───────────────────────────────────────────
  const recalculate = useCallback((gross: number, ded: Deductions, oi: OtherIncome) => {
    const oiResult = calcOtherIncome(oi);
    setResult({
      gross,
      deductions: ded,
      otherIncome: oi,
      otherIncomeResult: oiResult,
      old: calcOldRegime(gross, ded, oi),
      new: calcNewRegime(gross, oi, ded.perquisites),
    });
  }, []);

  useEffect(() => {
    const raw = salary.replace(/,/g, '').trim();
    const val = parseFloat(raw);
    if (!raw || isNaN(val) || val <= 0) {
      setError(raw && val <= 0 ? 'Please enter a positive salary.' : '');
      setResult(null);
      latestSalaryVal.current = 0;
      if (prefillTimer.current) clearTimeout(prefillTimer.current);
      return;
    }
    setError('');
    latestSalaryVal.current = val;
    setDeductions(prev => {
      recalculate(val, prev, otherIncomeRef.current);
      return prev;
    });
    if (prefillTimer.current) clearTimeout(prefillTimer.current);
    prefillTimer.current = setTimeout(() => {
      const finalVal = latestSalaryVal.current;
      if (finalVal <= 0) return;
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
        recalculate(finalVal, updated, otherIncomeRef.current);
        return updated;
      });
    }, 600);
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
    if (result) recalculate(result.gross, updated, otherIncomeRef.current);
  }

  function handle80CChange(key: keyof Deductions80C, value: number) {
    const updated: Deductions = {
      ...deductions,
      section80C: { ...deductions.section80C, [key]: value },
    };
    setDeductions(updated);
    if (result) recalculate(result.gross, updated, otherIncomeRef.current);
  }

  function handleHRAChange(hraInput: HRAInput) {
    const updated: Deductions = { ...deductions, hraInput };
    setDeductions(updated);
    if (result) recalculate(result.gross, updated, otherIncomeRef.current);
  }

  function handle80DChange(section80D: Section80DInput) {
    const updated: Deductions = { ...deductions, section80D };
    setDeductions(updated);
    if (result) recalculate(result.gross, updated, otherIncomeRef.current);
  }

  function handleNPSChange(nps80CCD1B: NPS80CCD1BInput) {
    const updated: Deductions = { ...deductions, nps80CCD1B };
    setDeductions(updated);
    if (result) recalculate(result.gross, updated, otherIncomeRef.current);
  }

  function handleHomeLoanChange(homeLoanInterest: HomeLoanInterestInput) {
    const updated: Deductions = { ...deductions, homeLoanInterest };
    setDeductions(updated);
    if (result) recalculate(result.gross, updated, otherIncomeRef.current);
  }

  function handleEducationLoanChange(educationLoan: EducationLoanInput) {
    const updated: Deductions = { ...deductions, educationLoan };
    setDeductions(updated);
    if (result) recalculate(result.gross, updated, otherIncomeRef.current);
  }

  function handlePerquisitesChange(perquisites: PerquisiteAllowances) {
    const updated: Deductions = { ...deductions, perquisites };
    setDeductions(updated);
    if (result) recalculate(result.gross, updated, otherIncomeRef.current);
  }

  function handleOtherIncomeChange(oi: OtherIncome) {
    otherIncomeRef.current = oi;
    setOtherIncome(oi);
    if (result) recalculate(result.gross, deductions, oi);
  }

  // ── Derived values ────────────────────────────────────────────────
  const epf         = deductions.section80C.epf;
  const oldHigher   = result !== null && result.old.total > result.new.total;
  const newHigher   = result !== null && result.new.total > result.old.total;
  const newInHand   = result ? Math.round(Math.max(0, result.gross - result.new.total - epf) / 12) : 0;
  const oldInHand   = result ? Math.round(Math.max(0, result.gross - result.old.total - epf) / 12) : 0;
  const oiResult    = result ? result.otherIncomeResult : calcOtherIncome(EMPTY_OTHER_INCOME);

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
        ) : (
          <div>
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
            <TaxRow label="New Regime" tax={result.new.total} inHand={newInHand} isHigher={newHigher} regime="new" />
            <TaxRow label="Old Regime" tax={result.old.total} inHand={oldInHand} isHigher={oldHigher} regime="old" />
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
                />
              )}
            </div>
          </div>

          {/* Fixed CTA */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t">
            <div className="md:max-w-[35vw] mx-auto px-4 py-3">
              <Button
                className="w-full h-12 bg-[#004030] text-[#B6FF00] rounded-xl text-sm font-semibold hover:bg-[#004030]/90 active:scale-[0.98]"
                onClick={() => {
                  setActiveDetailTab('perquisites');
                  setViewMode('detail');
                }}
              >
                Next →
              </Button>
            </div>
          </div>
        </>
      )}

      {/* ── Detail view ── */}
      {viewMode === 'detail' && (
        <>
          {/* Progress indicator */}
          {(() => {
            const i = DETAIL_TABS.findIndex(t => t.id === activeDetailTab);
            return (
              <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                <div className="flex-1 h-1 bg-[#004030]/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#004030] rounded-full transition-all duration-300"
                    style={{ width: `${((i + 1) / DETAIL_TABS.length) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] font-semibold text-[#004030]/50 shrink-0">
                  {i + 1} / {DETAIL_TABS.length}
                </span>
              </div>
            );
          })()}

          {/* Horizontal tab bar — underline style matching Figma */}
          <div className="flex overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {DETAIL_TABS.map(tab => (
              <button
                key={tab.id}
                className={`relative shrink-0 px-3 py-3 text-sm transition-colors whitespace-nowrap ${
                  activeDetailTab === tab.id
                    ? 'font-semibold text-[#004030]'
                    : 'font-medium text-[#004030]/50'
                }`}
                onClick={() => setActiveDetailTab(tab.id)}
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
                  const i = DETAIL_TABS.findIndex(t => t.id === activeDetailTab);
                  if (i > 0) {
                    setActiveDetailTab(DETAIL_TABS[i - 1].id);
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
                  const i = DETAIL_TABS.findIndex(t => t.id === activeDetailTab);
                  if (i < DETAIL_TABS.length - 1) {
                    setActiveDetailTab(DETAIL_TABS[i + 1].id);
                  } else {
                    setActiveTaxTab('old');
                    setViewMode('main');
                  }
                }}
              >
                {activeDetailTab === DETAIL_TABS.at(-1)?.id ? 'Done' : 'Next →'}
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

function TaxRow({ label, tax, inHand, isHigher, regime }: {
  label: string; tax: number; inHand: number; isHigher: boolean; regime: 'old' | 'new';
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
        <p className="text-xs text-[#004030]/50 font-medium mb-1">In-Hand Salary</p>
        <p className="text-xl font-bold text-[#004030]">{fmt(inHand)}</p>
      </div>
    </div>
  );
}

