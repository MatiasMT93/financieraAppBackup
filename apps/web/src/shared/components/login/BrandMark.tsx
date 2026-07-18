interface BrandMarkProps {
  size?: number;
  className?: string;
}

export function BrandMark({ size = 76, className }: BrandMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
    >
      <defs>
        <linearGradient id="brand-gold" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F7E5A8" />
          <stop offset="0.47" stopColor="#D8A84B" />
          <stop offset="1" stopColor="#F0D487" />
        </linearGradient>
      </defs>
      <path d="M50 7 89 46 50 85 11 46 50 7Z" stroke="url(#brand-gold)" strokeWidth="5.4" />
      <path d="m50 22 24 24-24 24-24-24 24-24Z" stroke="url(#brand-gold)" strokeWidth="5.4" />
      <path d="M19 53 53 19M47 81 81 47" stroke="url(#brand-gold)" strokeWidth="5.4" />
      <path d="M37 34 51 20 65 34" stroke="url(#brand-gold)" strokeWidth="5.4" strokeLinecap="square" />
    </svg>
  );
}
