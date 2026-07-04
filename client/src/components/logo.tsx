export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      aria-label="ContaAê"
      role="img"
    >
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="hsl(188 92% 55%)" />
          <stop offset="1" stopColor="hsl(276 85% 68%)" />
        </linearGradient>
      </defs>
      <path
        d="M32 10 L50 32 L32 54 L14 32 Z"
        fill="none"
        stroke="url(#logoGrad)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="32" r="6" fill="url(#logoGrad)" />
      <path
        d="M32 20 V14 M32 50 V44 M22 32 H16 M42 32 H48"
        stroke="url(#logoGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
