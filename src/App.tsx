import { useState, useCallback, useEffect, useRef } from 'react';
import {
  calcOldRegime, calcNewRegime, fmt,
  effective80C, calcEPFContribution, calcHRAExemption,
  calc80DDeduction, calcNPS80CCD1B, calcHomeLoanInterestDeduction,
  calcOtherIncome,
  EMPTY_DEDUCTIONS, EMPTY_OTHER_INCOME,
} from './tax';
import type {
  TaxResult, Deductions, Deductions80C, EPFInput, HRAInput,
  Section80DInput, NPS80CCD1BInput, HomeLoanInterestInput,
  OtherIncome,
} from './tax';
import RegimeCardV2 from './components/RegimeCardV2';
import DeductionsDrawer from './components/DeductionsDrawer';

type Step = 'input' | 'results';

// Annual basic = 50% of annual gross
function inferAnnualBasic(grossAnnual: number): number {
  return Math.round(grossAnnual * 0.5);
}

function incomePercentile(annual: number): string | null {
  if (annual >= 50_000_000) return 'top 1%';
  if (annual >= 20_000_000) return 'top 3%';
  if (annual >= 10_000_000) return 'top 5%';
  if (annual >= 7_500_000)  return 'top 10%';
  if (annual >= 5_000_000)  return 'top 20%';
  if (annual >= 3_000_000)  return 'top 30%';
  return null;
}

