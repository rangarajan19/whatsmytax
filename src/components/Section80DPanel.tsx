import type { Section80DInput } from '../tax';
import {
  calc80DDeduction,
  MAX_80D_SELF_SENIOR,
  MAX_80D_PARENT_SENIOR,
  fmt,
} from '../tax';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';

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
    <Card className="mb-7">
      <CardContent className="p-4 sm:p-7">
        {/* Header */}
        <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 font-medium mb-2">
          Old Regime Only
        </Badge>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🏥</span>
          <h2 className="text-base font-semibold text-[#003F31]">
            Section 80D — Health Insurance
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mb-6">
          Premiums paid for health insurance. Limit is ₹25,000 (or ₹50,000 if senior citizen 60+) each for self/family and parents.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">

          {/* Self & Family */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-blue-800">Self, Spouse &amp; Children</p>
              <Badge className="bg-blue-100 text-blue-600 border-blue-200">
                Limit: {fmt(selfLimit)}
              </Badge>
            </div>

            {/* Premium input */}
            <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              Annual Premium Paid <span className="font-normal text-muted-foreground">(per year)</span>
            </Label>
            <div className="relative mb-3">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm pointer-events-none">₹</span>
              <Input
                type="number"
                min={0}
                placeholder="e.g. 15000"
                value={value.selfPremium === 0 ? '' : value.selfPremium}
                onChange={e => update({ selfPremium: parseFloat(e.target.value) || 0 })}
                className="pl-7 h-auto py-2.5 text-sm font-medium bg-white border-blue-200 focus-visible:ring-blue-400"
              />
            </div>

            {/* Senior toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Switch
                checked={value.selfSenior}
                onCheckedChange={(checked) => update({ selfSenior: checked })}
                className="data-checked:bg-blue-500"
              />
              <span className="text-xs text-muted-foreground">
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
              <Badge className="bg-violet-100 text-violet-600 border-violet-200">
                Limit: {fmt(parentLimit)}
              </Badge>
            </div>

            {/* Premium input */}
            <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              Annual Premium Paid <span className="font-normal text-muted-foreground">(per year)</span>
            </Label>
            <div className="relative mb-3">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm pointer-events-none">₹</span>
              <Input
                type="number"
                min={0}
                placeholder="e.g. 25000"
                value={value.parentPremium === 0 ? '' : value.parentPremium}
                onChange={e => update({ parentPremium: parseFloat(e.target.value) || 0 })}
                className="pl-7 h-auto py-2.5 text-sm font-medium bg-white border-violet-200 focus-visible:ring-violet-400"
              />
            </div>

            {/* Senior toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Switch
                checked={value.parentSenior}
                onCheckedChange={(checked) => update({ parentSenior: checked })}
                className="data-checked:bg-violet-500"
              />
              <span className="text-xs text-muted-foreground">
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
          <p className="text-center text-xs text-muted-foreground mt-4">
            Enter any premium above to see your 80D deduction.
          </p>
        )}

        <p className="text-xs text-muted-foreground mt-4 bg-muted/50 rounded-lg px-3 py-2">
          💡 Preventive health check-up costs (up to ₹5,000) are included within the respective limits above and do not need to be entered separately.
        </p>
      </CardContent>
    </Card>
  );
}
