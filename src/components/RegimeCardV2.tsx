import { useState } from 'react';
import type { RegimeResult } from '../tax';
import { fmt } from '../tax';

interface Props {
  regime: 'old' | 'new';
  result: RegimeResult;
  gross: number;
  epf: number;
  saving?: number; // shown as tag above new regime card
}

function surchargeRate(income: number, regime: 'old' | 'new'): number {
  if (income > 50_000_000) return regime === 'new' ? 25 : 37;
  if (income > 20_000_000) return 25;
  if (income > 10_000_000) return 15;
  if (income > 5_000_000)  return 10;
  return 0;
}

export default function RegimeCardV2({ regime, result, gross, epf, saving }: Props) {
  const [open, setOpen] = useState(false);
  const sRate = surchargeRate(result.taxableIncome, regime);
  const monthlyTax = Math.round(result.total / 12);
  const monthlyInHand = Math.round(Math.max(0, gross - result.total - epf) / 12);
  const isNew = regime === 'new';

  return (
    // Outer wrapper — New Regime gets the dark offset shadow
    <div className="relative">
      {isNew && (
        <div
          className="absolute bg-[#003f31]"
          style={{ top: 5, left: 6, right: -6, bottom: -5 }}
        />
      )}

      {/* Savings tag — above New Regime card */}
      {isNew && saving && saving > 0 && (
        <div
          className="absolute flex items-center z-10"
          style={{ top: -21, left: 100 }}
        >
          <div className="bg-[#c7ff0c] border border-[#003f31] px-2 flex items-center h-[21px]">
            <p className="text-[14px] font-medium text-[#003f31] whitespace-nowrap leading-none">
              You save <span className="font-bold">₹{saving.toLocaleString('en-IN')}</span> by choosing new regime
            </p>
          </div>
        </div>
      )}

      {/* Card */}
      <div
        className="relative bg-[#c7ff0c] border-[3px] border-[#003f31] p-3 flex flex-col gap-6"
        style={{ minWidth: 0 }}
      >
        {/* Header: regime label + chevron toggle */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-semibold text-[#003f31] uppercase tracking-wide">
              {isNew ? 'New Regime' : 'Old Regime'}
              {sRate > 0 && (
                <span className="ml-2 text-[11px] font-medium normal-case bg-amber-100 text-amber-700 px-1.5 py-0.5">
                  +{sRate}% surcharge
                </span>
              )}
            </p>
            <button
              onClick={() => setOpen(o => !o)}
              className="text-[14px] text-[#003f31]/60 hover:text-[#003f31] transition-colors leading-none"
              title={open ? 'Hide breakdown' : 'Show breakdown'}
            >
              {open ? '▲' : '▼'}
            </button>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-[42px] font-bold text-[#003f31] leading-none">
              {fmt(result.total)}
            </p>
            <p className="text-[16px] font-medium text-[#003f31] text-right leading-none pb-1">
              {fmt(monthlyTax)}/<span className="text-[14px]">m</span>
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t-[3px] border-[#003f31] -mx-3" />

        {/* Take home row */}
        <div className="bg-[#003f31] -mx-3 -mb-3 px-2 py-1 flex items-baseline justify-between">
          <span className={`text-[20px] text-[#c7ff0c] ${isNew ? 'font-bold' : 'font-medium'}`}>Take home</span>
          <span className={`text-[20px] text-[#c7ff0c] ${isNew ? 'font-bold' : 'font-medium'} whitespace-nowrap`}>
            {fmt(monthlyInHand)}
          </span>
        </div>

        {/* Breakdown (toggled via chevron in header) */}
        {open && (
          <div className="border-t-[3px] border-[#003f31] -mx-3 px-3 pt-3 mt-[-24px] space-y-1.5 text-sm text-[#003f31]">
            {result.rows.map((row, i) => (
              <div key={i} className="flex justify-between">
                <span className="opacity-60">{row.range} @ {row.rate}</span>
                <span className="font-medium">{fmt(row.tax)}</span>
              </div>
            ))}
            <div className="border-t border-[#003f31]/20 pt-2 space-y-1.5">
              <BRow label="Std. Deduction" value={`− ${fmt(result.stdDeduction)}`} />
              {regime === 'old' && result.deduction80C > 0     && <BRow label="Sec. 80C" value={`− ${fmt(result.deduction80C)}`} />}
              {regime === 'old' && result.deductionHRA > 0     && <BRow label="HRA" value={`− ${fmt(result.deductionHRA)}`} />}
              {regime === 'old' && result.deduction80D > 0     && <BRow label="Sec. 80D" value={`− ${fmt(result.deduction80D)}`} />}
              {regime === 'old' && result.deductionNPS > 0     && <BRow label="NPS 80CCD(1B)" value={`− ${fmt(result.deductionNPS)}`} />}
              {regime === 'old' && result.deductionHomeLoan > 0 && <BRow label="Home Loan 24b" value={`− ${fmt(result.deductionHomeLoan)}`} />}
              {regime === 'new' && <p className="opacity-40 italic text-xs">No other deductions in New Regime</p>}
              {result.otherIncomeAdded > 0 && <BRow label="Other Income" value={`+ ${fmt(result.otherIncomeAdded)}`} accent />}
              {result.specialTax > 0      && <BRow label="Capital Gains Tax" value={`+ ${fmt(result.specialTax)}`} accent />}
            </div>
            <div className="border-t border-[#003f31]/20 pt-2 space-y-1.5">
              <BRow label="Taxable Income" value={fmt(result.taxableIncome)} bold />
              <BRow label="Base Tax" value={fmt(result.baseTax)} />
              {result.rebate > 0    && <BRow label="Rebate u/s 87A" value={`− ${fmt(result.rebate)}`} />}
              {result.surcharge > 0 && <BRow label={`Surcharge (${sRate}%)`} value={fmt(result.surcharge)} />}
              <BRow label="Cess (4%)" value={fmt(result.cess)} />
            </div>
            <div className="border-t-[3px] border-[#003f31] pt-2">
              <BRow label="Total Tax" value={fmt(result.total)} bold />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BRow({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${bold ? 'font-bold text-[#003f31]' : ''}`}>
      <span className={accent ? 'text-purple-700' : 'text-[#003f31]/60'}>{label}</span>
      <span className={accent ? 'font-semibold text-purple-700' : bold ? '' : 'text-[#003f31]/80'}>{value}</span>
    </div>
  );
}