export default function App() {
  const [step, setStep]                     = useState<Step>('input');
  const [salary, setSalary]                 = useState('');
  const [result, setResult]                 = useState<TaxResult | null>(null);
  const [error, setError]                   = useState('');
  const [deductions, setDeductions]         = useState<Deductions>({ ...EMPTY_DEDUCTIONS });
  const [otherIncome, setOtherIncome]       = useState<OtherIncome>({ ...EMPTY_OTHER_INCOME });
  const [drawerOpen, setDrawerOpen]         = useState(false);
  const [showBreakdown, setShowBreakdown]   = useState(false);

  const lastInferredBasic = useRef<number>(0);
  const prefillTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSalaryVal   = useRef<number>(0);
  const otherIncomeRef    = useRef<OtherIncome>(EMPTY_OTHER_INCOME);

  // ── Live recalculation ────────────────────────────────────────────
  const recalculate = useCallback((gross: number, ded: Deductions, oi: OtherIncome) => {
    const oiResult = calcOtherIncome(oi);
    setResult({
      gross,
      deductions: ded,
      otherIncome: oi,
      otherIncomeResult: oiResult,
      old: calcOldRegime(gross, ded, oi),
      new: calcNewRegime(gross, oi),
    });
  }, []);

  // Recalculate on salary change
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

  function handleOtherIncomeChange(oi: OtherIncome) {
    otherIncomeRef.current = oi;
    setOtherIncome(oi);
    if (result) recalculate(result.gross, deductions, oi);
  }

  // ── Enter key to proceed ─────────────────────────────────────────
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && result && !error) {
      setStep('results');
      setShowBreakdown(false);
    }
  }

  // ── Derived values ────────────────────────────────────────────────
  const salaryNum    = parseFloat(salary.replace(/,/g, '')) || 0;
  const percentile   = salaryNum > 0 ? incomePercentile(salaryNum) : null;
  const oldHigher    = result !== null && result.old.total > result.new.total;
  const newHigher    = result !== null && result.new.total > result.old.total;
  const saving       = result ? Math.abs(result.old.total - result.new.total) : 0;
  const betterRegime = oldHigher ? 'New Regime' : newHigher ? 'Old Regime' : null;

  const has80C       = result ? effective80C(result.deductions.section80C) > 0 : false;
  const hasHRA       = result ? calcHRAExemption(result.deductions.hraInput).exemption > 0 : false;
  const has80D       = result ? calc80DDeduction(result.deductions.section80D).total > 0 : false;
  const hasNPS       = result ? calcNPS80CCD1B(result.deductions.nps80CCD1B) > 0 : false;
  const hasHomeLoan  = result ? calcHomeLoanInterestDeduction(result.deductions.homeLoanInterest) > 0 : false;
  const anyDeduction = has80C || hasHRA || has80D || hasNPS || hasHomeLoan;

  // ── Input screen ─────────────────────────────────────────────────
  if (step === 'input') {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#c7ff0c', fontFamily: 'Inter, sans-serif' }}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4">
          <span className="text-sm font-bold text-[#003f31]/60">WhatsMyTax</span>
          <span className="text-xs text-[#003f31]/40">FY 2025–26</span>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col justify-center px-6 max-w-lg mx-auto w-full pb-20">
          <h1 className="text-4xl sm:text-5xl font-black text-[#003f31] leading-tight mb-2">
            What's your<br />annual salary?
          </h1>
          <p className="text-sm text-[#003f31]/50 mb-8">
            Calculate your income tax and take home for FY 2025–26
          </p>

          {/* Input — matches Figma: lime bg, 3px border, no radius */}
          <div className="flex items-center border-[3px] border-[#003f31] bg-[#c7ff0c] mb-3">
            <span className="pl-3 pr-1 text-2xl font-medium text-[#003f31]/50 shrink-0 select-none">₹</span>
            <input
              type="number"
              min={0}
              autoFocus
              placeholder="e.g. 12,00,000"
              value={salary}
              onChange={e => setSalary(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent border-none outline-none py-3.5 pr-3
                         text-2xl font-medium text-[#003f31] placeholder:text-[#003f31]/50
                         focus:ring-0
                         [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

          {/* Percentile hint */}
          {percentile && !error && (
            <p className="text-sm text-[#003f31]/60 mb-4">
              You are in the <strong className="text-[#003f31]">{percentile}</strong> of income earners in India
            </p>
          )}

          {/* Calculate button */}
          <button
            disabled={!result || !!error}
            onClick={() => { if (result && !error) { setStep('results'); setShowBreakdown(false); } }}
            className="mt-2 w-full py-4 rounded-xl font-bold text-base
                       bg-[#003f31] text-[#c7ff0c] disabled:opacity-40
                       hover:bg-[#003f31]/90 active:scale-[0.98] transition-all"
          >
            Calculate →
          </button>

          {result && !error && (
            <p className="text-center text-xs text-[#003f31]/40 mt-3">⏎ Press Enter to continue</p>
          )}
        </div>
      </div>
    );
  }

  // ── Results screen ────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#c7ff0c', fontFamily: 'Inter, sans-serif' }}>

      {/* Deductions drawer */}
      <DeductionsDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        deductions={deductions}
        otherIncome={otherIncome}
        onEPFChange={handleEPFChange}
        on80CChange={handle80CChange}
        onHRAChange={handleHRAChange}
        on80DChange={handle80DChange}
        onNPSChange={handleNPSChange}
        onHomeLoanChange={handleHomeLoanChange}
        onOtherIncomeChange={handleOtherIncomeChange}
      />

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-[#003f31]/60">WhatsMyTax</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Salary display with edit */}
          <button
            onClick={() => setStep('input')}
            className="flex items-center gap-2 text-sm font-semibold text-[#003f31]
                       bg-[#003f31]/10 hover:bg-[#003f31]/20 px-3 py-1.5 rounded-lg transition-colors"
          >
            <span>{fmt(result!.gross)}/yr</span>
            <span className="text-xs">✏️</span>
          </button>
        </div>
      </div>

      {/* Summary bar */}
      {result && (
        <div className="px-6 pb-4 max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center gap-4 text-[#003f31]">
            <div>
              <p className="text-xs text-[#003f31]/50 font-medium">Annual Salary</p>
              <p className="text-lg font-black">{fmt(result.gross)}</p>
            </div>
            <div className="h-8 w-px bg-[#003f31]/20 hidden sm:block" />
            <div>
              <p className="text-xs text-[#003f31]/50 font-medium">New Regime</p>
              <p className={`text-lg font-black ${newHigher ? 'text-red-700' : ''}`}>{fmt(result.new.total)}</p>
            </div>
            <div className="h-8 w-px bg-[#003f31]/20 hidden sm:block" />
            <div>
              <p className="text-xs text-[#003f31]/50 font-medium">Old Regime</p>
              <p className={`text-lg font-black ${oldHigher ? 'text-red-700' : ''}`}>{fmt(result.old.total)}</p>
            </div>
            {saving > 0 && betterRegime && (
              <>
                <div className="h-8 w-px bg-[#003f31]/20 hidden sm:block" />
                <div>
                  <p className="text-xs text-[#003f31]/50 font-medium">Savings</p>
                  <p className="text-lg font-black text-[#003f31]">{fmt(saving)}</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Cards area */}
      {result && (
        <div className="px-4 pb-8 max-w-4xl mx-auto">

          {/* Action buttons */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <button
              onClick={() => setShowBreakdown(b => !b)}
              className="text-sm font-semibold text-[#003f31] underline underline-offset-2
                         hover:text-[#003f31]/70 transition-colors"
            >
              {showBreakdown ? '▲ Hide' : '▼ How is my tax calculated?'}
            </button>
            <button
              onClick={() => setDrawerOpen(true)}
              className="text-sm font-bold text-[#003f31] bg-[#003f31]/10 hover:bg-[#003f31]/20
                         px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <span>＋</span>
              <span>Add Investment Details</span>
            </button>
          </div>

          {/* Savings banner */}
          {saving > 0 && betterRegime && (
            <div className="bg-[#003f31] text-[#c7ff0c] rounded-xl px-5 py-3 flex items-center gap-3 mb-4">
              <span className="text-lg">🎉</span>
              <p className="text-sm font-bold">
                You can save {fmt(saving)} by choosing {betterRegime}
                {anyDeduction && ' with your deductions!'}
              </p>
            </div>
          )}

          {/* Regime cards: New on left, Old on right (per Figma) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <RegimeCardV2
              regime="new"
              result={result.new}
              isHigher={newHigher}
              gross={result.gross}
              epf={deductions.section80C.epf}
              showBreakdown={showBreakdown}
            />
            <RegimeCardV2
              regime="old"
              result={result.old}
              isHigher={oldHigher}
              gross={result.gross}
              epf={deductions.section80C.epf}
              showBreakdown={showBreakdown}
            />
          </div>

          {/* Disclaimer */}
          <div className="mt-6 bg-[#003f31]/10 rounded-xl px-5 py-4 text-xs text-[#003f31]/60 leading-relaxed">
            <strong className="text-[#003f31]/80">Note:</strong> Includes standard deduction, 80C, HRA, 80D, NPS 80CCD(1B), and Home Loan Interest.
            Consult a CA for precise tax planning.
          </div>
        </div>
      )}
    </div>
  );
}
