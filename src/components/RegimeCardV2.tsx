import type { RegimeResult } from '../tax';
import { fmt, pct } from '../tax';

interface Props {
  regime: 'old' | 'new';
  result: RegimeResult;
  isHigher: boolean;
  gross: number;
  epf: number;
  showBreakdown: boolean;
}

function surchargeRate(income: number, regime: 'old' | 'new'): number {
  if (income > 50_000_000) return regime === 'new' ? 25 : 37;
  if (income > 20_000_000) return 25;
  if (income > 10_000_000) return 15;
  if (income > 5_000_000)  return 10;
  return 0;
}

export default function RegimeCardV2({ regime, result, isHigher, gross, epf, showBreakdown }: Props) {
  const sRate = surchargeRate(result.taxableIncome, regime);
  const monthlyTax = Math.round(result.total / 12);
  const monthlyInHand = Math.round(Math.max(0, gross - result.total - epf) / 12);
  const label = regime === 'new' ? 'New Regime' : 'Old Regime';

  return (
    <div
      className={`rounded-2xl border-2 overflow-hidden font-sans
        ${isHigher ? 'border-[#003f31] opacity-80' : 'border-[#003f31]'}`}
      style={{ backgroundColor: '#fff' }}
    >
      {/* Card header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between mb-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#003f31]/60">
            {label}
            {isHigher && (
              <span className="ml-2 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold tracking-normal">
                HIGHER TAX
              </span>
            )}
          </span>
          {sRate > 0 && (
            <span className="text-[10px] bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
              +{sRate}% Surcharge
            </span>
          )}
        </div>

        {/* Tax total */}
        <div className="flex items-baseline justify-between mt-2">
          <p className="text-3xl font-black text-[#003f31] tracking-tight">{fmt(result.total)}</p>
          <p className="text-sm text-[#003f31]/50 font-medium">{fmt(monthlyTax)}<span className="text-xs">/mo</span></p>
        </div>
        <p className="text-xs text-[#003f31]/40 mt-0.5">Effective rate: {pct(result.total, gross)}</p>
      </div>

      {/* Take home — dark row */}
      <div className="bg-[#003f31] px-5 py-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-[#c7ff0c]/70 uppercase tracking-wider">Take home</span>
        <div className="text-right">
          <span className="text-lg font-black text-[#c7ff0c]">{fmt(monthlyInHand)}</span>
          <span className="text-xs text-[#c7ff0c]/60 ml-1">/mo</span>
          {epf > 0 && (
            <p className="text-[10px] text-[#c7ff0c]/40">after tax + EPF</p>
          )}
        </div>
      </div>

      {/* Breakdown (toggled) */}
      {showBreakdown && (
        <div className="px-5 py-4 border-t border-[#003f31]/10 space-y-1.5 text-sm">

          {/* Slab rows */}
          {result.rows.map((row, i) => (
            <div key={i} className="flex justify-between">
              <span className="text-[#003f31]/50">{row.range} @ {row.rate}</span>
              <span className="font-medium text-[#003f31]">{fmt(row.tax)}</span>
            </div>
          ))}

          <div className="border-t border-[#003f31]/10 pt-2 mt-2 space-y-1.5">
            {/* Deductions */}
            {result.stdDeduction > 0 && (
              <BRow label="Std. Deduction" value={`− ${fmt(result.stdDeduction)}`} />
            )}
            {regime === 'old' && result.deduction80C > 0 && (
              <BRow label="Sec. 80C" value={`− ${fmt(result.deduction80C)}`} />
            )}
            {regime === 'old' && result.deductionHRA > 0 && (
              <BRow label="HRA Exemption" value={`− ${fmt(result.deductionHRA)}`} />
            )}
            {regime === 'old' && result.deduction80D > 0 && (
              <BRow label="Sec. 80D" value={`− ${fmt(result.deduction80D)}`} />
            )}
            {regime === 'old' && result.deductionNPS > 0 && (
              <BRow label="NPS 80CCD(1B)" value={`− ${fmt(result.deductionNPS)}`} />
            )}
            {regime === 'old' && result.deductionHomeLoan > 0 && (
              <BRow label="Home Loan 24b" value={`− ${fmt(result.deductionHomeLoan)}`} />
            )}
            {regime === 'new' && (
              <p className="text-xs text-[#003f31]/40 italic">No other deductions in New Regime</p>
            )}

            {result.otherIncomeAdded > 0 && (
              <BRow label="Other Income" value={`+ ${fmt(result.otherIncomeAdded)}`} accent />
            )}
            {result.specialTax > 0 && (
              <BRow label="Capital Gains Tax" value={`+ ${fmt(result.specialTax)}`} accent />
            )}

            <div className="border-t border-[#003f31]/10 pt-2 mt-1">
              <BRow label="Taxable Income" value={fmt(result.taxableIncome)} bold />
              <BRow label="Base Tax" value={fmt(result.baseTax)} />
              {result.rebate > 0 && <BRow label="Rebate u/s 87A" value={`− ${fmt(result.rebate)}`} />}
              {result.surcharge > 0 && <BRow label={`Surcharge (${sRate}%)`} value={fmt(result.surcharge)} />}
              <BRow label="Health & Ed. Cess (4%)" value={fmt(result.cess)} />
            </div>

            <div className="border-t border-[#003f31] pt-2 mt-1">
              <BRow label="Total Tax" value={fmt(result.total)} bold />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BRow({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-bold text-[#003f31]' : ''}`}>
      <span className={accent ? 'text-purple-600' : 'text-[#003f31]/50'}>{label}</span>
      <span className={accent ? 'font-semibold text-purple-700' : bold ? 'text-[#003f31]' : 'text-[#003f31]/80'}>{value}</span>
    </div>
  );
}
