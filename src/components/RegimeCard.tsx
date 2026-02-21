import type { RegimeResult } from '../tax';
import { fmt, pct } from '../tax';

interface Props {
  regime: 'old' | 'new';
  label: string;
  result: RegimeResult;
  isHigher: boolean;
  gross: number;
}

const ACCENT = {
  old: { title: 'text-cyan-600', total: 'text-cyan-600', border: 'border-cyan-200' },
  new: { title: 'text-emerald-600', total: 'text-emerald-600', border: 'border-emerald-200' },
};

export default function RegimeCard({ regime, label, result, isHigher, gross }: Props) {
  const colors = ACCENT[regime];

  const cardClass  = isHigher
    ? 'bg-red-50 border-2 border-red-300 rounded-2xl p-6 relative shadow-md'
    : `bg-white border-2 ${colors.border} rounded-2xl p-6 relative shadow-sm`;
  const titleClass = isHigher
    ? 'text-red-600 text-xs font-bold uppercase tracking-widest'
    : `${colors.title} text-xs font-bold uppercase tracking-widest`;
  const totalClass = isHigher
    ? 'text-red-600 text-4xl font-bold mb-1'
    : `${colors.total} text-4xl font-bold mb-1`;
  const totalFooter = isHigher ? 'text-red-600' : colors.total;
  const tagApplied  = regime === 'old' ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-100 text-gray-400';

  return (
    <div className={cardClass}>
      {isHigher && (
        <span className="absolute top-4 right-4 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full tracking-wide">
          HIGHER TAX
        </span>
      )}

      <p className={titleClass}>{regime === 'old' ? 'Old Regime' : 'New Regime'}</p>
      <h3 className="text-sm text-gray-500 mb-4 mt-0.5">{label}</h3>

      <p className={totalClass}>{fmt(result.total)}</p>
      <p className="text-sm text-gray-400 mb-5">Effective rate: {pct(result.total, gross)}</p>

      {/* Slab breakdown */}
      <div className="border-t border-gray-100 pt-4 space-y-1.5">
        {result.rows.map((row, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-gray-500">{row.range} @ {row.rate}</span>
            <span className="font-medium text-gray-700">{fmt(row.tax)}</span>
          </div>
        ))}
      </div>

      {/* Deductions & computation */}
      <div className="border-t border-gray-100 mt-3 pt-3 space-y-1.5">

        <DeductionRow
          label="Std. Deduction"
          value={result.stdDeduction}
          tagLabel="Applied"
          tagClass={tagApplied}
          show
        />

        {regime === 'old' && (
          <>
            <DeductionRow
              label="Sec. 80C Investments"
              value={result.deduction80C}
              tagLabel={result.deduction80C > 0 ? 'Applied' : 'None entered'}
              tagClass={result.deduction80C > 0 ? tagApplied : 'bg-gray-100 text-gray-400'}
              show
              dimIfZero
            />
            <DeductionRow
              label="HRA Exemption"
              value={result.deductionHRA}
              tagLabel={result.deductionHRA > 0 ? 'Applied' : 'None entered'}
              tagClass={result.deductionHRA > 0 ? tagApplied : 'bg-gray-100 text-gray-400'}
              show
              dimIfZero
            />
            <DeductionRow
              label="Sec. 80D Health Insurance"
              value={result.deduction80D}
              tagLabel={result.deduction80D > 0 ? 'Applied' : 'None entered'}
              tagClass={result.deduction80D > 0 ? tagApplied : 'bg-gray-100 text-gray-400'}
              show
              dimIfZero
            />
            <DeductionRow
              label="NPS 80CCD(1B)"
              value={result.deductionNPS}
              tagLabel={result.deductionNPS > 0 ? 'Applied' : 'None entered'}
              tagClass={result.deductionNPS > 0 ? tagApplied : 'bg-gray-100 text-gray-400'}
              show
              dimIfZero
            />
            <DeductionRow
              label="Home Loan Interest 24b"
              value={result.deductionHomeLoan}
              tagLabel={result.deductionHomeLoan > 0 ? 'Applied' : 'None entered'}
              tagClass={result.deductionHomeLoan > 0 ? tagApplied : 'bg-gray-100 text-gray-400'}
              show
              dimIfZero
            />
          </>
        )}

        {regime === 'new' && (
          <p className="text-xs text-gray-400 italic">
            80C, HRA, 80D, NPS & home loan deductions not applicable in New Regime
          </p>
        )}

        {/* Other income */}
        {result.otherIncomeAdded > 0 && (
          <div className="flex justify-between text-sm items-center">
            <span className="text-gray-500 flex items-center gap-1 flex-wrap">
              Other Income
              <span className="text-xs px-1.5 py-0.5 rounded font-semibold bg-purple-100 text-purple-700">Added</span>
            </span>
            <span className="shrink-0 ml-2 font-semibold text-purple-700">+ {fmt(result.otherIncomeAdded)}</span>
          </div>
        )}
        {result.specialTax > 0 && (
          <div className="flex justify-between text-sm items-center">
            <span className="text-gray-500 flex items-center gap-1 flex-wrap">
              Capital Gains Tax
              <span className="text-xs px-1.5 py-0.5 rounded font-semibold bg-orange-100 text-orange-700">Flat rate</span>
            </span>
            <span className="shrink-0 ml-2 font-semibold text-orange-700">+ {fmt(result.specialTax)}</span>
          </div>
        )}

        {/* Taxable Income */}
        <div className="flex justify-between text-sm pt-1">
          <span className="text-gray-500">Taxable Income</span>
          <span className="font-semibold text-gray-800">{fmt(result.taxableIncome)}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Base Tax</span>
          <span className="text-gray-700">{fmt(result.baseTax)}</span>
        </div>

        {result.rebate > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Rebate u/s 87A</span>
            <span className="text-gray-700">− {fmt(result.rebate)}</span>
          </div>
        )}
        {result.surcharge > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Surcharge</span>
            <span className="text-gray-700">{fmt(result.surcharge)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Health & Ed. Cess (4%)</span>
          <span className="text-gray-700">{fmt(result.cess)}</span>
        </div>

        <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2 mt-1">
          <span className="text-gray-800">Total Tax</span>
          <span className={totalFooter}>{fmt(result.total)}</span>
        </div>
      </div>
    </div>
  );
}

function DeductionRow({
  label, value, tagLabel, tagClass, show, dimIfZero = false,
}: {
  label: string;
  value: number;
  tagLabel: string;
  tagClass: string;
  show: boolean;
  dimIfZero?: boolean;
}) {
  if (!show) return null;
  const isZero = value === 0;
  return (
    <div className={`flex justify-between text-sm items-center ${dimIfZero && isZero ? 'opacity-40' : ''}`}>
      <span className="text-gray-500 flex items-center gap-1 flex-wrap">
        {label}
        <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${tagClass}`}>{tagLabel}</span>
      </span>
      <span className={`shrink-0 ml-2 ${isZero ? 'text-gray-400' : 'font-semibold text-cyan-700'}`}>
        {isZero ? '—' : `− ${fmt(value)}`}
      </span>
    </div>
  );
}
