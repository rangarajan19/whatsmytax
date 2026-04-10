import type { Deductions80C, EPFInput } from '../tax';
import { total80C, MAX_80C, fmt, calcEPFContribution, EPF_RATE } from '../tax';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';

// ─── EPF sub-panel ────────────────────────────────────────────────

const BASIC_PRESETS = [30, 40, 50, 60];
const EPF_PRESETS   = [12, 10, 8];

interface EPFPanelProps {
  epfInput: EPFInput;
  onEPFChange: (updated: EPFInput) => void;
  gross: number;
}

export function EPFPanel({ epfInput, onEPFChange, gross }: EPFPanelProps) {
  const autoContrib = epfInput.basicSalary > 0
    ? Math.round(epfInput.basicSalary * EPF_RATE)
    : 0;
  const contribution  = calcEPFContribution(epfInput);
  const displayedEPF  = epfInput.useCustomAmount ? epfInput.customAmount : autoContrib;
  const basicPct      = gross > 0 && epfInput.basicSalary > 0
    ? Math.round((epfInput.basicSalary / gross) * 100)
    : null;
  const epfPct        = epfInput.basicSalary > 0
    ? Math.round((contribution / epfInput.basicSalary) * 100)
    : null;

  function handleBasicChange(val: number) {
    onEPFChange({ ...epfInput, basicSalary: val, useCustomAmount: false, customAmount: 0 });
  }

  function applyBasicPct(pct: number) {
    if (!gross) return;
    const basic = Math.round(gross * pct / 100);
    onEPFChange({ ...epfInput, basicSalary: basic, useCustomAmount: false, customAmount: 0 });
  }

  function applyEPFPct(pct: number) {
    if (!epfInput.basicSalary) return;
    const amt = Math.round(epfInput.basicSalary * pct / 100);
    const isAuto = pct === EPF_RATE * 100;
    onEPFChange({ ...epfInput, customAmount: amt, useCustomAmount: !isAuto });
  }

  function handleEPFAmountChange(val: number) {
    const isAutoValue = epfInput.basicSalary > 0 && val === autoContrib;
    onEPFChange({ ...epfInput, customAmount: val, useCustomAmount: !isAutoValue && val > 0 });
  }

  return (
    <div className="bg-[#004030]/8 border border-[#004030]/15 rounded-xl p-5 mb-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🏦</span>
        <h3 className="text-sm font-semibold text-[#004030]">EPF — Employee Provident Fund</h3>
      </div>
      <p className="text-xs text-[#004030]/60 mb-4">
        Employee contributes {(EPF_RATE * 100).toFixed(0)}% of basic salary. Counts towards your 80C limit.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Basic Salary */}
        <div>
          <Label className="text-xs font-semibold text-[#004030] mb-1.5 block">
            Annual Basic Salary
          </Label>
          {/* % presets */}
          {gross > 0 && (
            <div className="flex gap-1.5 mb-2">
              {BASIC_PRESETS.map(pct => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => applyBasicPct(pct)}
                  className={`flex-1 py-1 rounded-md text-xs font-semibold border transition-all ${
                    basicPct === pct
                      ? 'bg-[#004030] text-white border-[#004030]'
                      : 'bg-white text-[#004030]/60 border-[#004030]/20 hover:border-[#004030]/50'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          )}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold pointer-events-none">₹</span>
            <Input
              type="number"
              min={0}
              placeholder="e.g. 480000"
              value={epfInput.basicSalary === 0 ? '' : epfInput.basicSalary}
              onChange={e => handleBasicChange(parseFloat(e.target.value) || 0)}
              className="pl-7 h-auto py-2 text-sm font-medium bg-white border-[#004030]/15 focus-visible:ring-[#004030]/40"
            />
          </div>
          <p className="text-xs text-[#004030]/60 mt-1">
            {gross > 0 ? 'Pick a % above or enter manually' : 'Enter your annual basic salary'}
          </p>
        </div>

        {/* EPF Contribution */}
        <div>
          <Label className="text-xs font-semibold text-[#004030] mb-1.5 flex items-center gap-1.5">
            Annual EPF Contribution
            {epfInput.useCustomAmount && (
              <span className="bg-[#004030]/5 text-[#004030] border border-[#004030]/15 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                Custom
              </span>
            )}
          </Label>
          {/* % presets */}
          {epfInput.basicSalary > 0 && (
            <div className="flex gap-1.5 mb-2">
              {EPF_PRESETS.map(pct => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => applyEPFPct(pct)}
                  className={`flex-1 py-1 rounded-md text-xs font-semibold border transition-all ${
                    epfPct === pct
                      ? 'bg-[#004030] text-white border-[#004030]'
                      : 'bg-white text-[#004030]/60 border-[#004030]/20 hover:border-[#004030]/50'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          )}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold pointer-events-none">₹</span>
            <Input
              type="number"
              min={0}
              placeholder={autoContrib > 0 ? String(autoContrib) : '0'}
              value={displayedEPF === 0 ? '' : displayedEPF}
              onChange={e => handleEPFAmountChange(parseFloat(e.target.value) || 0)}
              className="pl-7 h-auto py-2 text-sm font-medium bg-white border-[#004030]/15 focus-visible:ring-[#004030]/40"
            />
          </div>
          <p className="text-xs text-[#004030]/60 mt-1">
            {epfInput.useCustomAmount
              ? <button
                  type="button"
                  className="underline text-[#004030] hover:text-[#004030]/80"
                  onClick={() => onEPFChange({ ...epfInput, useCustomAmount: false, customAmount: 0 })}
                >Reset to auto ({autoContrib > 0 ? fmt(autoContrib) : '12% of basic'})</button>
              : autoContrib > 0
                ? `Auto: ${(EPF_RATE * 100).toFixed(0)}% × ${fmt(epfInput.basicSalary)}`
                : 'Enter basic salary to calculate'
            }
          </p>
        </div>
      </div>

      {/* Stat pills */}
      {contribution > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-4">
          <Stat label="Monthly deduction" value={fmt(Math.round(contribution / 12))} />
          <Stat label="Annual contribution" value={fmt(contribution)} />
          <Stat label="% of basic" value={epfInput.basicSalary > 0 ? `${((contribution / epfInput.basicSalary) * 100).toFixed(1)}%` : '—'} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-[#004030]/15 rounded-lg p-3 text-center">
      <p className="text-xs text-[#004030]/60 mb-0.5">{label}</p>
      <p className="text-sm font-bold text-[#004030]">{value}</p>
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
  gross: number;
}

export default function DeductionsPanel({ epfInput, onEPFChange, values, onChange, gross }: Props) {
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
      <CardContent className="p-4 sm:p-7">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <Badge className="bg-[#004030]/8 text-[#004030] border-[#004030]/15 font-medium mb-2">
              Old Regime Only
            </Badge>
            <h2 className="text-[15px] md:text-base font-semibold text-[#003F31]">
              Section 80C Investments
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Max deduction: ₹1,50,000 combined across all instruments.
            </p>
          </div>

          {/* Progress pill */}
          <div className="text-right min-w-40">
            <p className="text-xs text-muted-foreground mb-1">
              {overflow
                ? <span className="text-[#004030] font-semibold">Capped at ₹1,50,000</span>
                : remaining > 0
                  ? <span>{fmt(remaining)} more to max</span>
                  : <span className="text-[#004030] font-semibold">Fully utilised ✓</span>
              }
            </p>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-300 bg-[#004030]`}
                style={{ width: `${fillPct}%` }}
              />
            </div>
            <p className={`text-sm font-bold mt-1 text-[#004030]`}>
              {fmt(effective)}
              <span className="text-xs font-normal text-muted-foreground ml-1">/ ₹1,50,000</span>
            </p>
          </div>
        </div>

        {/* EPF panel */}
        <EPFPanel epfInput={epfInput} onEPFChange={onEPFChange} gross={gross} />

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
                  className="pl-7 h-auto py-2 text-sm font-medium focus-visible:ring-[#004030]/40"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </div>
          ))}
        </div>

        {/* Overflow warning */}
        {overflow && (
          <div className="mt-5 bg-[#004030]/5 border border-[#004030]/15 rounded-xl px-4 py-3 text-xs text-[#004030]">
            ⚠️ Your total 80C investments ({fmt(total)}) exceed the ₹1,50,000 limit.
            Only ₹1,50,000 will be applied as a deduction.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
