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
import { Badge } from './ui/badge';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

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
        <Badge className="bg-[#004030]/8 text-[#004030] border-[#004030]/15 font-medium text-xs">
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
            <Badge className="bg-[#004030]/8 text-[#004030] border-[#004030]/15 font-medium mb-2">
              Both Regimes
            </Badge>
            <h2 className="text-[15px] md:text-base font-semibold text-[#003F31]">
              Perquisite Allowances
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Employer-provided perquisites under Rule 3, Sec. 17(2) — not Chapter VI-A, so applicable in both regimes.
            </p>
          </div>
          {bd.totalExempt > 0 && (
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">Net exempt deduction</p>
              <p className="text-sm font-bold text-[#004030]">{fmt(bd.totalExempt)}</p>
              {bd.totalTaxable > 0 && (
                <p className="text-xs text-red-500">{fmt(bd.totalTaxable)} stays taxable</p>
              )}
            </div>
          )}
        </div>

        {/* How it works — accordion */}
        <Accordion type="single" collapsible className="mb-4">
          <AccordionItem value="how" className="border border-[#004030]/15 rounded-xl px-4 overflow-hidden">
            <AccordionTrigger className="text-xs font-semibold text-[#004030]/60 hover:text-[#004030] hover:no-underline py-3">
              How this works
            </AccordionTrigger>
            <AccordionContent className="text-xs text-[#004030]/70 leading-relaxed pb-3">
              Your employer bears the actual cost of these perquisites. Only a small <em>fixed perquisite value</em> (set by IT Rules) is added to your taxable income — the rest is your employer's business expense, saving you significant tax in both regimes.
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="space-y-6">

          {/* ── Telephone / Internet ── */}
          <div className="border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">📱</span>
              <div>
                <p className="text-sm font-semibold text-[#003F31]">Telephone / Internet Reimbursement</p>
                <p className="text-xs text-muted-foreground">Mobile phone &amp; internet bills paid/reimbursed by employer</p>
              </div>
            </div>

            <div className="relative mt-3">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold pointer-events-none">₹</span>
              <Input
                type="number" min={0} placeholder="0"
                value={values.telephoneInternet === 0 ? '' : values.telephoneInternet}
                onChange={e => handleAmount('telephoneInternet', e.target.value)}
                className="pl-7 h-auto py-2 text-sm font-medium focus-visible:ring-[#004030]/40"
              />
            </div>
            {bd.telephoneExempt > 0 && (
              <TaxBreakdownPill taxable={0} exempt={bd.telephoneExempt} />
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Rule 3(7)(ix) — NIL perquisite value. The full cost is exempt from tax.
            </p>
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

            <div className="relative mb-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold pointer-events-none">₹</span>
              <Input
                type="number" min={0} placeholder="0"
                value={values.petrolAllowance === 0 ? '' : values.petrolAllowance}
                onChange={e => handleAmount('petrolAllowance', e.target.value)}
                className="pl-7 h-auto py-2 text-sm font-medium focus-visible:ring-[#004030]/40"
              />
            </div>
            {values.petrolAllowance > 0 && (
              <TaxBreakdownPill taxable={bd.petrolTaxable} exempt={bd.petrolExempt} />
            )}

            {/* Car engine size toggle */}
            <div className="mt-3">
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Car Engine Capacity</p>
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

            <p className="text-xs text-muted-foreground mt-2">
              Rule 3(2) — Only ₹{((values.carEngineSize === 'large' ? CAR_PERQUISITE_LARGE : CAR_PERQUISITE_SMALL) / 12).toLocaleString('en-IN')}/month is taxable regardless of actual spend.
            </p>
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

            <div className="relative mb-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold pointer-events-none">₹</span>
              <Input
                type="number" min={0} placeholder="0"
                value={values.driverSalary === 0 ? '' : values.driverSalary}
                onChange={e => handleAmount('driverSalary', e.target.value)}
                className="pl-7 h-auto py-2 text-sm font-medium focus-visible:ring-[#004030]/40"
              />
            </div>
            {values.driverSalary > 0 && (
              <TaxBreakdownPill taxable={bd.driverTaxable} exempt={bd.driverExempt} />
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Rule 3(2) — Only ₹900/month (₹{(DRIVER_PERQUISITE / 1000).toFixed(1)}K/year) is taxable regardless of actual salary paid.
            </p>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
