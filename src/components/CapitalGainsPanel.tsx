import type { OtherIncome, OtherIncomeResult } from '../tax';
import { LTCG_EQUITY_EXEMPTION, fmt } from '../tax';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';

interface Props {
  value: OtherIncome;
  result: OtherIncomeResult;
  onChange: (updated: OtherIncome) => void;
}

export default function CapitalGainsPanel({ value, result, onChange }: Props) {
  function update(patch: Partial<OtherIncome>) {
    onChange({ ...value, ...patch });
  }

  const hasAny = value.ltcgEquity > 0 || value.stcgEquity > 0
    || value.ltcgOther > 0 || value.stcgOther > 0;

  return (
    <Card className="mb-7">
      <CardContent className="p-4 sm:p-7">
        <Badge className="bg-orange-100 text-orange-700 border-orange-200 font-medium mb-2">
          Both Regimes
        </Badge>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">📊</span>
          <h2 className="text-base font-semibold text-[#003F31]">Capital Gains</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-1">
          Capital gains are taxed separately from your salary income — either at flat rates or at slab rates depending on the asset type.
        </p>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-6">
          Rules updated per Finance Act 2024 (Budget July 2024). Cess of 4% applies on top of flat-rate taxes.
        </p>

        <div className="space-y-5">

          {/* LTCG Equity */}
          <GainsRow
            icon="📈"
            label="LTCG — Listed Equity / Equity MFs"
            sublabel="Held more than 12 months"
            value={value.ltcgEquity}
            onChange={v => update({ ltcgEquity: v })}
            taxable={result.taxableLTCG}
            deduction={result.ltcgExemption}
            specialTax={result.ltcgTax}
            info={`First ${fmt(LTCG_EQUITY_EXEMPTION)}/year is exempt (post Budget 2024). Gains above that taxed at flat 12.5%.`}
            rateLabel="12.5% flat"
            isFlat
          />

          {/* STCG Equity */}
          <GainsRow
            icon="⚡"
            label="STCG — Listed Equity / Equity MFs"
            sublabel="Held 12 months or less"
            value={value.stcgEquity}
            onChange={v => update({ stcgEquity: v })}
            taxable={value.stcgEquity}
            deduction={0}
            specialTax={result.stcgTax}
            info="Taxed at flat 20% regardless of your income slab (post Budget 2024). No exemption limit."
            rateLabel="20% flat"
            isFlat
          />

          {/* LTCG Other */}
          <GainsRow
            icon="🏠"
            label="LTCG — Property / Gold / Unlisted"
            sublabel="Property held > 2 yrs · Gold/unlisted > 2 yrs"
            value={value.ltcgOther}
            onChange={v => update({ ltcgOther: v })}
            taxable={value.ltcgOther}
            deduction={0}
            specialTax={result.ltcgOtherTax}
            info="Taxed at flat 12.5% without indexation (post Budget 2024). If property was purchased before Jul 23, 2024, you may opt for 20% with indexation — use whichever is lower."
            rateLabel="12.5% flat"
            isFlat
          />

          {/* STCG Other */}
          <GainsRow
            icon="📋"
            label="STCG — Debt MFs / Property / Other"
            sublabel="Property held ≤ 2 yrs · Debt MFs (any period)"
            value={value.stcgOther}
            onChange={v => update({ stcgOther: v })}
            taxable={result.taxableStcgOther}
            deduction={0}
            specialTax={undefined}
            info="Added to your total income and taxed at your applicable slab rate. Debt MF gains are fully taxable at slab rate regardless of holding period (post Budget 2024)."
            rateLabel="Slab rate"
            isFlat={false}
          />
        </div>

        {/* Summary */}
        {hasAny && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {result.totalSpecialTax > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider mb-1">
                  Capital gains flat tax
                </p>
                <p className="text-xl font-bold text-orange-800">{fmt(result.totalSpecialTax)}</p>
                <p className="text-xs text-orange-500 mt-0.5">Outside slabs (+ 4% cess added later)</p>
              </div>
            )}
            {result.taxableStcgOther > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-1">
                  Added to slab income
                </p>
                <p className="text-xl font-bold text-purple-800">{fmt(result.taxableStcgOther)}</p>
                <p className="text-xs text-purple-500 mt-0.5">STCG Other — taxed at your slab rate</p>
              </div>
            )}
          </div>
        )}

        {!hasAny && (
          <p className="text-center text-xs text-muted-foreground mt-4">
            Enter any capital gains above to see how they affect your tax.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Row component ──────────────────────────────────────────────────────────

interface RowProps {
  icon: string;
  label: string;
  sublabel: string;
  value: number;
  onChange: (v: number) => void;
  taxable: number;
  deduction: number;
  specialTax?: number;
  info: string;
  rateLabel: string;
  isFlat: boolean;
}

function GainsRow({
  icon, label, sublabel, value, onChange, taxable, deduction,
  specialTax, info, rateLabel, isFlat,
}: RowProps) {
  const hasValue = value > 0;

  return (
    <div className={`rounded-xl border p-4 transition-all ${
      hasValue ? 'border-orange-200 bg-orange-50/30' : 'border-border bg-muted/20'
    }`}>
      <div className="flex items-center justify-between mb-1.5">
        <Label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <span>{icon}</span>
          <span>{label}</span>
        </Label>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          isFlat
            ? 'bg-orange-100 text-orange-700'
            : 'bg-purple-100 text-purple-700'
        }`}>{rateLabel}</span>
      </div>
      <p className="text-xs text-muted-foreground mb-2">{sublabel}</p>
      <div className="relative mb-2">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm pointer-events-none">₹</span>
        <Input
          type="number"
          min={0}
          placeholder="0"
          value={value === 0 ? '' : value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="pl-7 h-auto py-2.5 text-sm font-medium focus-visible:ring-orange-400"
        />
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{info}</p>

      {hasValue && (
        <div className="flex flex-wrap gap-1.5 text-xs mt-3">
          {deduction > 0 && (
            <Chip label="Exemption" value={`− ${fmt(deduction)}`} color="green" />
          )}
          {isFlat && specialTax !== undefined && (
            <Chip
              label="Flat tax"
              value={specialTax > 0 ? fmt(specialTax) : '₹0 (within exemption)'}
              color={specialTax > 0 ? 'orange' : 'gray'}
            />
          )}
          {!isFlat && taxable > 0 && (
            <Chip label="Taxable at slab" value={fmt(taxable)} color="purple" />
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ label, value, color }: { label: string; value: string; color: 'green' | 'purple' | 'orange' | 'gray' }) {
  const colors = {
    green:  'bg-emerald-100 text-emerald-700 border-emerald-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
    orange: 'bg-orange-100 text-orange-700 border-orange-200',
    gray:   'bg-gray-100 text-gray-500 border-gray-200',
  };
  return (
    <div className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 ${colors[color]}`}>
      <span className="font-semibold">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
