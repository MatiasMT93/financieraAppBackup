export function WavePattern({ className = '' }: { className?: string }) {
  return (
    <svg className={`dashboard-wave ${className}`} viewBox="0 0 520 180" aria-hidden="true" preserveAspectRatio="none">
      {Array.from({ length: 16 }, (_, index) => (
        <path
          key={index}
          d={`M-20 ${145 - index * 4} C 95 ${62 + index * 2}, 190 ${170 - index * 3}, 315 ${78 + index * 2} S 475 ${54 + index * 3}, 555 ${28 + index * 2}`}
          fill="none"
          stroke={index % 4 === 0 ? '#D5A64B' : '#0EC3B2'}
          strokeWidth={index % 4 === 0 ? 0.8 : 0.65}
          strokeOpacity={0.12 + (index % 4) * 0.035}
          strokeDasharray={index % 3 === 0 ? '2 5' : undefined}
        />
      ))}
    </svg>
  );
}
