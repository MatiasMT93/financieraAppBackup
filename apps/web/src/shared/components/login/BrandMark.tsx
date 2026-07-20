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
      <path d="M50 8 92 50 50 92 8 50 50 8Z" stroke="url(#brand-gold)" strokeWidth="6" />
      <path d="M53 30 75 52 53 74 31 52 53 30Z" stroke="url(#brand-gold)" strokeWidth="5.4" />
    </svg>
  );
}
