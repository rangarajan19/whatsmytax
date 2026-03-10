import type { Deductions80C, EPFInput } from '../tax';
import { total80C, MAX_80C, fmt, calcEPFContribution, epfBreakdown, EPF_RATE } from '../tax';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';

// ─── EPF sub-panel ────────────────────────────────────────────────

interface EPFPanelProps {
  epfInput: EPFInput;
  onEPFChange: (updated: EPFInput) => void;
}

export function EPFPanel({ epfInput, onEPFChange }: EPFPanelProps) {
  const bd = epfBreakdown(epfInput);
  const contribution = calcEPFContribution(epfInput);

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 mb-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🏦</span>
        <h3 className="text-sm font-semibold text-indigo-800">EPF — Employee Provident Fund</h3>
        <Badge className="ml-auto bg-indigo-200 text-indigo-700 border-indigo-300 text-xs font-semibold">
          Auto-calculated
        </Badge>
      </div>
      <p className="text-xs text-indigo-600 mb-4">
        Employee contributes {(EPF_RATE * 100).toFixed(0)}% of basic salary. Counts towards your 80C limit.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Basic Salary input */}
        <div>
          <Label className="text-xs font-semibold text-indigo-700 mb-1.5 block">
            Annual Basic Salary
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold pointer-events-none">₹</span>
            <Input
              type="number"
              min={0}
              placeholder="e.g. 600000"
              value={epfInput.basicSalary === 0 ? '' : epfInput.basicSalary}
              onChange={e => onEPFChange({
                ...epfInput,
                basicSalary: parseFloat(e.target.value) || 0,
                useCustomAmount: false,
              })}
              className="pl-7 h-auto py-2.5 text-sm font-medium bg-white border-indigo-200 focus-visible:ring-indigo-400"
            />
          </div>
          <p className="text-xs text-indigo-500 mt-1">
            Usually 40–50% of gross CTC
          </p>
        </div>

        {/* Auto-result or manual override */}
        <div>
          <Label className="text-xs font-semibold text-indigo-700 mb-1.5 block">
            Annual EPF Contribution
          </Label>

          {!epfInput.useCustomAmount ? (
            <>
              <div className="bg-white border border-indigo-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
                <span className="text-sm font-bold text-indigo-700">
                  {contribution > 0 ? fmt(contribution) : '—'}
                </span>
                {contribution > 0 && (
                  <span className="text-xs text-indigo-500">
                    {fmt(Math.round(contribution / 12))}/mo
                  </span>
                )}
              </div>
              {contribution > 0 && (
                <p className="text-xs text-indigo-500 mt-1">
                  {(EPF_RATE * 100).toFixed(0)}% × {fmt(epfInput.basicSalary)} annual basic
                  {bd.isCapped && (
                    <span className="text-amber-600 ml-1">
                      · Basic &gt; ₹15K/mo ceiling; EPF still auto-deducted
                    </span>
                  )}
                </p>
              )}
              <button
                className="text-xs text-indigo-600 underline mt-1.5 hover:text-indigo-800"
                onClick={() => onEPFChange({ ...epfInput, useCustomAmount: true, customAmount: contribution })}
              >
                Enter custom amount instead
              </button>
            </>
          ) : (
            <>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold pointer-events-none">₹</span>
                <Input
                  type="number"
                  min={0}
                  placeholder="Custom EPF amount"
                  value={epfInput.customAmount === 0 ? '' : epfInput.customAmount}
                  onChange={e => onEPFChange({ ...epfInput, customAmount: parseFloat(e.target.value) || 0 })}
                  className="pl-7 h-auto py-2.5 text-sm font-medium bg-white border-indigo-200 focus-visible:ring-indigo-400"
                />
              </div>
              <button
                className="text-xs text-indigo-600 underline mt-1.5 hover:text-indigo-800"
                onClick={() => onEPFChange({ ...epfInput, useCustomAmount: false, customAmount: 0 })}
              >
                ← Use auto-calculated (12% of basic)
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stat pills */}
      {contribution > 0 && (
        <div className="grid grid-cols-3 gap-3 mt-4">
          <Stat label="Monthly deduction" value={fmt(Math.round(bd.monthlyContrib))} />
          <Stat label="Annual contribution" value={fmt(bd.annualContrib)} />
          <Stat label="% of basic" value={`${bd.pctOfBasic.toFixed(1)}%`} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-indigo-100 rounded-lg p-3 text-center">
      <p className="text-xs text-indigo-400 mb-0.5">{label}</p>
      <p className="text-sm font-bold text-indigo-700">{value}</p>
    </div>
  );
}

// ─── 80C fields ───────────────────────────────────────────────────

interface Field {
  key: keyof Deductions80C;
  label: string;
  description: string;
  icon: string;
}

const FIELDS: Field[] = [
  { key: 'ppf',              label: 'PPF',                    description: 'Public Provident Fund',                          icon: '📒' },
  { key: 'elss',             label: 'ELSS Mutual Funds',      description: 'Tax-saving equity mutual funds',                 icon: '📈' },
  { key: 'lifeInsurance',    label: 'Life Insurance',         description: 'LIC or term plan premium',                       icon: '🛡️' },
  { key: 'nsc',              label: 'NSC',                    description: 'National Savings Certificate',                   icon: '📜' },
  { key: 'homeLoanPrincipal',label: 'Home Loan Principal',    description: 'Principal repayment only · interest goes in Sec. 24b below', icon: '🏠' },
  { key: 'tuitionFees',      label: 'Tuition Fees',           description: "Children's school/college fees",                 icon: '🎓' },
  { key: 'sukanya',          label: 'Sukanya Samriddhi',      description: 'SSY deposits for girl child',                    icon: '👧' },
  { key: 'nps',              label: 'NPS — within 80C',       description: 'NPS Tier I within ₹1.5L cap · extra ₹50K goes in Sec. 80CCD(1B) below', icon: '🏛️' },
];

// ─── Main panel ───────────────────────────────────────────────────

interface Props {
  epfInput: EPFInput;
  onEPFChange: (updated: EPFInput) => void;
  values: Deductions80C;
  onChange: (key: keyof Deductions80C, value: number) => void;
}

export default function DeductionsPanel({ epfInput, onEPFChange, values, onChange }: Props) {
  const total     = total80C(values);
  const effective = Math.min(total, MAX_80C);
  const overflow  = total > MAX_80C;
  const remaining = MAX_80C - effective;
  const fillPct   = Math.min((total / MAX_80C) * 100, 100);

  function handleChange(key: keyof Deductions80C, raw: string) {
    const val = parseFloat(raw.replace(/,/g, '')) || 0;
    onChange(key, Math.max(0, val));
  }

  return (
    <Card className="mb-7">
      <CardContent className="p-7">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base font-semibold text-[#003F31] flex items-center flex-wrap gap-2">
              Section 80C Investments
              <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 font-medium">
                Old Regime Only
              </Badge>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Max deduction: ₹1,50,000 combined across all instruments.
            </p>
          </div>

          {/* Progress pill */}
          <div className="text-right min-w-40">
            <p className="text-xs text-muted-foreground mb-1">
              {overflow
                ? <span className="text-amber-600 font-semibold">Capped at ₹1,50,000</span>
                : remaining > 0
                  ? <span>{fmt(remaining)} more to max</span>
                  : <span className="text-emerald-600 font-semibold">Fully utilised ✓</span>
              }
            </p>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${overflow ? 'bg-amber-500' : fillPct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                style={{ width: `${fillPct}%` }}
              />
            </div>
            <p className={`text-sm font-bold mt-1 ${overflow ? 'text-amber-600' : fillPct === 100 ? 'text-emerald-600' : 'text-indigo-600'}`}>
              {fmt(effective)}
              <span className="text-xs font-normal text-muted-foreground ml-1">/ ₹1,50,000</span>
            </p>
          </div>
        </div>

        {/* EPF panel */}
        <EPFPanel epfInput={epfInput} onEPFChange={onEPFChange} />

        {/* Other 80C instruments */}
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 mt-5">Other Investments</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FIELDS.map(({ key, label, description, icon }) => (
            <div key={key}>
              <Label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
                <span>{icon}</span>
                <span>{label}</span>
                <span className="font-normal text-muted-foreground">(per year)</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold pointer-events-none">₹</span>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={values[key] === 0 ? '' : values[key]}
                  onChange={e => handleChange(key, e.target.value)}
                  className="pl-7 h-auto py-2.5 text-sm font-medium focus-visible:ring-indigo-400"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </div>
          ))}
        </div>

        {/* Overflow warning */}
        {overflow && (
          <div className="mt-5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
            ⚠️ Your total 80C investments ({fmt(total)}) exceed the ₹1,50,000 limit.
            Only ₹1,50,000 will be applied as a deduction.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
