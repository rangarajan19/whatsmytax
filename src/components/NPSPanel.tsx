import type { NPS80CCD1BInput } from '../tax';
import { calcNPS80CCD1B, MAX_NPS_80CCD1B, fmt } from '../tax';

interface Props {
  value: NPS80CCD1BInput;
  onChange: (updated: NPS80CCD1BInput) => void;
}

export default function NPSPanel({ value, onChange }: Props) {
  const deduction = calcNPS80CCD1B(value);
  const fillPct   = Math.min((value.amount / MAX_NPS_80CCD1B) * 100, 100);
  const overflow  = value.amount > MAX_NPS_80CCD1B;
  const remaining = Math.max(0, MAX_NPS_80CCD1B - value.amount);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7 mb-7">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">🏛️</span>
        <h2 className="text-base font-semibold text-gray-700">
          Section 80CCD(1B) — NPS Additional Contribution
          <span className="ml-2 text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
            Old Regime Only
          </span>
        </h2>
      </div>
      <p className="text-xs text-gray-400 mb-6">
        Additional NPS contribution <strong>over and above</strong> the ₹1.5L Section 80C limit.
        Extra deduction of up to ₹50,000 exclusively for NPS (Tier I account).
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
        {/* Input */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
            Additional NPS Contribution <span className="font-normal normal-case text-gray-400">(per year)</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₹</span>
            <input
              type="number"
              min={0}
              placeholder="e.g. 50000"
              value={value.amount === 0 ? '' : value.amount}
              onChange={e => onChange({ amount: parseFloat(e.target.value) || 0 })}
              className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-3 text-sm font-medium
                         focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
            />
          </div>

          {/* Progress bar */}
          {value.amount > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{overflow
                  ? <span className="text-amber-600 font-semibold">Capped at ₹50,000</span>
                  : remaining > 0
                    ? <span>{fmt(remaining)} more to max</span>
                    : <span className="text-emerald-600 font-semibold">Fully utilised ✓</span>
                }</span>
                <span className={`font-semibold ${overflow ? 'text-amber-600' : fillPct === 100 ? 'text-emerald-600' : 'text-indigo-600'}`}>
                  {fmt(deduction)} / {fmt(MAX_NPS_80CCD1B)}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${overflow ? 'bg-amber-500' : fillPct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                  style={{ width: `${fillPct}%` }}
                />
              </div>
            </div>
          )}

          {overflow && (
            <p className="text-xs text-amber-700 mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ⚠️ Contribution exceeds ₹50,000 limit. Only ₹50,000 will be deducted under 80CCD(1B).
            </p>
          )}
        </div>

        {/* Info card */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-2.5">
          <InfoRow label="Deduction limit" value={fmt(MAX_NPS_80CCD1B)} />
          <InfoRow label="Applied deduction" value={deduction > 0 ? fmt(deduction) : '—'} highlight={deduction > 0} />
          <div className="border-t border-indigo-100 pt-2 mt-1">
            <p className="text-xs text-indigo-600">
              💡 This is <strong>separate</strong> from the NPS you may have entered inside Section 80C.
              That one counts within ₹1.5L; this gives an <strong>extra ₹50K</strong> benefit.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-indigo-600 text-xs">{label}</span>
      <span className={`font-bold text-sm ${highlight ? 'text-indigo-700' : 'text-indigo-400'}`}>{value}</span>
    </div>
  );
}
