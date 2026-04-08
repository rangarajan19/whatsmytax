import type { RegimeResult } from '../tax';
import { fmt, pct } from '../tax';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';

export interface RegimeBreakdownProps {
  regime: 'old' | 'new';
  label: string;
  result: RegimeResult;
  isHigher: boolean;
  gross: number;
  epf: number;
  isFreelance?: boolean;
}

const ACCENT = {
  old: { title: 'text-[#004030]', total: 'text-[#004030]', border: 'border-[#004030]/15' },
  new: { title: 'text-[#004030]', total: 'text-[#004030]', border: 'border-[#004030]/15' },
};

function surchargeRate(income: number, regime: 'old' | 'new'): number {
  if (income > 50_000_000) return regime === 'new' ? 25 : 37;
  if (income > 20_000_000) return 25;
  if (income > 10_000_000) return 15;
  if (income > 5_000_000)  return 10;
  return 0;
}

export function RegimeBreakdown({ regime, label, result, isHigher, gross, epf, isFreelance = false }: RegimeBreakdownProps) {
  const colors        = ACCENT[regime];
  const sRate         = surchargeRate(result.taxableIncome, regime);
  const monthlyInHand = Math.round(Math.max(0, gross - result.total - (isFreelance ? 0 : epf)) / 12);

  return (
    <>
      <p className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${isHigher ? 'text-[#C44A3A]' : colors.title}`}>
        {regime === 'old' ? 'Old Regime' : 'New Regime'}
        {sRate > 0 && (
          <Badge className="bg-[#004030]/5 text-[#004030] border-[#004030]/15 font-semibold normal-case tracking-normal">
            +{sRate}% Surcharge
          </Badge>
        )}
      </p>
      <h3 className="text-sm text-muted-foreground mb-4 mt-0.5">{label}</h3>

      <p className={`text-3xl sm:text-4xl font-bold mb-1 ${isHigher ? 'text-[#C44A3A]' : colors.total}`}>{fmt(result.total)}</p>
      <p className="text-sm text-muted-foreground mb-4">Effective rate: {pct(result.total, gross)}</p>

      {/* Monthly in-hand */}
      <div className="bg-muted/50 rounded-xl px-4 py-3 mb-5">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
          {isFreelance ? 'Monthly Est.' : 'Monthly In-Hand'}
        </p>
        <p className={`text-2xl font-bold ${isHigher ? 'text-[#C44A3A]' : colors.total}`}>{fmt(monthlyInHand)}</p>
        {!isFreelance && epf > 0 ? (
          <p className="text-xs text-muted-foreground mt-0.5">after tax + EPF ({fmt(Math.round(epf / 12))}/mo)</p>
        ) : (
          <p className="text-xs text-muted-foreground mt-0.5">after tax</p>
        )}
      </div>

      {/* Slab breakdown */}
      <div className="border-t border-border pt-4 space-y-1.5">
        {result.rows.map((row, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{row.range} @ {row.rate}</span>
            <span className="font-medium text-[#004030]">{fmt(row.tax)}</span>
          </div>
        ))}
      </div>

      {/* Deductions & computation */}
      <div className="border-t border-border mt-3 pt-3 space-y-1.5">
        <DeductionRow
          label="Std. Deductions"
          value={result.stdDeduction}
          tagLabel="Applied"
          tagClass={regime === 'old' ? 'bg-[#004030]/8 text-[#004030]' : 'bg-muted text-muted-foreground'}
          show
        />

        {regime === 'old' && (
          <>
            <DeductionRow label="Sec. 80C" value={result.deduction80C} tagLabel={result.deduction80C > 0 ? 'Applied' : 'None entered'} tagClass={result.deduction80C > 0 ? 'bg-[#004030]/8 text-[#004030]' : 'bg-muted text-muted-foreground'} show dimIfZero />
            <DeductionRow label="HRA Exemption" value={result.deductionHRA} tagLabel={result.deductionHRA > 0 ? 'Applied' : 'None entered'} tagClass={result.deductionHRA > 0 ? 'bg-[#004030]/8 text-[#004030]' : 'bg-muted text-muted-foreground'} show dimIfZero />
            <DeductionRow label="Sec. 80D" value={result.deduction80D} tagLabel={result.deduction80D > 0 ? 'Applied' : 'None entered'} tagClass={result.deduction80D > 0 ? 'bg-[#004030]/8 text-[#004030]' : 'bg-muted text-muted-foreground'} show dimIfZero />
            <DeductionRow label="NPS 80CCD(1B)" value={result.deductionNPS} tagLabel={result.deductionNPS > 0 ? 'Applied' : 'None entered'} tagClass={result.deductionNPS > 0 ? 'bg-[#004030]/8 text-[#004030]' : 'bg-muted text-muted-foreground'} show dimIfZero />
            <DeductionRow label="Home Loan Interest 24b" value={result.deductionHomeLoan} tagLabel={result.deductionHomeLoan > 0 ? 'Applied' : 'None entered'} tagClass={result.deductionHomeLoan > 0 ? 'bg-[#004030]/8 text-[#004030]' : 'bg-muted text-muted-foreground'} show dimIfZero />
            <DeductionRow label="Education Loan Interest 80E" value={result.deductionEducationLoan} tagLabel={result.deductionEducationLoan > 0 ? 'Applied' : 'None entered'} tagClass={result.deductionEducationLoan > 0 ? 'bg-[#004030]/8 text-[#004030]' : 'bg-muted text-muted-foreground'} show dimIfZero />
          </>
        )}

        {regime === 'new' && (
          <p className="text-xs text-muted-foreground italic">
            80C, HRA, 80D, NPS &amp; home loan deductions not applicable in New Regime
          </p>
        )}

        <DeductionRow label="Perquisite Allowances" value={result.deductionPerquisites} tagLabel={result.deductionPerquisites > 0 ? 'Applied · Both Regimes' : 'None entered'} tagClass={result.deductionPerquisites > 0 ? 'bg-[#004030]/8 text-[#004030]' : 'bg-muted text-muted-foreground'} show dimIfZero />

        {result.otherIncomeAdded > 0 && (
          <div className="flex justify-between text-sm items-center">
            <span className="text-muted-foreground flex items-center gap-1 flex-wrap">
              Other Income
              <span className="text-xs px-1.5 py-0.5 rounded font-semibold bg-[#004030]/6 text-[#004030]">Added</span>
            </span>
            <span className="shrink-0 ml-2 font-semibold text-[#004030]">+ {fmt(result.otherIncomeAdded)}</span>
          </div>
        )}
        {result.specialTax > 0 && (
          <div className="flex justify-between text-sm items-center">
            <span className="text-muted-foreground flex items-center gap-1 flex-wrap">
              Capital Gains Tax
              <span className="text-xs px-1.5 py-0.5 rounded font-semibold bg-[#004030]/6 text-[#004030]">Flat rate</span>
            </span>
            <span className="shrink-0 ml-2 font-semibold text-[#004030]">+ {fmt(result.specialTax)}</span>
          </div>
        )}

        <div className="flex justify-between text-sm pt-1">
          <span className="text-muted-foreground">Taxable Income</span>
          <span className="font-semibold text-[#004030]">{fmt(result.taxableIncome)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Base Tax</span>
          <span className="text-[#004030]">{fmt(result.baseTax)}</span>
        </div>
        {result.rebate > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Rebate u/s 87A</span>
            <span className="text-[#004030]">− {fmt(result.rebate)}</span>
          </div>
        )}
        {result.surcharge > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Surcharge ({sRate}%)</span>
            <span className="text-[#004030]">{fmt(result.surcharge)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Health &amp; Ed. Cess (4%)</span>
          <span className="text-[#004030]">{fmt(result.cess)}</span>
        </div>

        <div className={`flex justify-between text-sm font-bold border-t border-border pt-2 mt-1 ${isHigher ? 'text-[#C44A3A]' : colors.total}`}>
          <span className="text-[#004030]">Total Tax</span>
          <span>{fmt(result.total)}</span>
        </div>
      </div>
    </>
  );
}

export default function RegimeCard({ regime, label, result, isHigher, gross, epf }: RegimeBreakdownProps) {
  const colors = ACCENT[regime];
  return (
    <Card className={`relative ${isHigher ? 'border-2 border-[#C44A3A]/40 bg-[#C44A3A]/5' : `border-2 ${colors.border}`}`}>
      <CardContent className="p-6">
        {isHigher && (
          <Badge className="absolute top-4 right-4 bg-[#C44A3A] text-white border-[#C44A3A] font-bold tracking-wide">
            HIGHER TAX
          </Badge>
        )}
        <RegimeBreakdown regime={regime} label={label} result={result} isHigher={isHigher} gross={gross} epf={epf} />
      </CardContent>
    </Card>
  );
}

function DeductionRow({
  label, value, tagLabel, tagClass, show, dimIfZero = false,
}: {
  label: string;
  value: number;
  tagLabel: string;
  tagClass: string;
  show: boolean;
  dimIfZero?: boolean;
}) {
  if (!show) return null;
  const isZero = value === 0;
  return (
    <div className={`flex justify-between text-sm items-center ${dimIfZero && isZero ? 'opacity-40' : ''}`}>
      <span className="text-muted-foreground flex items-center gap-1 flex-wrap">
        {label}
        <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${tagClass}`}>{tagLabel}</span>
      </span>
      <span className={`shrink-0 ml-2 ${isZero ? 'text-muted-foreground' : 'font-semibold text-[#004030]'}`}>
        {isZero ? '---' : `- ${fmt(value)}`}
      </span>
    </div>
  );
}
