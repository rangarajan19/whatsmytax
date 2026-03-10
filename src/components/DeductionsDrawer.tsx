import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type {
  Deductions, Deductions80C, EPFInput, HRAInput,
  Section80DInput, NPS80CCD1BInput, HomeLoanInterestInput,
  OtherIncome,
} from '../tax';
import DeductionsPanel from './DeductionsPanel';
import HRAPanel from './HRAPanel';
import Section80DPanel from './Section80DPanel';
import NPSPanel from './NPSPanel';
import HomeLoanInterestPanel from './HomeLoanInterestPanel';
import OtherIncomePanel from './OtherIncomePanel';
import { calcOtherIncome } from '../tax';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deductions: Deductions;
  otherIncome: OtherIncome;
  onEPFChange: (epf: EPFInput) => void;
  on80CChange: (key: keyof Deductions80C, value: number) => void;
  onHRAChange: (hra: HRAInput) => void;
  on80DChange: (d: Section80DInput) => void;
  onNPSChange: (nps: NPS80CCD1BInput) => void;
  onHomeLoanChange: (hl: HomeLoanInterestInput) => void;
  onOtherIncomeChange: (oi: OtherIncome) => void;
}

export default function DeductionsDrawer({
  open, onOpenChange,
  deductions, otherIncome,
  onEPFChange, on80CChange, onHRAChange, on80DChange, onNPSChange, onHomeLoanChange, onOtherIncomeChange,
}: Props) {
  const oiResult = calcOtherIncome(otherIncome);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0">
        <SheetHeader className="px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <SheetTitle className="text-base font-bold text-[#003f31]">Investment & Deduction Details</SheetTitle>
          <p className="text-xs text-gray-400 mt-0.5">Old Regime deductions apply only to Old Regime tax.</p>
        </SheetHeader>

        <div className="px-6 py-6 space-y-2">

          {/* Other Income */}
          <SectionHead icon="💹" title="Other Income" subtitle="Dividends, interest, rent, capital gains — applies to both regimes" />
          <OtherIncomePanel
            value={otherIncome}
            result={oiResult}
            onChange={onOtherIncomeChange}
          />

          <Divider />

          {/* Section 80C */}
          <SectionHead icon="💰" title="Section 80C — Investments & EPF" subtitle="Max ₹1,50,000 combined" />
          <DeductionsPanel
            epfInput={deductions.epfInput}
            onEPFChange={onEPFChange}
            values={deductions.section80C}
            onChange={on80CChange}
          />

          {/* HRA */}
          <SectionHead icon="🏠" title="HRA — House Rent Allowance" subtitle="Only if you live in rented accommodation" />
          <HRAPanel hraInput={deductions.hraInput} onChange={onHRAChange} />

          {/* Section 80D */}
          <SectionHead icon="🏥" title="Section 80D — Health Insurance" subtitle="Up to ₹25,000 (self) + ₹25,000 (parents)" />
          <Section80DPanel value={deductions.section80D} onChange={on80DChange} />

          {/* NPS */}
          <SectionHead icon="🏛️" title="NPS 80CCD(1B) — Additional" subtitle="Extra ₹50,000 over and above 80C limit" />
          <NPSPanel value={deductions.nps80CCD1B} onChange={onNPSChange} />

          {/* Home Loan */}
          <SectionHead icon="🏡" title="Section 24b — Home Loan Interest" subtitle="Up to ₹2,00,000 for self-occupied property" />
          <HomeLoanInterestPanel value={deductions.homeLoanInterest} onChange={onHomeLoanChange} />

        </div>
      </SheetContent>
    </Sheet>
  );
}

function SectionHead({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-2 mt-4 mb-2">
      <span className="text-base mt-0.5">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-[#003f31]">{title}</p>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-gray-100 my-4" />;
}
