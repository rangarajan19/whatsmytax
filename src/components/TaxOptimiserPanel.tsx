import type { Deductions, RegimeResult } from '../tax';
import {
  MAX_80C, total80C, MAX_NPS_80CCD1B, MAX_HOME_LOAN_INTEREST,
  calc80DDeduction, calcHRAExemption,
} from '../tax';

const rs = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
const usePct = (used: number, limit: number) => Math.min(100, limit > 0 ? Math.round((used / limit) * 100) : 0);

function getMarginalRate(taxableIncome: number): number {
  if (taxableIncome > 1_000_000) return 0.312; // 30% + 4% cess
  if (taxableIncome > 500_000)   return 0.208; // 20% + 4% cess
  if (taxableIncome > 250_000)   return 0.052; // 5% + 4% cess
  return 0;
}

interface Props {
  deductions: Deductions;
  oldResult: RegimeResult;
  userType: 'salaried' | 'freelance';
}

// ─── Sub-components ────────────────────────────────────────────────

function Bar({ pct }: { pct: number }) {
  const bg = pct >= 100 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#004030';
  return (
    <div className="h-1.5 bg-[#004030]/10 rounded-full overflow-hidden mt-2 mb-1">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: bg }} />
    </div>
  );
}

function Headroom({ headroom, saving }: { headroom: number; saving: number }) {
  if (headroom <= 0 || saving <= 0) return null;
  return (
    <div className="bg-[#B6FF00]/40 border border-[#004030]/10 rounded-lg px-3 py-2 mt-2">
      <p className="text-xs text-[#004030]">
        <span className="font-bold">{rs(headroom)}</span> more available —{' '}
        invest to save <span className="font-bold">{rs(saving)}</span> in tax
      </p>
    </div>
  );
}

function FullyUsed() {
  return <p className="text-xs font-semibold text-[#004030] mt-1">✓ Fully utilized</p>;
}

