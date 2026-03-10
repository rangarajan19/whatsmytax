import { useState, useCallback, useEffect, useRef } from 'react';
import {
  calcOldRegime, calcNewRegime, fmt, pct,
  effective80C, calcEPFContribution, calcHRAExemption,
  calc80DDeduction, calcNPS80CCD1B, calcHomeLoanInterestDeduction,
  calcEducationLoanDeduction, calcPerquisiteDeduction,
  calcOtherIncome,
  EMPTY_DEDUCTIONS, EMPTY_OTHER_INCOME,
} from './tax';
import type {
  TaxResult, Deductions, Deductions80C, EPFInput, HRAInput,
  Section80DInput, NPS80CCD1BInput, HomeLoanInterestInput,
  EducationLoanInput, PerquisiteAllowances,
  OtherIncome,
} from './tax';
import RegimeCard from './components/RegimeCard';
import DeductionsPanel from './components/DeductionsPanel';
import HRAPanel from './components/HRAPanel';
import Section80DPanel from './components/Section80DPanel';
import NPSPanel from './components/NPSPanel';
import HomeLoanInterestPanel from './components/HomeLoanInterestPanel';
import EducationLoanPanel from './components/EducationLoanPanel';
import PerquisiteAllowancesPanel from './components/PerquisiteAllowancesPanel';
import OtherIncomePanel from './components/OtherIncomePanel';
import { RippleButton } from './components/ui/ripple-button';
import { Card, CardContent } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Separator } from './components/ui/separator';

// Annual basic = 50% of annual gross
function inferAnnualBasic(grossAnnual: number): number {
  return Math.round(grossAnnual * 0.5);
}

