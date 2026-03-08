import { useState, useCallback, useEffect, useRef } from 'react';
import {
  calcOldRegime, calcNewRegime, fmt,
  calcEPFContribution,
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

function funFact(annual: number): string {
  if (annual <= 0)           return 'Fun Fact — Only 2% of Indians pay income tax.';
  if (annual <= 500_000)     return 'Fun Fact — You pay zero tax! Income up to ₹5L is fully exempt under the 87A rebate.';
  if (annual <= 700_000)     return 'Fun Fact — Under New Regime, incomes up to ₹7L attract zero tax thanks to the 87A rebate.';
  if (annual <= 1_000_000)   return 'Fun Fact — A ₹75,000 standard deduction is automatically applied under the New Regime.';
  if (annual <= 1_500_000)   return 'Fun Fact — Your EPF contribution counts towards 80C and can cut Old Regime tax significantly.';
  if (annual <= 2_000_000)   return 'Fun Fact — Maxing out 80C (₹1.5L) + NPS 80CCD(1B) (₹50K) can save up to ₹62,400 in Old Regime.';
  if (annual <= 5_000_000)   return 'Fun Fact — You earn more than 80% of India. Your taxes fund roads, schools & hospitals.';
  if (annual <= 10_000_000)  return 'Fun Fact — You\'re in the top 5% of earners. Only 2% of Indians file income tax returns.';
  if (annual <= 50_000_000)  return 'Fun Fact — Incomes above ₹50L attract a 10% surcharge on top of your slab tax.';
  return 'Fun Fact — Above ₹5 Cr, the New Regime caps surcharge at 25% while Old Regime charges 37%.';
}

export default function App() {
  const [step, setStep]                     = useState<Step>('input');
  const [salary, setSalary]                 = useState('');
  const [result, setResult]                 = useState<TaxResult | null>(null);
  const [error, setError]                   = useState('');
  const [deductions, setDeductions]         = useState<Deductions>({ ...EMPTY_DEDUCTIONS });
  const [otherIncome, setOtherIncome]       = useState<OtherIncome>({ ...EMPTY_OTHER_INCOME });
  const [drawerOpen, setDrawerOpen]         = useState(false);

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
    }
  }

  // ── Derived values ────────────────────────────────────────────────
  const salaryNum    = parseFloat(salary.replace(/,/g, '')) || 0;
  const percentile   = salaryNum > 0 ? incomePercentile(salaryNum) : null;
  const oldHigher = result !== null && result.old.total > result.new.total;
  const saving    = result ? Math.abs(result.old.total - result.new.total) : 0;

  // ── Input screen ─────────────────────────────────────────────────
  if (step === 'input') {
    return (
      <div className="min-h-screen flex flex-col relative" style={{ backgroundColor: '#c7ff0c', fontFamily: 'Inter, sans-serif' }}>

        {/* Main content — left-aligned at 64px, vertically centered */}
        <div className="flex-1 flex flex-col justify-center pl-16 pr-8">
          <div className="w-full max-w-[581px]">

            <h1 className="text-[28px] font-bold text-[#003f31] mb-4 whitespace-nowrap">
              What's your annual salary?
            </h1>

            {/* Input — asymmetric border per Figma: 3px top/left, 8px bottom/right */}
            <div className="flex items-center bg-[#c7ff0c]
                            border-t-[3px] border-l-[3px] border-b-[8px] border-r-[8px]
                            border-[#003f31]">
              <span className="pl-2 pr-1 text-[24px] font-medium text-[#003f31]/50 shrink-0 select-none">₹</span>
              <input
                type="number"
                min={0}
                autoFocus
                placeholder="e.g. 12,00,000"
                value={salary}
                onChange={e => setSalary(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent border-none outline-none py-3 pr-3
                           text-[24px] font-medium text-[#003f31] placeholder:text-[#003f31]/50
                           focus:ring-0
                           [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

            {/* Percentile hint */}
            {percentile && !error && (
              <p className="text-[20px] font-medium text-[#003f31]/50 mt-3">
                You are in {percentile} of income group
              </p>
            )}

            {/* Fun fact — dynamic based on salary */}
            {!error && (
              <p className="text-[20px] font-medium text-[#003f31]/50 mt-6">
                {funFact(salaryNum)}
              </p>
            )}

          </div>
        </div>

        {/* Press Enter — centered at bottom */}
        <button
          disabled={!result || !!error}
          onClick={() => { if (result && !error) { setStep('results'); } }}
          className="pb-16 text-center w-full text-[20px] font-bold text-[#003f31]/50
                     disabled:opacity-30 hover:text-[#003f31]/70 transition-colors"
        >
          ↩ Press Enter to calculate
        </button>

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

      {/* Main content — left-aligned at 64px */}
      <div className="pl-16 pr-16 pt-10 pb-16">

        {/* Header: Annual Salary (left) | Old Regime + New Regime amounts (right) */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[14px] font-medium text-[#003f31]/60 uppercase tracking-widest">Annual Salary</span>
              <button
                onClick={() => setStep('input')}
                className="text-[14px] text-[#003f31]/50 hover:text-[#003f31] transition-colors"
              >
                ↗
              </button>
            </div>
            <p className="text-[42px] font-bold text-[#003f31] leading-none">{fmt(result!.gross)}</p>
          </div>

          <div className="flex items-start gap-12">
            <div>
              <p className="text-[14px] font-medium text-[#003f31]/60 mb-2">Old Regime</p>
              <p className="text-[42px] font-bold text-[#003f31] leading-none">{fmt(result!.old.total)}</p>
            </div>
            <div>
              <p className="text-[14px] font-medium text-[#003f31]/60 mb-2">New Regime</p>
              <p className="text-[42px] font-bold text-[#003f31] leading-none">{fmt(result!.new.total)}</p>
            </div>
          </div>
        </div>

        {/* Separator line — full bleed */}
        <div className="border-b-[3px] border-[#003f31] mt-10 -mx-16" />

        {/* Cards area — mt-36 matches Figma's ~170px breathing room below separator */}
        <div className="grid grid-cols-2 gap-8 mt-36">

          {/* New Regime — savings tag overflows upward inside card */}
          <div className="max-w-[450px]">
            <RegimeCardV2
              regime="new"
              result={result!.new}
              gross={result!.gross}
              epf={deductions.section80C.epf}
              saving={oldHigher ? saving : undefined}
            />
          </div>

          {/* Old Regime — Add Investment Details above */}
          <div className="max-w-[450px]">
            <div className="flex justify-end mb-5">
              <button
                onClick={() => setDrawerOpen(true)}
                className="text-[14px] font-semibold text-[#003f31]/70 hover:text-[#003f31] transition-colors flex items-center gap-1"
              >
                + Add Investment Details
              </button>
            </div>
            <RegimeCardV2
              regime="old"
              result={result!.old}
              gross={result!.gross}
              epf={deductions.section80C.epf}
            />
          </div>

        </div>

        {/* Footnote */}
        <p className="mt-6 text-[12px] text-[#003f31]/50 italic text-right max-w-[950px]">
          *Maxing out on all sections will still make you pay extra in old regime
        </p>

      </div>
    </div>
  );
}
