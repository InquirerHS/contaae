// Decorative arcane-cyberpunk skyline: neon city silhouette + floating magic orb.
// Pure SVG/CSS, no external assets.

export function CityBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* grid floor */}
      <div className="arcane-grid absolute inset-x-0 bottom-0 h-2/3" />
      {/* floating orb */}
      <div className="absolute right-[12%] top-[14%] h-24 w-24 rounded-full bg-primary/30 blur-2xl animate-pulse-glow" />
      <div className="absolute right-[16%] top-[18%] h-10 w-10 rounded-full bg-primary/60 blur-md animate-pulse-glow" />
      {/* violet glow */}
      <div className="absolute left-[8%] top-[30%] h-32 w-32 rounded-full bg-accent/20 blur-3xl" />

      {/* skyline silhouette */}
      <svg
        className="absolute bottom-0 left-0 w-full opacity-50"
        viewBox="0 0 1200 220"
        preserveAspectRatio="none"
        fill="none"
      >
        <defs>
          <linearGradient id="cityGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="hsl(188 92% 55%)" stopOpacity="0.18" />
            <stop offset="1" stopColor="hsl(276 85% 30%)" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="cityStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="hsl(188 92% 60%)" />
            <stop offset="1" stopColor="hsl(276 85% 70%)" />
          </linearGradient>
        </defs>
        <path
          d="M0 220 L0 150 L60 150 L60 110 L110 110 L110 140 L170 140 L170 80 L200 80 L200 120 L260 120 L260 95 L300 95 L300 160 L360 160 L360 70 L390 70 L390 130 L450 130 L450 100 L520 100 L520 150 L580 150 L580 90 L620 90 L620 60 L650 60 L650 120 L710 120 L710 140 L770 140 L770 85 L820 85 L820 130 L880 130 L880 105 L940 105 L940 155 L1000 155 L1000 115 L1060 115 L1060 145 L1120 145 L1120 90 L1200 90 L1200 220 Z"
          fill="url(#cityGrad)"
          stroke="url(#cityStroke)"
          strokeWidth="1.2"
        />
        {/* windows / lights */}
        <g fill="hsl(188 92% 60%)" opacity="0.5">
          <rect x="70" y="120" width="3" height="3" />
          <rect x="82" y="125" width="3" height="3" />
          <rect x="180" y="95" width="3" height="3" />
          <rect x="220" y="130" width="3" height="3" />
          <rect x="370" y="85" width="3" height="3" />
          <rect x="540" y="115" width="3" height="3" />
          <rect x="630" y="75" width="3" height="3" />
          <rect x="660" y="100" width="3" height="3" />
          <rect x="780" y="100" width="3" height="3" />
          <rect x="900" y="120" width="3" height="3" />
          <rect x="1075" y="105" width="3" height="3" />
        </g>
      </svg>
    </div>
  );
}
