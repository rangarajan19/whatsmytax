import type { EducationLoanInput } from '../tax';
import { fmt } from '../tax';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';

interface Props {
  values: EducationLoanInput;
  onChange: (updated: EducationLoanInput) => void;
}

export default function EducationLoanPanel({ values, onChange }: Props) {
  return (
    <Card className="mb-7">
      <CardContent className="p-4 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base font-semibold text-[#003F31] flex items-center flex-wrap gap-2">
              Section 80E — Education Loan Interest
              <Badge className="bg-orange-100 text-orange-700 border-orange-200 font-medium">
                Old Regime Only
              </Badge>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Full interest deductible — no upper cap. Available for up to 8 years from first repayment.
            </p>
          </div>
          {values.interestPaid > 0 && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-0.5">Deduction</p>
              <p className="text-sm font-bold text-orange-600">{fmt(values.interestPaid)}</p>
            </div>
          )}
        </div>

        <div className="max-w-xs">
          <Label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
            <span>🎓</span>
            <span>Annual Interest Paid</span>
            <span className="font-normal text-muted-foreground">(per year)</span>
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold pointer-events-none">₹</span>
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={values.interestPaid === 0 ? '' : values.interestPaid}
              onChange={e =>
                onChange({ interestPaid: Math.max(0, parseFloat(e.target.value) || 0) })
              }
              className="pl-7 h-auto py-2.5 text-sm font-medium focus-visible:ring-orange-400"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Interest on loan taken for higher education of self, spouse, or children.
            Principal repayment is <strong>not</strong> deductible here.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
