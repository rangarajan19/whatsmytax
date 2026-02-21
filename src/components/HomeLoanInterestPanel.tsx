import type { HomeLoanInterestInput } from '../tax';
import { calcHomeLoanInterestDeduction, MAX_HOME_LOAN_INTEREST, fmt } from '../tax';

interface Props {
  value: HomeLoanInterestInput;
  onChange: (updated: HomeLoanInterestInput) => void;
}

export default function HomeLoanInterestPanel({ value, onChange }: Props) {
  const deduction = calcHomeLoanInterestDeduction(value);
  const isCapped  = value.isSelfOccupied && value.interestPaid > MAX_HOME_LOAN_INTEREST;

  function update(patch: Partial<HomeLoanInterestInput>) {
    onChange({ ...value, ...patch });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7 mb-7">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">🏡</span>
        <h2 className="text-base font-semibold text-gray-700">
          Section 24b — Home Loan Interest
          <span className="ml-2 text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
            Old Regime Only
          </span>
        </h2>
      </div>
      <p className="text-xs text-gray-400 mb-6">
        Interest paid on home loan. Self-occupied property: capped at ₹2,00,000 per year.
        Let-out property: full interest is deductible (no cap).
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">

        {/* Left: inputs */}
        <div className="space-y-4">
          {/* Property type toggle */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
              Property Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: true,  label: '🏠 Self-Occupied', cap: `Cap: ${fmt(MAX_HOME_LOAN_INTEREST)}` },
                { val: false, label: '🏘️ Let-Out',       cap: 'No cap' },
              ].map(opt => (
                <button
                  key={String(opt.val)}
                  onClick={() => update({ isSelfOccupied: opt.val })}
                  className={`py-2.5 px-3 rounded-xl text-sm font-semibold border transition-all text-left ${
                    value.isSelfOccupied === opt.val
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'
                  }`}
                >
                  <div>{opt.label}</div>
                  <div className={`text-xs font-normal mt-0.5 ${value.isSelfOccupied === opt.val ? 'text-indigo-200' : 'text-gray-400'}`}>
                    {opt.cap}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Interest input */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
              Annual Interest Paid <span className="font-normal normal-case text-gray-400">(per year)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₹</span>
              <input
                type="number"
                min={0}
                placeholder="e.g. 180000"
                value={value.interestPaid === 0 ? '' : value.interestPaid}
                onChange={e => update({ interestPaid: parseFloat(e.target.value) || 0 })}
                className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-3 text-sm font-medium
                           focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
              />
            </div>
            {value.interestPaid > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                {fmt(Math.round(value.interestPaid / 12))}/month
              </p>
            )}
          </div>

          {isCapped && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
              ⚠️ Interest paid ({fmt(value.interestPaid)}) exceeds the ₹2,00,000 self-occupied cap.
              Only {fmt(MAX_HOME_LOAN_INTEREST)} will be deducted.
            </div>
          )}
        </div>

        {/* Right: result card */}
        <div className="bg-slate-50 border border-gray-100 rounded-xl p-5 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Deduction Summary
          </p>
          <SummaryRow label="Interest paid"       value={value.interestPaid > 0 ? fmt(value.interestPaid) : '—'} />
          <SummaryRow label="Property type"       value={value.isSelfOccupied ? 'Self-Occupied' : 'Let-Out'} />
          <SummaryRow label="Applicable limit"    value={value.isSelfOccupied ? fmt(MAX_HOME_LOAN_INTEREST) : 'No limit'} />
          <div className="border-t border-gray-200 pt-3">
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Deduction Applied</p>
              <p className="text-xl font-bold text-emerald-700">{deduction > 0 ? fmt(deduction) : '—'}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 pt-1">
            💡 Check your bank's annual interest certificate (Form 16B or loan statement) for the exact interest paid.
          </p>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-700">{value}</span>
    </div>
  );
}
