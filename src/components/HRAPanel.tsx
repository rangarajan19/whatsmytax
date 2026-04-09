import type { HRAInput, CityType } from '../tax';
import { calcHRAExemption, fmt, METRO_CITIES } from '../tax';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';

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
    <Card className="mb-7">
      <CardContent className="p-4 sm:p-7">
        <Badge className="bg-[#004030]/8 text-[#004030] border-[#004030]/15 font-medium mb-2">
          Old Regime Only
        </Badge>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🏠</span>
          <h2 className="text-[15px] md:text-base font-semibold text-[#003F31]">
            HRA — House Rent Allowance
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mb-5">
          HRA exemption is the <strong>lowest</strong> of three rules. Applies only if you live in rented accommodation.
        </p>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5 mb-6">

          {/* City type */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">
              City Type
            </Label>
            <ToggleGroup
              value={hraInput.cityType}
              onValueChange={v => v && update({ cityType: v as CityType })}
              className="w-full"
            >
              <ToggleGroupItem value="metro" className="py-2.5 text-sm font-semibold">
                🌆 Metro
              </ToggleGroupItem>
              <ToggleGroupItem value="non-metro" className="py-2.5 text-sm font-semibold">
                🏙️ Non-Metro
              </ToggleGroupItem>
            </ToggleGroup>
            <p className="text-xs text-muted-foreground mt-2">
              {hraInput.cityType === 'metro'
                ? `Metro cities (${METRO_CITIES.join(', ')}) → 50% of basic`
                : 'All other cities → 40% of basic'}
            </p>
          </div>

          {/* Annual rent paid */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">
              Annual Rent Paid
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold pointer-events-none">₹</span>
              <Input
                type="number"
                min={0}
                placeholder="e.g. 240000"
                value={hraInput.rentPaid === 0 ? '' : hraInput.rentPaid}
                onChange={e => update({ rentPaid: parseFloat(e.target.value) || 0 })}
                className="pl-8 h-auto py-2 text-sm font-medium"
              />
            </div>
            {hraInput.rentPaid > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {fmt(Math.round(hraInput.rentPaid / 12))}/month
              </p>
            )}
          </div>

          {/* Basic salary */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">
              Annual Basic Salary
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold pointer-events-none">₹</span>
              <Input
                type="number"
                min={0}
                placeholder="e.g. 600000"
                value={hraInput.basicSalary === 0 ? '' : hraInput.basicSalary}
                onChange={e => update({ basicSalary: parseFloat(e.target.value) || 0 })}
                className="pl-8 h-auto py-2 text-sm font-medium"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Usually 40–50% of gross CTC</p>
          </div>

          {/* HRA received from employer */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">
              HRA Received from Employer
              <span className="ml-1 font-normal normal-case text-muted-foreground">(optional)</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold pointer-events-none">₹</span>
              <Input
                type="number"
                min={0}
                placeholder="Leave blank → 40% of basic used"
                value={hraInput.hraReceived === 0 ? '' : hraInput.hraReceived}
                onChange={e => update({ hraReceived: parseFloat(e.target.value) || 0 })}
                className="pl-8 h-auto py-3 text-sm font-medium placeholder:text-xs"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Check your payslip or Form 16</p>
          </div>
        </div>

        {/* HRA exemption result */}
        {hasData && (
          <div className="bg-muted/40 border border-border rounded-xl p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
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

            <div className="flex items-center justify-between bg-[#004030]/8 border border-[#004030]/15 rounded-lg px-4 py-3">
              <div>
                <p className="text-xs text-[#004030] font-semibold uppercase tracking-wider">HRA Exempt</p>
                <p className="text-xs text-[#004030]/60 mt-0.5">Minimum of (a), (b), (c)</p>
              </div>
              <p className="text-[22px] md:text-2xl font-bold text-[#004030]">{fmt(exemption)}</p>
            </div>

            {exemption === 0 && (
              <p className="text-xs text-[#004030] mt-3 bg-[#004030]/5 border border-[#004030]/15 rounded-lg px-3 py-2">
                ⚠️ Rent paid is less than 10% of basic salary — no HRA exemption applies.
              </p>
            )}
          </div>
        )}

        {!hasData && (
          <div className="text-center py-5 text-muted-foreground text-sm">
            Fill in basic salary and rent paid above to see your HRA exemption.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RuleRow({
  label, value, isLimiting, note,
}: { label: string; value: number; isLimiting: boolean | null; note?: string }) {
  return (
    <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-all ${
      isLimiting
        ? 'bg-[#004030]/8 border border-[#004030]/15'
        : 'bg-card border border-border'
    }`}>
      <div>
        <span className={`font-medium ${isLimiting ? 'text-[#004030]' : 'text-muted-foreground'}`}>{label}</span>
        {note && <span className="text-xs text-muted-foreground ml-2">({note})</span>}
        {isLimiting && (
          <span className="ml-2 text-xs bg-[#004030] text-white px-1.5 py-0.5 rounded font-semibold">
            Limiting factor
          </span>
        )}
      </div>
      <span className={`font-bold ml-4 shrink-0 ${isLimiting ? 'text-[#004030]' : 'text-[#003F31]'}`}>
        {fmt(value)}
      </span>
    </div>
  );
}
