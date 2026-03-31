import { fmt } from '../tax';
import type { RegimeRecommendation, RegimeResult } from '../tax';

interface Props {
  recommendation: RegimeRecommendation;
  oldResult: RegimeResult;
  newResult: RegimeResult;
  oldInHand: number;
  newInHand: number;
  isFreelance?: boolean;
  /** compact = banner for main view; full = winner card for summary */
  compact?: boolean;
}

export default function RegimeRecommendationCard({
  recommendation,
  oldResult,
  newResult,
  oldInHand,
  newInHand,
  isFreelance = false,
  compact = false,
}: Props) {
  const { winner, savingsAmount, canOldBeatNew, neededDeductions, availableHeadroom } = recommendation;
  const winnerLabel = winner === 'new' ? 'New Regime' : winner === 'old' ? 'Old Regime' : null;
  const winnerTax   = winner === 'new' ? newResult.total : oldResult.total;
  const winnerHand  = winner === 'new' ? newInHand : oldInHand;
  const loserLabel  = winner === 'new' ? 'Old Regime' : 'New Regime';

  // ── Compact banner (main view) ───────────────────────────────────
  if (compact) {
    if (winner === 'equal') {
      return (
        <div className="mx-4 mt-3 rounded-xl bg-[#004030]/6 px-4 py-3">
          <p className="text-sm font-semibold text-[#004030]">Both regimes result in the same tax</p>
          <p className="text-xs text-[#004030]/50 mt-0.5">Add deductions to see if Old Regime becomes better</p>
        </div>
      );
    }

    return (
      <div className="mx-4 mt-3 rounded-xl bg-[#B6FF00] px-4 py-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-[#004030]/60 uppercase tracking-wider mb-0.5">
            Recommended
          </p>
          <p className="text-base font-bold text-[#004030]">
            {winnerLabel} · {fmt(winnerTax)}
          </p>
          <p className="text-xs text-[#004030]/60 mt-0.5">
            Saves {fmt(savingsAmount)} vs {loserLabel}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-[#004030]/50">{isFreelance ? 'Monthly Est.' : 'In-hand/mo'}</p>
          <p className="text-sm font-bold text-[#004030]">{fmt(winnerHand)}</p>
        </div>
      </div>
    );
  }

  // ── Full card (summary view) ─────────────────────────────────────
  return (
    <div className="mx-4 mt-4 space-y-3">

      {/* Winner card */}
      <div className="bg-[#004030] rounded-2xl px-5 py-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold text-[#B6FF00]/70 uppercase tracking-wider">
            {winner === 'equal' ? 'Both Equal' : 'Better for you'}
          </span>
          {winner !== 'equal' && (
            <span className="bg-[#B6FF00] text-[#004030] text-[10px] font-bold px-2 py-0.5 rounded-full">
              ✓ Recommended
            </span>
          )}
        </div>

        <p className="text-2xl font-bold text-white mb-0.5">{winnerLabel ?? 'Equal'}</p>
        <p className="text-3xl font-bold text-[#B6FF00] mb-1">{fmt(winnerTax)}</p>
        <p className="text-xs text-white/50">
          {fmt(winnerHand)}/{isFreelance ? 'mo est.' : 'mo in-hand'}
          {winner !== 'equal' && ` · saves ${fmt(savingsAmount)} vs ${loserLabel}`}
        </p>
      </div>

      {/* Switch analysis — only when new is winning */}
      {winner === 'new' && (
        <div className="bg-[#004030]/6 rounded-2xl px-5 py-4">
          <p className="text-xs font-bold text-[#004030]/50 uppercase tracking-wider mb-2">
            Can Old Regime beat this?
          </p>

          {canOldBeatNew ? (
            <>
              <p className="text-sm font-semibold text-[#004030] mb-1">
                Yes — invest {fmt(neededDeductions)} more in deductions
              </p>
              <p className="text-xs text-[#004030]/50 mb-3">
                You have {fmt(availableHeadroom)} headroom left across 80C, NPS, 80D and Home Loan.
              </p>
              {/* Progress bar: neededDeductions vs availableHeadroom */}
              <div className="h-1.5 bg-[#004030]/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#004030] rounded-full transition-all"
                  style={{ width: `${Math.min(100, (neededDeductions / availableHeadroom) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-[#004030]/40">Need {fmt(neededDeductions)}</span>
                <span className="text-[10px] text-[#004030]/40">{fmt(availableHeadroom)} available</span>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-[#004030] mb-1">
                No — New Regime is the clear winner
              </p>
              <p className="text-xs text-[#004030]/50">
                Even maxing all remaining deductions ({fmt(availableHeadroom)}), Old Regime cannot beat New Regime at your income level.
              </p>
            </>
          )}
        </div>
      )}

      {/* Old regime already winning — show why */}
      {winner === 'old' && (
        <div className="bg-[#004030]/6 rounded-2xl px-5 py-4">
          <p className="text-xs font-bold text-[#004030]/50 uppercase tracking-wider mb-1">
            Why Old Regime wins
          </p>
          <p className="text-sm font-semibold text-[#004030] mb-0.5">
            Your deductions reduced taxable income significantly
          </p>
          <p className="text-xs text-[#004030]/50">
            Total deductions claimed: {fmt(
              oldResult.deduction80C + oldResult.deductionHRA + oldResult.deduction80D +
              oldResult.deductionNPS + oldResult.deductionHomeLoan + oldResult.deductionEducationLoan
            )}
          </p>
        </div>
      )}
    </div>
  );
}