function SectionHeader({ label, sub, claimed, limit }: { label: string; sub: string; claimed: number; limit?: number }) {
  return (
    <div className="flex justify-between items-start">
      <div>
        <p className="text-[11px] font-semibold text-[#004030]/50 uppercase tracking-wider">{label}</p>
        <p className="text-xs text-[#004030]/60 mt-0.5">{sub}</p>
      </div>
      <div className="text-right">
        <p className="text-[15px] md:text-base font-bold text-[#004030]">{rs(claimed)}</p>
        {limit !== undefined && <p className="text-[10px] text-[#004030]/40">of {rs(limit)}</p>}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────

export default function TaxOptimiserPanel({ deductions, oldResult, userType }: Props) {
  const marginal = getMarginalRate(oldResult.taxableIncome);

  // ── 80C ──────────────────────────────────────────────────────────
  const used80C     = Math.min(total80C(deductions.section80C), MAX_80C);
  const raw80C      = total80C(deductions.section80C);
  const headroom80C = Math.max(0, MAX_80C - raw80C);
  const saving80C   = Math.round(headroom80C * marginal);
  const pct80C      = usePct(used80C, MAX_80C);

  const items80C = [
    { label: 'EPF',                value: deductions.section80C.epf },
    { label: 'PPF',                value: deductions.section80C.ppf },
    { label: 'ELSS',               value: deductions.section80C.elss },
    { label: 'NSC',                value: deductions.section80C.nsc },
    { label: 'Life Insurance',     value: deductions.section80C.lifeInsurance },
    { label: 'Home Loan Principal',value: deductions.section80C.homeLoanPrincipal },
    { label: 'Tuition Fees',       value: deductions.section80C.tuitionFees },
    { label: 'Sukanya Samriddhi',  value: deductions.section80C.sukanya },
    { label: 'NPS (80CCD1)',       value: deductions.section80C.nps },
  ].filter(i => i.value > 0);

  // ── HRA ──────────────────────────────────────────────────────────
  const hraResult   = calcHRAExemption(deductions.hraInput);
  const hraExemption = hraResult.exemption;

  // ── 80D ──────────────────────────────────────────────────────────
  const d80          = calc80DDeduction(deductions.section80D);
  const selfGap      = Math.max(0, d80.selfLimit   - deductions.section80D.selfPremium);
  const parentGap    = Math.max(0, d80.parentLimit - deductions.section80D.parentPremium);
  const totalGap80D  = selfGap + parentGap;
  const saving80D    = Math.round(totalGap80D * marginal);

  // ── NPS ──────────────────────────────────────────────────────────
  const npsUsed    = deductions.nps80CCD1B.amount;
  const npsGap     = Math.max(0, MAX_NPS_80CCD1B - npsUsed);
  const npsSaving  = Math.round(npsGap * marginal);

  // ── Home Loan 24b ─────────────────────────────────────────────────
  const hlClaimed  = oldResult.deductionHomeLoan;
  const hlGap      = deductions.homeLoanInterest.isSelfOccupied
    ? Math.max(0, MAX_HOME_LOAN_INTEREST - deductions.homeLoanInterest.interestPaid)
    : 0;
  const hlSaving   = Math.round(hlGap * marginal);
  const hlEntered  = deductions.homeLoanInterest.interestPaid > 0;

  // ── Education Loan 80E ───────────────────────────────────────────
  const eduLoan = deductions.educationLoan.interestPaid;

  // ── Total potential ──────────────────────────────────────────────
  const totalPotential = saving80C + saving80D + npsSaving + hlSaving;

  return (
    <div className="space-y-3 pt-2">

      {/* Banner: total savings available */}
      {totalPotential > 0 && marginal > 0 && (
        <div className="bg-[#004030] rounded-xl px-4 py-3">
          <p className="text-[11px] font-semibold text-[#B6FF00]/70 uppercase tracking-wider mb-0.5">
            Potential tax savings
          </p>
          <p className="text-[22px] md:text-2xl font-bold text-[#B6FF00]">{rs(totalPotential)}</p>
          <p className="text-xs text-white/50 mt-0.5">by fully utilizing available deductions</p>
        </div>
      )}

      {/* ── Section 80C ── */}
      <div className="bg-card rounded-xl ring-1 ring-foreground/10 px-4 py-3">
        <SectionHeader label="Section 80C" sub="Investments & savings" claimed={used80C} limit={MAX_80C} />
        <Bar pct={pct80C} />
        <p className="text-[10px] text-[#004030]/40 mb-2">{pct80C}% of ₹1,50,000 limit used</p>

        {items80C.length > 0 ? (
          <div className="space-y-1.5 border-t border-[#004030]/8 pt-2">
            {items80C.map(item => (
              <div key={item.label} className="flex justify-between text-xs">
                <span className="text-[#004030]/60">{item.label}</span>
                <span className="font-semibold text-[#004030]">{rs(item.value)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#004030]/40 border-t border-[#004030]/8 pt-2">
            No investments added yet
          </p>
        )}

        {pct80C >= 100 ? <FullyUsed /> : <Headroom headroom={headroom80C} saving={saving80C} />}
      </div>

      {/* ── HRA (salaried only) ── */}
      {userType === 'salaried' && (
        <div className="bg-card rounded-xl ring-1 ring-foreground/10 px-4 py-3">
          <SectionHeader label="HRA Exemption" sub="House Rent Allowance" claimed={hraExemption} />
          {hraExemption === 0 ? (
            <p className="text-xs text-[#004030]/50 mt-2 border-t border-[#004030]/8 pt-2">
              Not claimed — if you pay rent, fill HRA details to reduce taxable income.
            </p>
          ) : (
            <p className="text-xs text-[#004030] font-semibold mt-1">✓ Exemption applied</p>
          )}
        </div>
      )}

      {/* ── Section 80D ── */}
      <div className="bg-card rounded-xl ring-1 ring-foreground/10 px-4 py-3">
        <SectionHeader label="Section 80D" sub="Health insurance premiums" claimed={d80.total} limit={d80.selfLimit + d80.parentLimit} />

        <div className="space-y-2 border-t border-[#004030]/8 pt-2 mt-2">
          {/* Self */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[#004030]/60">
                Self &amp; family{deductions.section80D.selfSenior ? ' (Senior)' : ''}
              </span>
              <span className="text-[#004030]/50">{rs(deductions.section80D.selfPremium)} / {rs(d80.selfLimit)}</span>
            </div>
            <Bar pct={usePct(deductions.section80D.selfPremium, d80.selfLimit)} />
          </div>

          {/* Parents */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[#004030]/60">
                Parents{deductions.section80D.parentSenior ? ' (Senior)' : ''}
              </span>
              <span className="text-[#004030]/50">{rs(deductions.section80D.parentPremium)} / {rs(d80.parentLimit)}</span>
            </div>
            <Bar pct={usePct(deductions.section80D.parentPremium, d80.parentLimit)} />
          </div>
        </div>

        {totalGap80D <= 0 ? <FullyUsed /> : <Headroom headroom={totalGap80D} saving={saving80D} />}
      </div>

      {/* ── NPS 80CCD(1B) ── */}
      <div className="bg-card rounded-xl ring-1 ring-foreground/10 px-4 py-3">
        <SectionHeader label="NPS 80CCD(1B)" sub="Additional NPS — over 80C limit" claimed={npsUsed} limit={MAX_NPS_80CCD1B} />
        <Bar pct={usePct(npsUsed, MAX_NPS_80CCD1B)} />
        {npsGap <= 0 ? <FullyUsed /> : <Headroom headroom={npsGap} saving={npsSaving} />}
      </div>

      {/* ── Home Loan 24b (show if entered, or if self-occupied with headroom) ── */}
      {(hlEntered || hlClaimed > 0) && (
        <div className="bg-card rounded-xl ring-1 ring-foreground/10 px-4 py-3">
          <SectionHeader
            label="Home Loan Interest (24b)"
            sub={deductions.homeLoanInterest.isSelfOccupied ? 'Self-occupied · ₹2L cap' : 'Let-out · No cap'}
            claimed={hlClaimed}
            limit={deductions.homeLoanInterest.isSelfOccupied ? MAX_HOME_LOAN_INTEREST : undefined}
          />
          {deductions.homeLoanInterest.isSelfOccupied && (
            <Bar pct={usePct(deductions.homeLoanInterest.interestPaid, MAX_HOME_LOAN_INTEREST)} />
          )}
          {hlGap <= 0 || !deductions.homeLoanInterest.isSelfOccupied
            ? <FullyUsed />
            : <Headroom headroom={hlGap} saving={hlSaving} />}
        </div>
      )}

      {/* ── Education Loan 80E ── */}
      {eduLoan > 0 && (
        <div className="bg-card rounded-xl ring-1 ring-foreground/10 px-4 py-3">
          <SectionHeader label="Education Loan (80E)" sub="Interest deduction · No upper limit" claimed={eduLoan} />
          <p className="text-xs text-[#004030] font-semibold mt-1">✓ Full interest deducted</p>
        </div>
      )}

    </div>
  );
}
