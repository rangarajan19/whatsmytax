import type { NPS80CCD1BInput } from '../tax';
import { calcNPS80CCD1B, MAX_NPS_80CCD1B, fmt } from '../tax';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';

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
    <Card className="mb-7">
      <CardContent className="p-4 sm:p-7">
        <Badge className="bg-[#004030]/8 text-[#004030] border-[#004030]/15 font-medium mb-2">
          Old Regime Only
        </Badge>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🏛️</span>
          <h2 className="text-base font-semibold text-[#003F31]">
            Section 80CCD(1B) — NPS Additional Contribution
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mb-6">
          Additional NPS contribution <strong>over and above</strong> the ₹1.5L Section 80C limit.
          Extra deduction of up to ₹50,000 exclusively for NPS (Tier I account).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 items-start">
          {/* Input */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">
              Additional NPS Contribution <span className="font-normal normal-case">(per year)</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold pointer-events-none">₹</span>
              <Input
                type="number"
                min={0}
                placeholder="e.g. 50000"
                value={value.amount === 0 ? '' : value.amount}
                onChange={e => onChange({ amount: parseFloat(e.target.value) || 0 })}
                className="pl-8 h-auto py-3 text-sm font-medium rounded-xl"
              />
            </div>

            {/* Progress bar */}
            {value.amount > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{overflow
                    ? <span className="text-[#004030] font-semibold">Capped at ₹50,000</span>
                    : remaining > 0
                      ? <span>{fmt(remaining)} more to max</span>
                      : <span className="text-[#004030] font-semibold">Fully utilised ✓</span>
                  }</span>
                  <span className="font-semibold text-[#004030]">
                    {fmt(deduction)} / {fmt(MAX_NPS_80CCD1B)}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all duration-300 bg-[#004030]"
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
              </div>
            )}

            {overflow && (
              <p className="text-xs text-[#004030] mt-2 bg-[#004030]/5 border border-[#004030]/15 rounded-lg px-3 py-2">
                ⚠️ Contribution exceeds ₹50,000 limit. Only ₹50,000 will be deducted under 80CCD(1B).
              </p>
            )}
          </div>

          {/* Info card */}
          <div className="bg-[#004030]/8 border border-[#004030]/15 rounded-xl p-4 space-y-2.5">
            <InfoRow label="Deduction limit" value={fmt(MAX_NPS_80CCD1B)} />
            <InfoRow label="Applied deduction" value={deduction > 0 ? fmt(deduction) : '—'} highlight={deduction > 0} />
            <div className="border-t border-[#004030]/15 pt-2 mt-1">
              <p className="text-xs text-[#004030]/60">
                💡 This is <strong>separate</strong> from the NPS you may have entered inside Section 80C.
                That one counts within ₹1.5L; this gives an <strong>extra ₹50K</strong> benefit.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-[#004030]/60 text-xs">{label}</span>
      <span className={`font-bold text-sm ${highlight ? 'text-[#004030]' : 'text-[#004030]/40'}`}>{value}</span>
    </div>
  );
}