export default function App() {
  const [salary, setSalary]                 = useState('');
  const [result, setResult]                 = useState<TaxResult | null>(null);
  const [error, setError]                   = useState('');
  const [deductions, setDeductions]         = useState<Deductions>({ ...EMPTY_DEDUCTIONS });
  const [otherIncome, setOtherIncome]       = useState<OtherIncome>({ ...EMPTY_OTHER_INCOME });
  const [showDeductions, setShowDeductions] = useState(false);
  const [stickyVisible, setStickyVisible]   = useState(false);
  const detailsRef        = useRef<HTMLDivElement>(null);
  const resultsRef        = useRef<HTMLDivElement>(null);
  const lastInferredBasic = useRef<number>(0);
  const prefillTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSalaryVal   = useRef<number>(0);      // always holds the latest parsed salary
  const otherIncomeRef    = useRef<OtherIncome>(EMPTY_OTHER_INCOME); // always current, no stale closure

  // ── Sticky header visibility on scroll ──────────────────────────
  useEffect(() => {
    const onScroll = () => {
      if (!resultsRef.current) return;
      const bottom = resultsRef.current.getBoundingClientRect().bottom;
      setStickyVisible(bottom < 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  // Recalculate tax immediately on every keystroke
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

    // Recalculate with current deductions immediately
    setDeductions(prev => {
      recalculate(val, prev, otherIncomeRef.current);
      return prev;
    });

    // Debounce the basic salary pre-fill.
    // Both latestSalaryVal and otherIncomeRef are refs — always current at fire-time,
    // no stale closure issues regardless of how many digits were typed.
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
  function handleAddDetails() {
    setShowDeductions(true);
    setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

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
  const oldHigher    = result !== null && result.old.total > result.new.total;
  const newHigher    = result !== null && result.new.total > result.old.total;
  const saving       = result ? Math.abs(result.old.total - result.new.total) : 0;
  const betterRegime = oldHigher ? 'New Regime' : newHigher ? 'Old Regime' : null;

  const baseOldTax       = result ? calcOldRegime(result.gross).total : 0;
  const taxSaved         = result ? baseOldTax - result.old.total : 0;
  const has80C           = result ? effective80C(result.deductions.section80C) > 0 : false;
  const hasHRA           = result ? calcHRAExemption(result.deductions.hraInput).exemption > 0 : false;
  const has80D           = result ? calc80DDeduction(result.deductions.section80D).total > 0 : false;
  const hasNPS           = result ? calcNPS80CCD1B(result.deductions.nps80CCD1B) > 0 : false;
  const hasHomeLoan      = result ? calcHomeLoanInterestDeduction(result.deductions.homeLoanInterest) > 0 : false;
  const hasEduLoan       = result ? calcEducationLoanDeduction(result.deductions.educationLoan) > 0 : false;
  const hasPerquisites   = result ? calcPerquisiteDeduction(result.deductions.perquisites) > 0 : false;
  const anyDeduction     = has80C || hasHRA || has80D || hasNPS || hasHomeLoan || hasEduLoan || hasPerquisites;
  const oiResult         = result ? result.otherIncomeResult : calcOtherIncome(EMPTY_OTHER_INCOME);

  return (
    <div className="min-h-screen bg-slate-50 text-[#003F31] font-sans">

      {/* ── Sticky mini-header ─────────────────────────────────────── */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          stickyVisible && result
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-md px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <span className="text-sm font-bold text-[#003F31] hidden sm:block">What's my Tax?</span>
            <div className="flex items-center gap-3 flex-1 sm:flex-none justify-center sm:justify-end">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${oldHigher ? 'bg-red-50 border-red-300' : 'bg-cyan-50 border-cyan-200'}`}>
                <div>
                  <p className="text-xs font-semibold text-gray-400 leading-none mb-0.5">Old Regime</p>
                  <p className={`text-base font-bold tabular-nums transition-all duration-500 ${oldHigher ? 'text-red-600' : 'text-cyan-700'}`}>
                    {result ? fmt(result.old.total) : '—'}
                  </p>
                </div>
                {oldHigher && <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded font-bold">HIGH</span>}
              </div>
              <span className="text-gray-300 font-light text-lg">|</span>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${newHigher ? 'bg-red-50 border-red-300' : 'bg-emerald-50 border-emerald-200'}`}>
                <div>
                  <p className="text-xs font-semibold text-gray-400 leading-none mb-0.5">New Regime</p>
                  <p className={`text-base font-bold tabular-nums ${newHigher ? 'text-red-600' : 'text-emerald-700'}`}>
                    {result ? fmt(result.new.total) : '—'}
                  </p>
                </div>
                {newHigher && <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded font-bold">HIGH</span>}
              </div>
              {result && saving > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-xl text-xs font-semibold">
                  <span>💰</span>
                  <span>Save {fmt(saving)} with {betterRegime}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main header ── */}
      <header className="bg-[#C7FF0C] text-[#003F31] text-center py-5 px-4 shadow-lg">
        <h1 className="text-3xl font-bold tracking-tight">What's my Tax?</h1>
        <p className="text-[#003F31]/60 text-sm mt-1">
          Indian Income Tax Calculator — FY 2024–25 (AY 2025–26)
        </p>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* ── Salary input ── */}
        <Card className="mb-6">
          <CardContent className="p-7">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">
              Gross Annual Salary (CTC)
            </Label>
            <div className="flex flex-wrap gap-3 items-start">
              <div className="flex-1 min-w-52">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-lg pointer-events-none">₹</span>
                  <Input
                    type="number"
                    min={0}
                    placeholder="e.g. 1200000"
                    value={salary}
                    onChange={e => setSalary(e.target.value)}
                    className="pl-9 h-auto py-3.5 text-lg font-semibold rounded-xl placeholder:font-normal placeholder:text-base"
                  />
                </div>
                {error && <p className="text-destructive text-xs mt-1.5">{error}</p>}
                {!error && salary && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {fmt(parseFloat(salary) / 12)}/month · Basic assumed at {fmt(inferAnnualBasic(parseFloat(salary)))}/year (50%)
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Results ── */}
        {!result ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-4">🧾</div>
            <p className="text-base">Enter your salary above to see your tax instantly.</p>
          </div>
        ) : (
          <div ref={resultsRef}>
            {/* Savings callout */}
            {anyDeduction && taxSaved > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-center gap-3 mb-6">
                <div className="text-2xl shrink-0">🎉</div>
                <div>
                  <p className="font-semibold text-emerald-800 text-sm">
                    Your deductions save you {fmt(taxSaved)} in Old Regime tax!
                  </p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    Old Regime tax drops from {fmt(baseOldTax)} → {fmt(result.old.total)}
                  </p>
                </div>
              </div>
            )}

            {/* Summary */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Tax Summary</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <SummaryItem label="Gross Salary" value={fmt(result.gross)} />
                  <SummaryItem
                    label="Old Regime Tax"
                    value={fmt(result.old.total)}
                    valueClass={oldHigher ? 'text-red-600' : 'text-[#003F31]'}
                    sub={`Effective ${pct(result.old.total, result.gross)}`}
                  />
                  <SummaryItem
                    label="New Regime Tax"
                    value={fmt(result.new.total)}
                    valueClass={newHigher ? 'text-red-600' : 'text-[#003F31]'}
                    sub={`Effective ${pct(result.new.total, result.gross)}`}
                  />
                  <SummaryItem
                    label={betterRegime ? `Choose ${betterRegime}` : 'Both equal'}
                    value={fmt(saving)}
                    valueClass="text-emerald-600"
                    sub="you save this much"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Regime cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
              <RegimeCard
                regime="old"
                label="Pre-2020 slabs with deductions"
                result={result.old}
                isHigher={oldHigher}
                gross={result.gross}
                epf={deductions.section80C.epf}
              />
              <RegimeCard
                regime="new"
                label="Simplified slabs, higher std. deduction (₹75K)"
                result={result.new}
                isHigher={newHigher}
                gross={result.gross}
                epf={deductions.section80C.epf}
              />
            </div>

            {/* Add more details CTA */}
            {!showDeductions && (
              <div className="flex flex-col items-center gap-2 py-6 mb-4">
                <p className="text-sm text-gray-400">
                  Have EPF, HRA, investments, insurance or perquisite allowances? Fine-tune your tax.
                </p>
                <RippleButton
                  onClick={handleAddDetails}
                  className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-indigo-300 text-indigo-600
                             font-semibold rounded-xl hover:bg-indigo-50 hover:border-indigo-400
                             active:scale-95 transition-all shadow-sm"
                  rippleColor="rgba(99, 102, 241, 0.25)"
                  duration={600}
                >
                  <span className="text-lg">＋</span>
                  Add more details
                </RippleButton>
              </div>
            )}

            {/* Disclaimer */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-xs text-amber-800 leading-relaxed">
              <strong>Note:</strong> Deductions applied: Standard deduction (Old: ₹50K | New: ₹75K),
              Sec. 80C investments, HRA exemption, 80D health insurance, NPS 80CCD(1B), Home Loan Interest (Sec. 24b),
              Education Loan Interest (Sec. 80E), and employer-provided perquisites (telephone/internet, petrol, driver — Rule 3, both regimes).
              Other items like LTA, gratuity, professional tax etc. are not included.
              Consult a CA for precise tax planning.
            </div>
          </div>
        )}

        {/* ── Deduction Sections ── */}
        {showDeductions && (
          <div ref={detailsRef} className="mt-8 space-y-2">

            <SectionDivider label="Both Regimes" />

            {/* Perquisite Allowances — applies to both regimes */}
            <SectionHeader
              step="★"
              icon="🏢"
              title="Perquisite Allowances"
              subtitle="Employer-provided telephone, petrol & driver — Rule 3, applies to both Old and New Regime"
            />
            <PerquisiteAllowancesPanel
              values={deductions.perquisites}
              onChange={handlePerquisitesChange}
            />


            {/* Other income — applies to both regimes */}
            <SectionHeader
              step="+"
              icon="💹"
              title="Other Income Sources"
              subtitle="Dividends, interest, rent, capital gains — applies to both Old and New Regime"
            />
            <OtherIncomePanel
              value={otherIncome}
              result={oiResult}
              onChange={handleOtherIncomeChange}
            />

            <SectionDivider label="Old Regime Deductions" />

            {/* Section 80C */}
            <SectionHeader
              step={1}
              icon="💰"
              title="Section 80C — Investments & EPF"
              subtitle="Max ₹1,50,000 combined across all instruments"
            />
            <DeductionsPanel
              epfInput={deductions.epfInput}
              onEPFChange={handleEPFChange}
              values={deductions.section80C}
              onChange={handle80CChange}
            />

            {/* HRA */}
            <SectionHeader
              step={2}
              icon="🏠"
              title="HRA — House Rent Allowance"
              subtitle="Only if you live in rented accommodation"
            />
            <HRAPanel
              hraInput={deductions.hraInput}
              onChange={handleHRAChange}
            />

            {/* Section 80D */}
            <SectionHeader
              step={3}
              icon="🏥"
              title="Section 80D — Health Insurance"
              subtitle="Up to ₹25,000 (self) + ₹25,000 (parents) · ₹50,000 each if senior citizen"
            />
            <Section80DPanel
              value={deductions.section80D}
              onChange={handle80DChange}
            />

            {/* NPS 80CCD(1B) */}
            <SectionHeader
              step={4}
              icon="🏛️"
              title="Section 80CCD(1B) — NPS Additional"
              subtitle="Extra ₹50,000 deduction for NPS, over and above the 80C limit"
            />
            <NPSPanel
              value={deductions.nps80CCD1B}
              onChange={handleNPSChange}
            />

            {/* Home Loan Interest */}
            <SectionHeader
              step={5}
              icon="🏡"
              title="Section 24b — Home Loan Interest"
              subtitle="Up to ₹2,00,000 for self-occupied property · No cap for let-out"
            />
            <HomeLoanInterestPanel
              value={deductions.homeLoanInterest}
              onChange={handleHomeLoanChange}
            />

            {/* Education Loan */}
            <SectionHeader
              step={6}
              icon="🎓"
              title="Section 80E — Education Loan Interest"
              subtitle="Full interest deductible, no cap · Old Regime only"
            />
            <EducationLoanPanel
              values={deductions.educationLoan}
              onChange={handleEducationLoanChange}
            />

          </div>
        )}

      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-2 mt-2">
      <Separator className="flex-1" />
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
        {label}
      </span>
      <Separator className="flex-1" />
    </div>
  );
}

function SectionHeader({
  step, icon, title, subtitle,
}: {
  step: number | string; icon: string; title: string; subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-3 mt-6">
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold shrink-0 mt-0.5">
        {step}
      </div>
      <div>
        <p className="text-sm font-semibold text-[#003F31] flex items-center gap-1.5">
          <span>{icon}</span>
          <span>{title}</span>
        </p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function SummaryItem({
  label, value, valueClass = 'text-[#003F31]', sub,
}: {
  label: string; value: string; valueClass?: string; sub?: string;
}) {
  return (
    <Card className="rounded-xl">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className={`text-lg font-bold ${valueClass}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}
