import type { Section80DInput } from '../tax';
import {
  calc80DDeduction,
  MAX_80D_SELF_SENIOR,
  MAX_80D_PARENT_SENIOR,
  fmt,
} from '../tax';

interface Props {
  value: Section80DInput;
  onChange: (updated: Section80DInput) => void;
}

export default function Section80DPanel({ value, onChange }: Props) {
  const { selfDeduction, parentDeduction, total, selfLimit, parentLimit } =
    calc80DDeduction(value);

  function update(patch: Partial<Section80DInput>) {
    onChange({ ...value, ...patch });
  }

  const hasAny = value.selfPremium > 0 || value.parentPremium > 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7 mb-7">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">🏥</span>
        <h2 className="text-base font-semibold text-[#003F31]">
          Section 80D — Health Insurance
          <span className="ml-2 text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
            Old Regime Only
          </span>
        </h2>
      </div>
      <p className="text-xs text-gray-400 mb-6">
        Premiums paid for health insurance. Limit is ₹25,000 (or ₹50,000 if senior citizen 60+) each for self/family and parents.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

        {/* Self & Family */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-blue-800">Self, Spouse &amp; Children</p>
            <span className="text-xs bg-blue-100 text-blue-600 font-semibold px-2 py-0.5 rounded-full">
              Limit: {fmt(selfLimit)}
            </span>
          </div>

          {/* Premium input */}
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">
            Annual Premium Paid <span className="font-normal text-gray-400">(per year)</span>
          </label>
          <div className="relative mb-3">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">₹</span>
            <input
              type="number"
              min={0}
              placeholder="e.g. 15000"
              value={value.selfPremium === 0 ? '' : value.selfPremium}
              onChange={e => update({ selfPremium: parseFloat(e.target.value) || 0 })}
              className="w-full border border-blue-200 rounded-lg pl-7 pr-3 py-2.5 text-sm font-medium bg-white
                         focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
            />
          </div>

          {/* Senior toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => update({ selfSenior: !value.selfSenior })}
              className={`w-10 h-5 rounded-full relative transition-colors duration-200 flex-shrink-0 cursor-pointer ${
                value.selfSenior ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${
                value.selfSenior ? 'left-5' : 'left-0.5'
              }`} />
            </div>
            <span className="text-xs text-gray-600">
              Self / spouse is <strong>senior citizen</strong> (60+)
              <span className="ml-1 text-blue-500 font-semibold">→ limit: {fmt(MAX_80D_SELF_SENIOR)}</span>
            </span>
          </label>

          {/* Applied amount */}
          {value.selfPremium > 0 && (
            <div className="mt-3 flex items-center justify-between bg-white rounded-lg border border-blue-200 px-3 py-2">
              <span className="text-xs text-blue-600 font-semibold">Applied</span>
              <span className="text-sm font-bold text-blue-700">{fmt(selfDeduction)}</span>
            </div>
          )}
          {value.selfPremium > selfLimit && (
            <p className="text-xs text-amber-600 mt-1.5">
              ⚠️ Premium exceeds limit. Only {fmt(selfLimit)} will be deducted.
            </p>
          )}
        </div>

        {/* Parents */}
        <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-violet-800">Parents</p>
            <span className="text-xs bg-violet-100 text-violet-600 font-semibold px-2 py-0.5 rounded-full">
              Limit: {fmt(parentLimit)}
            </span>
          </div>

          {/* Premium input */}
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">
            Annual Premium Paid <span className="font-normal text-gray-400">(per year)</span>
          </label>
          <div className="relative mb-3">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">₹</span>
            <input
              type="number"
              min={0}
              placeholder="e.g. 25000"
              value={value.parentPremium === 0 ? '' : value.parentPremium}
              onChange={e => update({ parentPremium: parseFloat(e.target.value) || 0 })}
              className="w-full border border-violet-200 rounded-lg pl-7 pr-3 py-2.5 text-sm font-medium bg-white
                         focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition"
            />
          </div>

          {/* Senior toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => update({ parentSenior: !value.parentSenior })}
              className={`w-10 h-5 rounded-full relative transition-colors duration-200 flex-shrink-0 cursor-pointer ${
                value.parentSenior ? 'bg-violet-500' : 'bg-gray-300'
              }`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${
                value.parentSenior ? 'left-5' : 'left-0.5'
              }`} />
            </div>
            <span className="text-xs text-gray-600">
              Parents are <strong>senior citizens</strong> (60+)
              <span className="ml-1 text-violet-500 font-semibold">→ limit: {fmt(MAX_80D_PARENT_SENIOR)}</span>
            </span>
          </label>

          {/* Applied amount */}
          {value.parentPremium > 0 && (
            <div className="mt-3 flex items-center justify-between bg-white rounded-lg border border-violet-200 px-3 py-2">
              <span className="text-xs text-violet-600 font-semibold">Applied</span>
              <span className="text-sm font-bold text-violet-700">{fmt(parentDeduction)}</span>
            </div>
          )}
          {value.parentPremium > parentLimit && (
            <p className="text-xs text-amber-600 mt-1.5">
              ⚠️ Premium exceeds limit. Only {fmt(parentLimit)} will be deducted.
            </p>
          )}
        </div>
      </div>

      {/* Total */}
      {hasAny && (
        <div className="mt-5 flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3">
          <div>
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Total 80D Deduction</p>
            <p className="text-xs text-emerald-500 mt-0.5">Self: {fmt(selfDeduction)} + Parents: {fmt(parentDeduction)}</p>
          </div>
          <p className="text-2xl font-bold text-emerald-700">{fmt(total)}</p>
        </div>
      )}

      {!hasAny && (
        <p className="text-center text-xs text-gray-400 mt-4">
          Enter any premium above to see your 80D deduction.
        </p>
      )}

      <p className="text-xs text-gray-400 mt-4 bg-gray-50 rounded-lg px-3 py-2">
        💡 Preventive health check-up costs (up to ₹5,000) are included within the respective limits above and do not need to be entered separately.
      </p>
    </div>
  );
}
