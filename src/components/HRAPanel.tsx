import type { HRAInput, CityType } from '../tax';
import { calcHRAExemption, fmt, METRO_CITIES } from '../tax';

interface Props {
  hraInput: HRAInput;
  onChange: (updated: HRAInput) => void;
}

export default function HRAPanel({ hraInput, onChange }: Props) {
  const { exemption, rule_a, rule_b, rule_c, cityPct } = calcHRAExemption(hraInput);
  const hasData  = hraInput.basicSalary > 0 && hraInput.rentPaid > 0;
  const limiting = hasData
    ? exemption === rule_c ? 'c'
    : exemption === rule_b ? 'b'
    : 'a'
    : null;

  function update(patch: Partial<HRAInput>) {
    onChange({ ...hraInput, ...patch });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7 mb-7">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🏠</span>
        <h2 className="text-base font-semibold text-gray-700">
          HRA — House Rent Allowance
          <span className="ml-2 text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
            Old Regime Only
          </span>
        </h2>
      </div>
      <p className="text-xs text-gray-400 mb-5">
        HRA exemption is the <strong>lowest</strong> of three rules. Applies only if you live in rented accommodation.
      </p>

      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">

        {/* City type */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
            City Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['metro', 'non-metro'] as CityType[]).map(ct => (
              <button
                key={ct}
                onClick={() => update({ cityType: ct })}
                className={`py-2.5 rounded-lg text-sm font-semibold border transition-all ${
                  hraInput.cityType === ct
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'
                }`}
              >
                {ct === 'metro' ? '🌆 Metro' : '🏙️ Non-Metro'}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {hraInput.cityType === 'metro'
              ? `Metro cities (${METRO_CITIES.join(', ')}) → 50% of basic`
              : 'All other cities → 40% of basic'}
          </p>
        </div>

        {/* Annual rent paid */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
            Annual Rent Paid
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₹</span>
            <input
              type="number"
              min={0}
              placeholder="e.g. 240000"
              value={hraInput.rentPaid === 0 ? '' : hraInput.rentPaid}
              onChange={e => update({ rentPaid: parseFloat(e.target.value) || 0 })}
              className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-3 text-sm font-medium
                         focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
            />
          </div>
          {hraInput.rentPaid > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              {fmt(Math.round(hraInput.rentPaid / 12))}/month
            </p>
          )}
        </div>

        {/* Basic salary (may already be filled from EPF panel) */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
            Annual Basic Salary
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₹</span>
            <input
              type="number"
              min={0}
              placeholder="e.g. 600000"
              value={hraInput.basicSalary === 0 ? '' : hraInput.basicSalary}
              onChange={e => update({ basicSalary: parseFloat(e.target.value) || 0 })}
              className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-3 text-sm font-medium
                         focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Usually 40–50% of gross CTC</p>
        </div>

        {/* HRA received from employer (optional) */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
            HRA Received from Employer
            <span className="ml-1 font-normal normal-case text-gray-400">(optional)</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₹</span>
            <input
              type="number"
              min={0}
              placeholder="Leave blank → 40% of basic used"
              value={hraInput.hraReceived === 0 ? '' : hraInput.hraReceived}
              onChange={e => update({ hraReceived: parseFloat(e.target.value) || 0 })}
              className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-3 text-sm font-medium
                         focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition
                         placeholder:text-gray-300 placeholder:text-xs"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Check your payslip or Form 16</p>
        </div>
      </div>

      {/* HRA exemption result */}
      {hasData && (
        <div className="bg-slate-50 border border-gray-100 rounded-xl p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
            HRA Exemption Calculation
          </p>

          <div className="space-y-2.5 mb-4">
            <RuleRow
              label="(a) Actual HRA received"
              value={rule_a}
              isLimiting={limiting === 'a'}
              note={hraInput.hraReceived === 0 ? 'estimated as 40% of basic' : undefined}
            />
            <RuleRow
              label={`(b) ${cityPct}% of basic salary (${hraInput.cityType})`}
              value={rule_b}
              isLimiting={limiting === 'b'}
            />
            <RuleRow
              label="(c) Rent paid − 10% of basic"
              value={rule_c}
              isLimiting={limiting === 'c'}
              note={`${fmt(hraInput.rentPaid)} − ${fmt(Math.round(hraInput.basicSalary * 0.1))}`}
            />
          </div>

          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
            <div>
              <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">HRA Exempt</p>
              <p className="text-xs text-emerald-500 mt-0.5">Minimum of (a), (b), (c)</p>
            </div>
            <p className="text-2xl font-bold text-emerald-700">{fmt(exemption)}</p>
          </div>

          {exemption === 0 && (
            <p className="text-xs text-amber-700 mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ⚠️ Rent paid is less than 10% of basic salary — no HRA exemption applies.
            </p>
          )}
        </div>
      )}

      {!hasData && (
        <div className="text-center py-5 text-gray-400 text-sm">
          Fill in basic salary and rent paid above to see your HRA exemption.
        </div>
      )}
    </div>
  );
}

function RuleRow({
  label, value, isLimiting, note,
}: { label: string; value: number; isLimiting: boolean | null; note?: string }) {
  return (
    <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-all ${
      isLimiting
        ? 'bg-indigo-100 border border-indigo-300'
        : 'bg-white border border-gray-100'
    }`}>
      <div>
        <span className={`font-medium ${isLimiting ? 'text-indigo-800' : 'text-gray-600'}`}>{label}</span>
        {note && <span className="text-xs text-gray-400 ml-2">({note})</span>}
        {isLimiting && (
          <span className="ml-2 text-xs bg-indigo-600 text-white px-1.5 py-0.5 rounded font-semibold">
            Limiting factor
          </span>
        )}
      </div>
      <span className={`font-bold ml-4 shrink-0 ${isLimiting ? 'text-indigo-700' : 'text-gray-700'}`}>
        {fmt(value)}
      </span>
    </div>
  );
}
