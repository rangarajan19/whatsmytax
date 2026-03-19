import { useState } from 'react';
import { Input } from './ui/input';
import { fmt } from '../tax';

interface Props {
  onUseGross: (gross: number) => void;
}

export default function CTCHelper({ onUseGross }: Props) {
  const [open, setOpen] = useState(false);
  const [ctc, setCtc] = useState('');
  const [basicPct, setBasicPct] = useState(40);
  const [epfOverride, setEpfOverride]         = useState<string>('');
  const [gratuityOverride, setGratuityOverride] = useState<string>('');
  const [other, setOther] = useState('');

  const ctcVal      = parseFloat(ctc) || 0;
  const basic       = Math.round(ctcVal * (basicPct / 100));
  const autoEPF     = Math.round(basic * 0.12);
  const autoGrat    = Math.round(basic * 0.0481);
  const epfVal      = epfOverride !== '' ? (parseFloat(epfOverride) || 0) : autoEPF;
  const gratuityVal = gratuityOverride !== '' ? (parseFloat(gratuityOverride) || 0) : autoGrat;
  const otherVal    = parseFloat(other) || 0;
  const gross       = Math.max(0, ctcVal - epfVal - gratuityVal - otherVal);

  function handleUse() {
    onUseGross(gross);
    setOpen(false);
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="text-xs font-semibold text-[#004030]/70 underline underline-offset-2 hover:text-[#004030] transition-colors"
      >
        {open ? 'Hide CTC helper ↑' : 'Don\'t know your gross? Calculate from CTC →'}
      </button>

      {open && (
        <div className="mt-3 bg-white/80 border border-[#004030]/15 rounded-2xl p-4 space-y-4">
          <p className="text-xs text-[#004030]/60 leading-relaxed">
            Gross salary = CTC minus employer-side deductions (Employer PF, Gratuity). Enter your CTC and we'll estimate it.
          </p>

          {/* CTC input */}
          <div>
            <label className="text-xs font-semibold text-[#004030]/70 mb-1 block">Annual CTC</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#004030]/60 font-semibold text-sm pointer-events-none">₹</span>
              <Input
                type="number"
                min={0}
                placeholder="e.g. 1200000"
                value={ctc}
                onChange={e => setCtc(e.target.value)}
                className="pl-7 h-auto py-2.5 text-sm font-medium bg-white border-[#004030]/20 focus-visible:ring-[#004030]/30"
              />
            </div>
          </div>

          {ctcVal > 0 && (
            <>
              {/* Basic % selector */}
              <div>
                <label className="text-xs font-semibold text-[#004030]/70 mb-1.5 block">
                  Basic Salary — {basicPct}% of CTC = {fmt(basic)}
                </label>
                <div className="flex gap-2">
                  {[30, 40, 50].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        setBasicPct(pct);
                        setEpfOverride('');
                        setGratuityOverride('');
                      }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        basicPct === pct
                          ? 'bg-[#004030] text-white border-[#004030]'
                          : 'bg-white text-[#004030]/60 border-[#004030]/20 hover:border-[#004030]/40'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[#004030]/40 mt-1">Most companies set basic at 40–50% of CTC</p>
              </div>

              {/* Deductions breakdown */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-[#004030]/50 uppercase tracking-wider">Employer deductions from CTC</p>

                <DeductionRow
                  label="Employer PF"
                  hint={`12% of basic = ${fmt(autoEPF)}/yr`}
                  autoValue={autoEPF}
                  override={epfOverride}
                  onOverride={setEpfOverride}
                />

                <DeductionRow
                  label="Gratuity"
                  hint={`4.81% of basic = ${fmt(autoGrat)}/yr`}
                  autoValue={autoGrat}
                  override={gratuityOverride}
                  onOverride={setGratuityOverride}
                />

                <div>
                  <label className="text-xs font-semibold text-[#004030]/60 mb-1 block">
                    Other CTC deductions <span className="font-normal">(medical insurance, meal vouchers, etc.)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#004030]/50 font-semibold text-sm pointer-events-none">₹</span>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={other}
                      onChange={e => setOther(e.target.value)}
                      className="pl-7 h-auto py-2 text-sm bg-white border-[#004030]/15 focus-visible:ring-[#004030]/30"
                    />
                  </div>
                </div>
              </div>

              {/* Result */}
              <div className="bg-[#004030]/5 border border-[#004030]/15 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[#004030]/60">
                    {fmt(ctcVal)} − {fmt(epfVal)} − {fmt(gratuityVal)}{otherVal > 0 ? ` − ${fmt(otherVal)}` : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[#004030]/50 font-medium">Estimated Gross Salary</p>
                    <p className="text-xl font-bold text-[#004030]">{fmt(gross)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleUse}
                    className="bg-[#004030] text-[#B6FF00] text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#004030]/90 transition-colors"
                  >
                    Use this →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function DeductionRow({
  label, hint, autoValue, override, onOverride,
}: {
  label: string;
  hint: string;
  autoValue: number;
  override: string;
  onOverride: (v: string) => void;
}) {
  const isCustom = override !== '';
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-semibold text-[#004030]/60">{label}</label>
        <span className="text-xs text-[#004030]/40">{hint}</span>
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#004030]/50 font-semibold text-sm pointer-events-none">₹</span>
        <Input
          type="number"
          min={0}
          placeholder={String(autoValue)}
          value={override}
          onChange={e => onOverride(e.target.value)}
          className="pl-7 h-auto py-2 text-sm bg-white border-[#004030]/15 focus-visible:ring-[#004030]/30"
        />
      </div>
      {isCustom && (
        <button
          type="button"
          className="text-[10px] text-[#004030]/50 underline mt-0.5 hover:text-[#004030]"
          onClick={() => onOverride('')}
        >
          Reset to auto ({fmt(autoValue)})
        </button>
      )}
    </div>
  );
}
