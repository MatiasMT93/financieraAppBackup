interface FeatureIconProps {
  type: 'trace' | 'shield' | 'realtime';
}

export function FeatureIcon({ type }: FeatureIconProps) {
  return (
    <span className="feature-icon" aria-hidden="true">
      <svg viewBox="0 0 48 48" fill="none">
        {type === 'trace' && (
          <>
            <path d="m13 19 11-6 11 6v12l-11 6-11-6V19Z" stroke="currentColor" strokeWidth="1.7" />
            <circle cx="24" cy="13" r="2" fill="#E7BE60" />
            <circle cx="13" cy="31" r="2" fill="#17C5B3" />
            <circle cx="35" cy="31" r="2" fill="#E7BE60" />
            <path d="M24 15v9m0 0-9 5m9-5 9 5" stroke="currentColor" strokeWidth="1.5" />
          </>
        )}
        {type === 'shield' && (
          <>
            <path d="M24 10 35 15v8c0 7-4.6 12-11 15-6.4-3-11-8-11-15v-8l11-5Z" stroke="currentColor" strokeWidth="1.7" />
            <path d="m19 24 3.2 3.2L29 20" stroke="#E7BE60" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        {type === 'realtime' && (
          <>
            <path d="M35 25a11 11 0 1 1-3.2-7.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            <path d="M31 12v6h6" stroke="#E7BE60" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M24 18v7l5 3" stroke="#E7BE60" strokeWidth="1.7" strokeLinecap="round" />
          </>
        )}
      </svg>
    </span>
  );
}
