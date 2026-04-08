import { useEffect } from 'react';
import type { FreelanceIncome, FreelanceResult, FreelanceScheme } from '../tax';
import { fmt } from '../tax';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';

interface Props {
  value: FreelanceIncome;
  result: FreelanceResult;
  onChange: (updated: FreelanceIncome) => void;
  isFreelanceOnly?: boolean;
}

const SCHEMES: { id: FreelanceScheme; label: string; sub: string }[] = [
  { id: 'none',   label: 'Not applicable', sub: 'No freelance / self-employment income' },
  { id: '44ADA',  label: 'Section 44ADA',  sub: 'Professional services (doctor, lawyer, engineer, consultant…)' },
  { id: '44AD',   label: 'Section 44AD',   sub: 'Small business / trader' },
  { id: 'manual', label: 'I know my profit', sub: 'Maintaining books — enter actual net profit' },
];

export default function FreelancePanel({ value, result, onChange, isFreelanceOnly = false }: Props) {
  function update(patch: Partial<FreelanceIncome>) {
    onChange({ ...value, ...patch });
  }

  // For pure freelancers, auto-select 44ADA if still on 'none' — must be in useEffect, not render body
  useEffect(() => {
    if (isFreelanceOnly && value.scheme === 'none') {
      onChange({ ...value, scheme: '44ADA' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFreelanceOnly]);

  const visibleSchemes = isFreelanceOnly
    ? SCHEMES.filter(s => s.id !== 'none')
    : SCHEMES;

  return (
    <Card className="mb-7">
      <CardContent className="p-4 sm:p-7">
        <Badge className="bg-[#004030]/8 text-[#004030] border-[#004030]/15 font-medium mb-2">
          Both Regimes
        </Badge>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">💼</span>
          <h2 className="text-base font-semibold text-[#003F31]">Freelance / Self-employed</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-1">
          Income from professional services or business. Taxed at slab rate — added on top of your salary.
        </p>
        <p className="text-xs text-[#004030]/60 bg-[#004030]/5 border border-[#004030]/15 rounded-lg px-3 py-2 mb-5">
          Standard deduction (₹75K / ₹50K) only applies to salary income — not applicable here. Chapter VI-A deductions (80C, 80D, NPS) still apply against your total income.
        </p>

        {/* Scheme selector */}
        <div className="space-y-2 mb-5">
          <p className="text-xs font-semibold text-[#004030]/60 uppercase tracking-wider">Select your situation</p>
          {visibleSchemes.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => update({ scheme: s.id })}
              className={`w-full text-left rounded-xl border px-4 py-3 transition-all ${
                value.scheme === s.id
                  ? 'border-[#004030] bg-[#004030]/5 ring-1 ring-[#004030]/20'
                  : 'border-border bg-muted/20 hover:border-[#004030]/30'
              }`}
            >
              <p className={`text-sm font-semibold ${value.scheme === s.id ? 'text-[#004030]' : 'text-foreground'}`}>
                {s.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
            </button>
          ))}
        </div>

        {/* Inputs */}
        {value.scheme === '44ADA' && (
          <Section44ADA value={value} result={result} onChange={update} />
        )}
        {value.scheme === '44AD' && (
          <Section44AD value={value} result={result} onChange={update} />
        )}
        {value.scheme === 'manual' && (
          <SectionManual value={value} result={result} onChange={update} />
        )}
      </CardContent>
    </Card>
  );
}

// ─── 44ADA ──────────────────────────────────────────────────────────────────

function Section44ADA({ value, result, onChange }: {
  value: FreelanceIncome; result: FreelanceResult;
  onChange: (p: Partial<FreelanceIncome>) => void;
}) {
  const LIMIT_44ADA = 7_500_000;
  return (
    <div className="space-y-4">
      <div className="bg-[#004030]/5 border border-[#004030]/15 rounded-xl p-4 text-xs text-[#004030] space-y-1.5">
        <p className="font-semibold">How 44ADA works</p>
        <p>If your gross professional receipts are ≤ ₹75L, you can declare <strong>50% as your income</strong> — no books to maintain, no expense proofs needed.</p>
        <p>You can still claim <strong>80C, 80D, NPS</strong> etc. deductions on top of this. Chapter VI-A deductions apply normally.</p>
      </div>

      <div>
        <label className="text-xs font-semibold text-[#004030]/70 mb-1 block">
          Gross Professional Receipts (Annual)
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm pointer-events-none">₹</span>
          <Input
            type="number"
            min={0}
            placeholder="0"
            value={value.grossReceipts === 0 ? '' : value.grossReceipts}
            onChange={e => onChange({ grossReceipts: parseFloat(e.target.value) || 0 })}
            className="pl-7 h-auto py-2.5 text-sm font-medium focus-visible:ring-[#004030]/40"
          />
        </div>
      </div>

      {value.grossReceipts > 0 && (
        <>
          {result.limitExceeded && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
              ⚠️ Gross receipts exceed ₹75L — 44ADA is not available. You must maintain accounts. Consider switching to "I know my profit."
            </div>
          )}
          <ResultCard
            label="Presumptive Income (50%)"
            value={result.taxableIncome}
            note="Added to your total income at slab rate"
            breakdown={`${fmt(value.grossReceipts)} × 50% = ${fmt(result.taxableIncome)}`}
            limitWarning={value.grossReceipts > LIMIT_44ADA ? `Exceeds ₹75L limit` : undefined}
          />
        </>
      )}
    </div>
  );
}

