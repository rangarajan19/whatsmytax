import type { HomeLoanInterestInput } from '../tax';
import { calcHomeLoanInterestDeduction, MAX_HOME_LOAN_INTEREST, fmt } from '../tax';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';

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
    <Card className="mb-7">
      <CardContent className="p-7">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🏡</span>
          <h2 className="text-base font-semibold text-[#003F31] flex items-center flex-wrap gap-2">
            Section 24b — Home Loan Interest
            <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 font-medium">
              Old Regime Only
            </Badge>
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mb-6">
          Interest paid on home loan. Self-occupied property: capped at ₹2,00,000 per year.
          Let-out property: full interest is deductible (no cap).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">

          {/* Left: inputs */}
          <div className="space-y-4">
            {/* Property type toggle */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">
                Property Type
              </Label>
              <ToggleGroup
                value={value.isSelfOccupied ? 'self' : 'letout'}
                onValueChange={v => v && update({ isSelfOccupied: v === 'self' })}
                className="w-full"
              >
                <ToggleGroupItem value="self" className="flex-col py-2.5 px-3 h-auto text-sm font-semibold">
                  <span>🏠 Self-Occupied</span>
                  <span className="text-xs font-normal opacity-70">Cap: {fmt(MAX_HOME_LOAN_INTEREST)}</span>
                </ToggleGroupItem>
                <ToggleGroupItem value="letout" className="flex-col py-2.5 px-3 h-auto text-sm font-semibold">
                  <span>🏘️ Let-Out</span>
                  <span className="text-xs font-normal opacity-70">No cap</span>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Interest input */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">
                Annual Interest Paid <span className="font-normal normal-case">(per year)</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold pointer-events-none">₹</span>
                <Input
                  type="number"
                  min={0}
                  placeholder="e.g. 180000"
                  value={value.interestPaid === 0 ? '' : value.interestPaid}
                  onChange={e => update({ interestPaid: parseFloat(e.target.value) || 0 })}
                  className="pl-8 h-auto py-3 text-sm font-medium rounded-xl"
                />
              </div>
              {value.interestPaid > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
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
          <div className="bg-muted/40 border border-border rounded-xl p-5 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              Deduction Summary
            </p>
            <SummaryRow label="Interest paid"       value={value.interestPaid > 0 ? fmt(value.interestPaid) : '—'} />
            <SummaryRow label="Property type"       value={value.isSelfOccupied ? 'Self-Occupied' : 'Let-Out'} />
            <SummaryRow label="Applicable limit"    value={value.isSelfOccupied ? fmt(MAX_HOME_LOAN_INTEREST) : 'No limit'} />
            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Deduction Applied</p>
                <p className="text-xl font-bold text-emerald-700">{deduction > 0 ? fmt(deduction) : '—'}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              💡 Check your bank's annual interest certificate (Form 16B or loan statement) for the exact interest paid.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-[#003F31]">{value}</span>
    </div>
  );
}
