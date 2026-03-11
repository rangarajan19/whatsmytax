import type { OtherIncome, OtherIncomeResult } from '../tax';
import {
  MAX_80TTA, MAX_80TTB,
  FD_TDS_THRESHOLD, FD_TDS_THRESHOLD_SENIOR,
  DIVIDEND_TDS_THRESHOLD,
  LTCG_EQUITY_EXEMPTION,
  fmt,
} from '../tax';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';

interface Props {
  value: OtherIncome;
  result: OtherIncomeResult;
  onChange: (updated: OtherIncome) => void;
}

export default function OtherIncomePanel({ value, result, onChange }: Props) {
  function update(patch: Partial<OtherIncome>) {
    onChange({ ...value, ...patch });
  }

  const hasAny = value.savingsInterest > 0 || value.fdInterest > 0
    || value.dividends > 0 || value.rentalIncome > 0
    || value.ltcgEquity > 0 || value.stcgEquity > 0;

  return (
    <Card className="mb-7">
      <CardContent className="p-4 sm:p-7">
        {/* Header */}
        <Badge className="bg-purple-100 text-purple-700 border-purple-200 font-medium mb-2">
          Both Regimes
        </Badge>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">💹</span>
          <h2 className="text-base font-semibold text-[#003F31]">
            Other Income Sources
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mb-6">
          Income beyond your salary. These are added to your taxable income and taxed at your applicable slab rate,
          unless a special flat rate applies (capital gains).
        </p>

        {/* Senior citizen toggle */}
        <div className="flex items-center gap-3 mb-6 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <Switch
            checked={value.isSenior}
            onCheckedChange={(checked) => update({ isSenior: checked })}
            className="data-checked:bg-amber-500"
          />
          <div>
            <p className="text-xs font-semibold text-amber-800">
              I am a senior citizen (60+)
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              {value.isSenior
                ? `80TTB applies — combined savings + FD interest deduction up to ${fmt(MAX_80TTB)}`
                : `80TTA applies — savings account interest deduction up to ${fmt(MAX_80TTA)}`}
            </p>
          </div>
        </div>

        <div className="space-y-5">

          {/* Savings account interest */}
          <IncomeRow
            icon="🏦"
            label="Savings Account Interest"
            value={value.savingsInterest}
            onChange={v => update({ savingsInterest: v })}
            taxable={result.taxableSavingsInterest}
            deduction={result.savingsDeduction}
            info={value.isSenior
              ? `Covered under 80TTB (combined with FD interest, max ${fmt(MAX_80TTB)})`
              : `80TTA deduction up to ${fmt(MAX_80TTA)} — interest above ${fmt(MAX_80TTA)}/year is taxable at slab rate`}
            threshold={value.isSenior ? undefined : MAX_80TTA}
            tdsNote={undefined}
          />

          {/* FD / RD interest */}
          <IncomeRow
            icon="📈"
            label="FD / RD / Bond Interest"
            value={value.fdInterest}
            onChange={v => update({ fdInterest: v })}
            taxable={result.taxableFDInterest}
            deduction={value.isSenior ? result.fdInterest - result.taxableFDInterest : 0}
            info={value.isSenior
              ? `Covered under 80TTB (combined with savings interest, max ${fmt(MAX_80TTB)})`
              : `Fully taxable at slab rate. Bank deducts TDS if interest exceeds ${fmt(FD_TDS_THRESHOLD)}/year per bank`}
            threshold={value.isSenior ? undefined : FD_TDS_THRESHOLD}
            tdsNote={value.fdInterest > (value.isSenior ? FD_TDS_THRESHOLD_SENIOR : FD_TDS_THRESHOLD)
              ? `TDS likely deducted by bank at 10% — claim credit in ITR`
              : undefined}
          />

          {/* Dividends */}
          <IncomeRow
            icon="💰"
            label="Dividend Income"
            value={value.dividends}
            onChange={v => update({ dividends: v })}
            taxable={result.taxableDividends}
            deduction={0}
            info={`Fully taxable at your slab rate. Company deducts TDS if dividends exceed ${fmt(DIVIDEND_TDS_THRESHOLD)}/year per company`}
            threshold={DIVIDEND_TDS_THRESHOLD}
            tdsNote={value.dividends > DIVIDEND_TDS_THRESHOLD
              ? `TDS likely deducted at 10% — claim credit in ITR`
              : undefined}
          />

          {/* Rental income */}
          <IncomeRow
            icon="🏘️"
            label="Rental Income (Gross Annual)"
            value={value.rentalIncome}
            onChange={v => update({ rentalIncome: v })}
            taxable={result.taxableRental}
            deduction={result.rentalDeduction}
            info={`30% standard deduction allowed on net annual value. Only ${fmt(result.taxableRental > 0 ? result.taxableRental : 0)} is added to taxable income`}
            threshold={undefined}
            tdsNote={undefined}
          />

          {/* LTCG */}
          <IncomeRow
            icon="📊"
            label="LTCG — Listed Equity / Equity MFs"
            value={value.ltcgEquity}
            onChange={v => update({ ltcgEquity: v })}
            taxable={result.taxableLTCG}
            deduction={result.ltcgExemption}
            specialTax={result.ltcgTax}
            info={`First ${fmt(LTCG_EQUITY_EXEMPTION)}/year is exempt. Gains above that taxed at flat 12.5% — does NOT go through income slabs`}
            threshold={LTCG_EQUITY_EXEMPTION}
            tdsNote={undefined}
            isSpecial
          />

          {/* STCG */}
          <IncomeRow
            icon="⚡"
            label="STCG — Listed Equity / Equity MFs"
            value={value.stcgEquity}
            onChange={v => update({ stcgEquity: v })}
            taxable={value.stcgEquity}
            deduction={0}
            specialTax={result.stcgTax}
            info={`Taxed at flat 20% regardless of your income slab (post Budget 2024) — does NOT go through income slabs`}
            threshold={undefined}
            tdsNote={undefined}
            isSpecial
          />
        </div>

        {/* Summary */}
        {hasAny && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-1">
                Added to slab income
              </p>
              <p className="text-xl font-bold text-purple-800">{fmt(result.totalAddedToIncome)}</p>
              <p className="text-xs text-purple-500 mt-0.5">Taxed at your applicable slab rate</p>
            </div>
            {result.totalSpecialTax > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider mb-1">
                  Capital gains flat tax
                </p>
                <p className="text-xl font-bold text-orange-800">{fmt(result.totalSpecialTax)}</p>
                <p className="text-xs text-orange-500 mt-0.5">LTCG @ 12.5% + STCG @ 20% (+ 4% cess)</p>
              </div>
            )}
          </div>
        )}

        {!hasAny && (
          <p className="text-center text-xs text-muted-foreground mt-4">
            Enter any income source above to see how it affects your tax.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Row component ─────────────────────────────────────────────────

interface RowProps {
  icon: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  taxable: number;
  deduction: number;
  specialTax?: number;
  info: string;
  threshold?: number;
  tdsNote?: string;
  isSpecial?: boolean;
}

function IncomeRow({
  icon, label, value, onChange, taxable, deduction, specialTax,
  info, threshold, tdsNote, isSpecial = false,
}: RowProps) {
  const isOverThreshold = threshold !== undefined && value > threshold;
  const hasValue = value > 0;

  return (
    <div className={`rounded-xl border p-4 transition-all ${
      hasValue ? 'border-purple-200 bg-purple-50/40' : 'border-border bg-muted/20'
    }`}>
      <div className="flex flex-wrap items-start gap-4">
        {/* Input */}
        <div className="flex-1 min-w-0">
          <Label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
            <span>{icon}</span>
            <span>{label}</span>
            {isSpecial && (
              <Badge className="bg-orange-100 text-orange-600 border-orange-200 ml-1">
                Flat rate
              </Badge>
            )}
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm pointer-events-none">₹</span>
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={value === 0 ? '' : value}
              onChange={e => onChange(parseFloat(e.target.value) || 0)}
              className="pl-7 h-auto py-2.5 text-sm font-medium focus-visible:ring-purple-400"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{info}</p>
          {tdsNote && (
            <p className="text-xs text-amber-700 mt-1 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              ⚠️ {tdsNote}
            </p>
          )}
        </div>

        {/* Breakdown chips */}
        {hasValue && (
          <div className="flex flex-col gap-1.5 text-xs shrink-0 min-w-36">
            {isOverThreshold && threshold !== undefined && !isSpecial && (
              <Chip
                label={`Over threshold`}
                value={`${fmt(value - threshold)} taxable`}
                color="amber"
              />
            )}
            {deduction > 0 && (
              <Chip label="Deduction" value={`− ${fmt(deduction)}`} color="green" />
            )}
            {!isSpecial && taxable >= 0 && (
              <Chip
                label="Taxable at slab"
                value={taxable > 0 ? fmt(taxable) : '₹0'}
                color={taxable > 0 ? 'purple' : 'gray'}
              />
            )}
            {isSpecial && specialTax !== undefined && (
              <Chip
                label="Flat tax"
                value={specialTax > 0 ? fmt(specialTax) : '₹0 (within exemption)'}
                color={specialTax > 0 ? 'orange' : 'gray'}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ label, value, color }: { label: string; value: string; color: 'green' | 'purple' | 'amber' | 'orange' | 'gray' }) {
  const colors = {
    green:  'bg-emerald-100 text-emerald-700 border-emerald-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
    amber:  'bg-amber-100 text-amber-700 border-amber-200',
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