// ─── 44AD ───────────────────────────────────────────────────────────────────

function Section44AD({ value, result, onChange }: {
  value: FreelanceIncome; result: FreelanceResult;
  onChange: (p: Partial<FreelanceIncome>) => void;
}) {
  const digitalAmt  = Math.round(value.grossReceipts * (value.digitalPct / 100));
  const cashAmt     = value.grossReceipts - digitalAmt;

  return (
    <div className="space-y-4">
      <div className="bg-[#004030]/5 border border-[#004030]/15 rounded-xl p-4 text-xs text-[#004030] space-y-1.5">
        <p className="font-semibold">How 44AD works</p>
        <p>For small businesses with turnover ≤ ₹3Cr (if ≥95% is digital). Declare <strong>6%</strong> of digital receipts or <strong>8%</strong> of cash receipts as income.</p>
        <p>If turnover exceeds ₹3Cr, you must maintain books of accounts.</p>
      </div>

      <div>
        <label className="text-xs font-semibold text-[#004030]/70 mb-1 block">Annual Turnover</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm pointer-events-none">₹</span>
          <Input
            type="number"
            min={0}
            placeholder="0"
            value={value.grossReceipts === 0 ? '' : value.grossReceipts}
            onChange={e => onChange({ grossReceipts: parseFloat(e.target.value) || 0 })}
            className="pl-7 h-auto py-2.5 text-sm font-medium focus-visible:ring-[#004030]/40"
          />
        </div>
      </div>

      {value.grossReceipts > 0 && (
        <>
          <div>
            <label className="text-xs font-semibold text-[#004030]/70 mb-1.5 block">
              % received digitally — {value.digitalPct}%
            </label>
            <div className="flex gap-2">
              {[100, 80, 50].map(pct => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => onChange({ digitalPct: pct })}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    value.digitalPct === pct
                      ? 'bg-[#004030] text-white border-[#004030]'
                      : 'bg-white text-[#004030]/60 border-[#004030]/20 hover:border-[#004030]/40'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Digital ({value.digitalPct}%) → 6% · Cash ({100 - value.digitalPct}%) → 8%
            </p>
          </div>

          {result.limitExceeded && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
              ⚠️ Turnover exceeds ₹3Cr — 44AD is not available. You must maintain accounts.
            </div>
          )}

          <ResultCard
            label="Presumptive Income"
            value={result.taxableIncome}
            note="Added to your total income at slab rate"
            breakdown={`${fmt(digitalAmt)} × 6% + ${fmt(cashAmt)} × 8% = ${fmt(result.taxableIncome)}`}
          />
        </>
      )}
    </div>
  );
}

// ─── Manual ─────────────────────────────────────────────────────────────────

function SectionManual({ value, result, onChange }: {
  value: FreelanceIncome; result: FreelanceResult;
  onChange: (p: Partial<FreelanceIncome>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-[#004030]/5 border border-[#004030]/15 rounded-xl p-4 text-xs text-[#004030]">
        <p>Enter your <strong>net profit</strong> after deducting business expenses. This is the amount from your P&L / books of accounts.</p>
      </div>
      <div>
        <label className="text-xs font-semibold text-[#004030]/70 mb-1 block">
          Net Profit / Business Income (Annual)
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm pointer-events-none">₹</span>
          <Input
            type="number"
            min={0}
            placeholder="0"
            value={value.manualProfit === 0 ? '' : value.manualProfit}
            onChange={e => onChange({ manualProfit: parseFloat(e.target.value) || 0 })}
            className="pl-7 h-auto py-2.5 text-sm font-medium focus-visible:ring-[#004030]/40"
          />
        </div>
      </div>
      {value.manualProfit > 0 && (
        <ResultCard
          label="Added to taxable income"
          value={result.taxableIncome}
          note="Taxed at your applicable slab rate"
          breakdown={`Net profit of ${fmt(value.manualProfit)} added to income`}
        />
      )}
    </div>
  );
}

// ─── Shared result card ──────────────────────────────────────────────────────

function ResultCard({ label, value, note, breakdown, limitWarning }: {
  label: string; value: number; note: string; breakdown: string; limitWarning?: string;
}) {
  return (
    <div className="bg-[#004030]/5 border border-[#004030]/15 rounded-xl px-4 py-3">
      <p className="text-xs text-[#004030]/50 font-medium">{breakdown}</p>
      <p className="text-xl font-bold text-[#004030] mt-1">{fmt(value)}</p>
      <p className="text-xs font-semibold text-[#004030]/60 mt-0.5">{label}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{note}</p>
      {limitWarning && <p className="text-xs text-red-600 font-semibold mt-1">⚠️ {limitWarning}</p>}
    </div>
  );
}
