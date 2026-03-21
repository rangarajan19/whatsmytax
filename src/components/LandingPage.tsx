interface Props {
  onSelect: (type: 'salaried' | 'freelance') => void;
}

export default function LandingPage({ onSelect }: Props) {
  return (
    <div className="min-h-screen bg-[#B6FF00] flex flex-col relative overflow-hidden">

      {/* CSS grid background pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,64,48,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,64,48,0.07) 1px, transparent 1px)
          `,
          backgroundSize: '56px 56px',
        }}
      />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 pt-10 pb-0">
        <span className="text-2xl font-bold text-black tracking-tight">
          Whats My Tax?
        </span>
      </nav>

      {/* Centre content — grows to fill space */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 py-12 gap-12">

        {/* Text block */}
        <div className="flex flex-col items-center gap-3 w-full max-w-md">
          <p className="text-sm font-semibold text-[#004030]/70 text-center">
            Income Tax Calculator — FY 2024–25 (AY 2025–26)
          </p>
          <h1 className="text-[32px] md:text-[48px] font-bold text-[#004030]/80 text-center leading-tight">
            We are here to help you, calculate your tax, Precisely.
          </h1>
          <p className="text-base font-semibold text-[#004030]/70 text-center">
            No more confusion on what's left and what's available
          </p>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col md:flex-row gap-4 w-full max-w-md">
          <button
            onClick={() => onSelect('salaried')}
            className="flex-1 h-[52px] px-4 bg-[#004030] text-[#B6FF00] text-[15px] font-semibold rounded-[15px] hover:bg-[#004030]/90 transition-colors"
          >
            I am a salaried Professional
          </button>
          <button
            onClick={() => onSelect('freelance')}
            className="flex-1 h-[52px] px-4 bg-transparent border border-[#004030] text-[#004030] text-[15px] font-semibold rounded-[15px] hover:bg-[#004030]/5 transition-colors"
          >
            I am a freelancer
          </button>
        </div>

      </div>

      {/* Tagline — bottom */}
      <div className="relative z-10 flex items-center justify-center py-5">
        <p className="text-sm font-semibold text-[#004030]/70">
          Only 3% of Indians Pay Income Tax
        </p>
      </div>

    </div>
  );
}
