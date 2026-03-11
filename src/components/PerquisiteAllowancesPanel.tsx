import type { PerquisiteAllowances, CarEngineSize } from '../tax';
import {
  fmt,
  perquisiteBreakdown,
  CAR_PERQUISITE_SMALL,
  CAR_PERQUISITE_LARGE,
  DRIVER_PERQUISITE,
} from '../tax';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';

interface Props {
  values: PerquisiteAllowances;
  onChange: (updated: PerquisiteAllowances) => void;
}

function TaxBreakdownPill({ taxable, exempt }: { taxable: number; exempt: number }) {
  if (taxable === 0 && exempt === 0) return null;
  return (
    <div className="flex gap-2 mt-1.5 flex-wrap">
      {taxable > 0 && (
        <Badge className="bg-red-50 text-red-600 border-red-100 font-medium text-xs">
          ₹{(taxable / 1000).toFixed(1)}K/yr taxable
        </Badge>
      )}
      {exempt > 0 && (
        <Badge className="bg-teal-50 text-teal-700 border-teal-100 font-medium text-xs">
          ₹{(exempt / 1000).toFixed(1)}K/yr exempt
        </Badge>
      )}
    </div>
  );
}

export default function PerquisiteAllowancesPanel({ values, onChange }: Props) {
  const bd = perquisiteBreakdown(values);

  function setField<K extends keyof PerquisiteAllowances>(key: K, val: PerquisiteAllowances[K]) {
    onChange({ ...values, [key]: val });
  }

  function handleAmount(key: 'telephoneInternet' | 'petrolAllowance' | 'driverSalary', raw: string) {
    const v = Math.max(0, parseFloat(raw.replace(/,/g, '')) || 0);
    setField(key, v);
  }

  return (
    <Card className="mb-7">
      <CardContent className="p-4 sm:p-7">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
          <div>
            <Badge className="bg-teal-100 text-teal-700 border-teal-200 font-medium mb-2">
              Both Regimes
            </Badge>
            <h2 className="text-base font-semibold text-[#003F31]">
              Perquisite Allowances
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Employer-provided perquisites under Rule 3, Sec. 17(2) — not Chapter VI-A, so applicable in both regimes.
            </p>
          </div>
          {bd.totalExempt > 0 && (
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">Net exempt deduction</p>
              <p className="text-sm font-bold text-teal-700">{fmt(bd.totalExempt)}</p>
              {bd.totalTaxable > 0 && (
                <p className="text-xs text-red-500">{fmt(bd.totalTaxable)} stays taxable</p>
              )}
            </div>
          )}
        </div>

        {/* How it works callout */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-800 mb-6 leading-relaxed">
          <strong>How this works:</strong> Your employer bears the actual cost of these perquisites.
          Only a small <em>fixed perquisite value</em> (set by IT Rules) is added to your taxable income —
          the rest is your employer's business expense, saving you significant tax in both regimes.
        </div>

        <div className="space-y-6">

          {/* ── Telephone / Internet ── */}
          <div className="border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📱</span>
              <div>
                <p className="text-sm font-semibold text-[#003F31]">Telephone / Internet Reimbursement</p>
                <p className="text-xs text-muted-foreground">Mobile phone &amp; internet bills paid/reimbursed by employer</p>
              </div>
              <Badge className="ml-auto bg-teal-100 text-teal-700 border-teal-200 font-semibold shrink-0">
                NIL perquisite
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  Annual amount in CTC
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold pointer-events-none">₹</span>
                  <Input
                    type="number" min={0} placeholder="0"
                    value={values.telephoneInternet === 0 ? '' : values.telephoneInternet}
                    onChange={e => handleAmount('telephoneInternet', e.target.value)}
                    className="pl-7 h-auto py-2.5 text-sm font-medium focus-visible:ring-teal-400"
                  />
                </div>
                {bd.telephoneExempt > 0 && (
                  <TaxBreakdownPill taxable={0} exempt={bd.telephoneExempt} />
                )}
              </div>
              <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
                <p className="font-semibold text-teal-700 mb-1">Rule 3(7)(ix)</p>
                Telephone/mobile provided by employer = <strong>NIL perquisite value</strong>.
                The full cost is exempt — 100% of what your employer pays is tax-free.
              </div>
            </div>
          </div>

          {/* ── Petrol / Fuel ── */}
          <div className="border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">⛽</span>
              <div>
                <p className="text-sm font-semibold text-[#003F31]">Petrol / Fuel Allowance</p>
                <p className="text-xs text-muted-foreground">Fuel cost for employer-owned or leased car (mixed official + personal use)</p>
              </div>
            </div>

            {/* Car engine size toggle */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Car Engine Capacity</p>
              <ToggleGroup
                value={values.carEngineSize}
                onValueChange={v => v && setField('carEngineSize', v as CarEngineSize)}
                className="w-full"
              >
                <ToggleGroupItem value="small" className="flex-col py-2 px-3 h-auto text-xs font-semibold">
                  <span>≤ 1600cc</span>
                  <span className="font-normal opacity-70">₹{(CAR_PERQUISITE_SMALL / 1000).toFixed(1)}K/yr taxable</span>
                </ToggleGroupItem>
                <ToggleGroupItem value="large" className="flex-col py-2 px-3 h-auto text-xs font-semibold">
                  <span>&gt; 1600cc</span>
                  <span className="font-normal opacity-70">₹{(CAR_PERQUISITE_LARGE / 1000).toFixed(1)}K/yr taxable</span>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  Annual petrol/fuel cost in CTC
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold pointer-events-none">₹</span>
                  <Input
                    type="number" min={0} placeholder="0"
                    value={values.petrolAllowance === 0 ? '' : values.petrolAllowance}
                    onChange={e => handleAmount('petrolAllowance', e.target.value)}
                    className="pl-7 h-auto py-2.5 text-sm font-medium focus-visible:ring-teal-400"
                  />
                </div>
                {values.petrolAllowance > 0 && (
                  <TaxBreakdownPill taxable={bd.petrolTaxable} exempt={bd.petrolExempt} />
                )}
              </div>
              <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
                <p className="font-semibold text-[#003F31] mb-1">Rule 3(2) — Fixed perquisite</p>
                Only{' '}
                <strong className="text-red-600">
                  ₹{((values.carEngineSize === 'large' ? CAR_PERQUISITE_LARGE : CAR_PERQUISITE_SMALL) / 12).toLocaleString('en-IN')}/month
                </strong>{' '}
                is taxable regardless of actual spend. Everything above that is your employer's business expense — fully exempt for you.
              </div>
            </div>
          </div>

          {/* ── Driver Salary ── */}
          <div className="border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🚗</span>
              <div>
                <p className="text-sm font-semibold text-[#003F31]">Driver Salary</p>
                <p className="text-xs text-muted-foreground">Salary paid to driver for employer-provided car</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  Annual driver salary in CTC
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold pointer-events-none">₹</span>
                  <Input
                    type="number" min={0} placeholder="0"
                    value={values.driverSalary === 0 ? '' : values.driverSalary}
                    onChange={e => handleAmount('driverSalary', e.target.value)}
                    className="pl-7 h-auto py-2.5 text-sm font-medium focus-visible:ring-teal-400"
                  />
                </div>
                {values.driverSalary > 0 && (
                  <TaxBreakdownPill taxable={bd.driverTaxable} exempt={bd.driverExempt} />
                )}
              </div>
              <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
                <p className="font-semibold text-[#003F31] mb-1">Rule 3(2) — Fixed perquisite</p>
                Only <strong className="text-red-600">₹900/month (₹{(DRIVER_PERQUISITE / 1000).toFixed(1)}K/year)</strong> is
                taxable. If your employer pays ₹5,000/month for your driver,
                only ₹900 gets added to your taxable income — saving you significant tax.
              </div>
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
