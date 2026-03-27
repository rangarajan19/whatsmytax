interface Props {
  onBack: () => void;
}

const VERSIONS = [
  {
    version: 'v2.0',
    date: 'March 2025',
    label: 'Latest',
    title: 'Freelancer flow & Summary redesign',
    changes: [
      'Dedicated freelancer flow — Section 44ADA, 44AD, and manual profit options',
      'Landing page to choose between Salaried and Freelancer paths',
      'Tax Summary screen with Deduction Analysis — see what you\'ve invested and how much more you can save',
      'Side navigation menu on desktop with ✓ ticks when sections are filled',
      'iPhone safe area support and correct button sizing on mobile',
      'Rotating income tax trivia on the landing page',
    ],
  },
  {
    version: 'v1.5',
    date: 'February 2025',
    label: null,
    title: 'Capital Gains & Perquisites',
    changes: [
      'Capital Gains: LTCG equity (12.5% above ₹1.25L), STCG equity (20%), LTCG/STCG on other assets (debt, property)',
      'CTC → Gross Salary helper to calculate take-home from your CTC breakup',
      'Perquisites section: telephone/internet reimbursement, fuel allowance, driver salary',
      'Finance Act 2024 label on results',
    ],
  },
  {
    version: 'v1.0',
    date: 'January 2025',
    label: null,
    title: 'Initial launch',
    changes: [
      'Income tax calculator for salaried employees — FY 2024–25 (AY 2025–26)',
      'Old Regime vs New Regime comparison with full slab breakdowns',
      'Section 80C (EPF, PPF, ELSS, LIC, NSC and more)',
      'HRA exemption with metro/non-metro support',
      'Section 80D health insurance, NPS 80CCD(1B), Home Loan 24b, Education Loan 80E',
    ],
  },
];

export default function ChangelogPage({ onBack }: Props) {
  return (
    <div className="min-h-screen bg-background text-[#004030] font-sans">
      <div className="md:max-w-[35vw] mx-auto">

        {/* Header */}
        <header className="bg-[#B6FF00] px-4 pt-4 pb-8 rounded-b-[40px]">
          <div className="relative flex items-center justify-center">
            <button
              onClick={onBack}
              className="absolute left-0 text-sm font-semibold text-[#004030]"
            >
              ←
            </button>
            <span className="text-sm font-semibold text-[#004030]">What's new</span>
          </div>
        </header>

        {/* Version list */}
        <div className="px-4 pt-6 pb-24 space-y-6">
          {VERSIONS.map((v, i) => (
            <div key={v.version}>
              {/* Version header */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${
                  i === 0
                    ? 'bg-[#004030] text-[#B6FF00]'
                    : 'bg-[#004030]/8 text-[#004030]/60'
                }`}>
                  {v.version}
                </span>
                {v.label && (
                  <span className="text-[10px] font-semibold bg-[#B6FF00] text-[#004030] px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {v.label}
                  </span>
                )}
                <span className="text-xs text-[#004030]/40 ml-auto">{v.date}</span>
              </div>

              {/* Card */}
              <div className="bg-card rounded-xl ring-1 ring-foreground/10 px-4 py-3">
                <p className="text-sm font-semibold text-[#004030] mb-3">{v.title}</p>
                <ul className="space-y-2">
                  {v.changes.map((change, j) => (
                    <li key={j} className="flex gap-2 text-sm text-[#004030]/70">
                      <span className="shrink-0 mt-0.5 text-[#004030]/30">—</span>
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}

          {/* Footer note */}
          <p className="text-xs text-center text-[#004030]/30 pt-2">
            Based on Finance Act 2024 · FY 2024–25 (AY 2025–26)
          </p>
        </div>

      </div>
    </div>
  );
}
