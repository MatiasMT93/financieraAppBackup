const paths = [
  'M-40 628 C 124 475, 225 588, 358 447 S 590 292, 860 330',
  'M-70 668 C 110 520, 235 650, 392 492 S 646 327, 950 358',
  'M-90 708 C 126 555, 248 697, 435 528 S 704 374, 995 395',
  'M-60 558 C 115 447, 264 525, 393 392 S 632 245, 930 275',
  'M80 760 C 258 616, 316 705, 489 555 S 711 445, 1000 460',
  'M270 0 C 498 80, 312 164, 548 225 S 779 245, 948 150',
  'M325 28 C 530 122, 350 194, 591 252 S 790 290, 990 202',
  'M365 79 C 520 153, 421 231, 634 282 S 820 342, 1035 267',
];

const nodes = [
  [206, 562], [273, 524], [344, 491], [412, 441], [486, 396], [558, 350],
  [615, 315], [698, 307], [759, 329], [808, 367], [866, 402], [915, 445],
  [364, 627], [446, 583], [525, 535], [594, 495], [662, 464], [726, 451],
  [445, 207], [520, 224], [600, 253], [681, 282], [763, 304], [849, 299],
  [506, 114], [584, 146], [649, 180], [723, 205], [803, 215],
];

const labels = [
  { text: 'Liquidaciones', x: 500, y: 184 },
  { text: 'Pagos', x: 823, y: 205 },
  { text: 'Conciliaciones', x: 805, y: 343 },
  { text: 'Pagos', x: 575, y: 418 },
];

export function FlowNetwork() {
  return (
    <svg className="flow-network" viewBox="0 0 1000 800" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="flow-teal" x1="0" y1="800" x2="1000" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00D8C8" stopOpacity="0" />
          <stop offset="0.38" stopColor="#00D8C8" stopOpacity="0.8" />
          <stop offset="0.75" stopColor="#D0A648" stopOpacity="0.72" />
          <stop offset="1" stopColor="#F6D37D" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="flow-gold" x1="0" y1="700" x2="900" y2="120" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D39D40" stopOpacity="0" />
          <stop offset="0.55" stopColor="#E4B75E" stopOpacity="0.65" />
          <stop offset="1" stopColor="#F1DA91" stopOpacity="0" />
        </linearGradient>
        <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="node-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <pattern id="micro-dots" width="18" height="18" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.8" fill="#1EE8D3" fillOpacity="0.22" />
        </pattern>
      </defs>

      <rect width="1000" height="800" fill="url(#micro-dots)" opacity="0.22" />
      <g fill="none" strokeLinecap="round">
        {paths.map((d, index) => (
          <path
            key={d}
            d={d}
            stroke={index % 2 === 0 ? 'url(#flow-teal)' : 'url(#flow-gold)'}
            strokeWidth={index < 5 ? 1.7 : 1.15}
            opacity={index < 5 ? 0.78 : 0.34}
            filter={index === 1 || index === 3 ? 'url(#soft-glow)' : undefined}
          />
        ))}
        {Array.from({ length: 28 }, (_, i) => (
          <path
            key={`filament-${i}`}
            d={`M${-50 + i * 19} ${650 + (i % 7) * 8} C ${200 + i * 7} ${500 - i * 3}, ${430 + i * 9} ${600 - i * 8}, ${900 + i * 4} ${270 + i * 4}`}
            stroke={i % 3 === 0 ? '#D8AE56' : '#10BEB1'}
            strokeOpacity={0.08 + (i % 4) * 0.025}
            strokeWidth="0.8"
          />
        ))}
      </g>

      <g>
        {nodes.map(([cx, cy], index) => (
          <circle
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r={index % 5 === 0 ? 4.4 : 2.4}
            fill={index % 4 === 0 ? '#EBC66B' : '#A9EDE2'}
            opacity={0.55 + (index % 3) * 0.15}
            filter={index % 5 === 0 ? 'url(#node-glow)' : undefined}
          />
        ))}
      </g>

      <g className="network-labels">
        {labels.map(({ text, x, y }) => (
          <g key={`${text}-${x}`} transform={`translate(${x} ${y})`}>
            <rect x="0" y="0" width={text.length * 6.6 + 13} height="18" rx="3" fill="#07111E" stroke="#D5A94B" strokeOpacity="0.7" />
            <text x="6" y="12.5" fill="#E7C46C" fontSize="9" fontFamily="Inter, sans-serif">{text}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}
