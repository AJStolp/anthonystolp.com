type Props = {
  className?: string;
};

export function HouseIllustration({ className }: Props) {
  return (
    <svg
      viewBox="0 0 1200 540"
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="presentation"
    >
      <defs>
        <linearGradient id="stucco" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbf4e6" />
          <stop offset="55%" stopColor="#efe2c4" />
          <stop offset="100%" stopColor="#d6c39c" />
        </linearGradient>

        <linearGradient id="stucco-shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8d8b6" />
          <stop offset="100%" stopColor="#b89c6c" />
        </linearGradient>

        <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e2eef7" />
          <stop offset="35%" stopColor="#a8c8e0" />
          <stop offset="100%" stopColor="#4f7693" />
        </linearGradient>

        <linearGradient id="glass-warm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde9c8" />
          <stop offset="50%" stopColor="#e9b888" />
          <stop offset="100%" stopColor="#9a6a47" />
        </linearGradient>

        <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b89066" />
          <stop offset="100%" stopColor="#6a4a2c" />
        </linearGradient>

        <linearGradient id="pool" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bcd9eb" />
          <stop offset="100%" stopColor="#5b85a3" />
        </linearGradient>

        <linearGradient id="deck" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8dfcc" />
          <stop offset="100%" stopColor="#b8a786" />
        </linearGradient>

        <linearGradient id="shadow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(14,26,36,0.28)" />
          <stop offset="100%" stopColor="rgba(14,26,36,0)" />
        </linearGradient>

        <filter id="house-shadow" x="-5%" y="-5%" width="110%" height="120%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="6" />
          <feOffset dx="0" dy="6" result="offsetblur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.18" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* === Ground shadow under whole building === */}
      <ellipse cx="600" cy="500" rx="500" ry="14" fill="url(#shadow)" />

      {/* === Pool deck === */}
      <g>
        <rect x="180" y="430" width="840" height="60" fill="url(#deck)" />
        <rect x="180" y="430" width="840" height="3" fill="#fff" opacity="0.4" />
        {/* Pool */}
        <rect x="280" y="450" width="380" height="34" fill="url(#pool)" rx="2" />
        <rect x="285" y="453" width="370" height="2" fill="#fff" opacity="0.55" />
        <rect x="295" y="462" width="40" height="1.5" fill="#fff" opacity="0.5" />
        <rect x="380" y="470" width="60" height="1.5" fill="#fff" opacity="0.45" />
        <rect x="510" y="465" width="80" height="1.5" fill="#fff" opacity="0.4" />
      </g>

      {/* === Main floor (slightly recessed under cantilever) === */}
      <g filter="url(#house-shadow)">
        {/* Floor slab */}
        <rect x="220" y="280" width="760" height="14" fill="url(#wood)" />
        <rect x="220" y="294" width="760" height="6" fill="#3d2918" />

        {/* Main floor glass wall */}
        <rect x="240" y="300" width="720" height="128" fill="url(#glass)" />

        {/* Glass mullions (vertical) */}
        <g fill="#fbf4e6" opacity="0.85">
          <rect x="358" y="300" width="3" height="128" />
          <rect x="476" y="300" width="3" height="128" />
          <rect x="594" y="300" width="3" height="128" />
          <rect x="712" y="300" width="3" height="128" />
          <rect x="830" y="300" width="3" height="128" />
        </g>

        {/* Door (warm interior glow) */}
        <rect x="540" y="320" width="100" height="108" fill="url(#glass-warm)" opacity="0.95" />
        <rect x="540" y="320" width="100" height="2" fill="#fff" opacity="0.6" />
        <rect x="588" y="320" width="2" height="108" fill="#fbf4e6" opacity="0.9" />

        {/* Subtle reflection band */}
        <rect x="240" y="305" width="720" height="6" fill="#fff" opacity="0.45" />

        {/* Bottom trim */}
        <rect x="220" y="428" width="760" height="3" fill="#2a1f12" />
      </g>

      {/* === Cantilevered upper level (wider, overhanging) === */}
      <g filter="url(#house-shadow)">
        {/* Stucco mass */}
        <rect x="180" y="160" width="840" height="120" fill="url(#stucco)" />

        {/* Top edge highlight */}
        <rect x="180" y="160" width="840" height="3" fill="#fff" opacity="0.5" />

        {/* Long horizontal window strip */}
        <rect x="220" y="190" width="760" height="62" fill="url(#glass)" />
        <rect x="220" y="192" width="760" height="4" fill="#fff" opacity="0.5" />

        {/* Window mullions */}
        <g fill="url(#stucco)">
          <rect x="346" y="190" width="3" height="62" />
          <rect x="472" y="190" width="3" height="62" />
          <rect x="598" y="190" width="3" height="62" />
          <rect x="724" y="190" width="3" height="62" />
          <rect x="850" y="190" width="3" height="62" />
        </g>

        {/* Soft window panes lit warm (golden hour) */}
        <rect x="598" y="190" width="126" height="62" fill="url(#glass-warm)" opacity="0.6" />

        {/* Bottom shadow gradient on stucco (cantilever underside) */}
        <rect x="180" y="270" width="840" height="10" fill="url(#shadow)" />

        {/* Roof line */}
        <rect x="170" y="148" width="860" height="12" fill="#1f2a35" />
        <rect x="170" y="148" width="860" height="2" fill="#3a4a5a" />
      </g>

      {/* === Support columns under cantilever (visible at sides) === */}
      <rect x="200" y="280" width="14" height="150" fill="url(#stucco-shade)" />
      <rect x="986" y="280" width="14" height="150" fill="url(#stucco-shade)" />

      {/* === Landscaping (plants flanking the entry) === */}
      <g>
        {/* Left planter */}
        <ellipse cx="245" cy="430" rx="32" ry="6" fill="#2a3825" opacity="0.5" />
        <path
          d="M225 430 Q 235 380, 245 400 Q 255 365, 265 405 Q 270 380, 268 430 Z"
          fill="#3a5a35"
        />
        <path
          d="M232 425 Q 238 395, 246 410 Q 254 385, 262 415"
          stroke="#557a4a"
          strokeWidth="1.5"
          fill="none"
          opacity="0.7"
        />
        {/* Right planter */}
        <ellipse cx="955" cy="430" rx="32" ry="6" fill="#2a3825" opacity="0.5" />
        <path
          d="M935 430 Q 945 380, 955 400 Q 965 365, 975 405 Q 980 380, 978 430 Z"
          fill="#3a5a35"
        />
        {/* Far left small palm */}
        <line x1="135" y1="430" x2="135" y2="395" stroke="#5a3f24" strokeWidth="2" />
        <path
          d="M135 395 Q 110 380, 100 388 M135 395 Q 160 380, 170 388 M135 395 Q 115 365, 108 372 M135 395 Q 155 365, 162 372"
          stroke="#557a4a"
          strokeWidth="2"
          fill="none"
        />
        {/* Far right small palm */}
        <line x1="1065" y1="430" x2="1065" y2="395" stroke="#5a3f24" strokeWidth="2" />
        <path
          d="M1065 395 Q 1040 380, 1030 388 M1065 395 Q 1090 380, 1100 388 M1065 395 Q 1045 365, 1038 372 M1065 395 Q 1085 365, 1092 372"
          stroke="#557a4a"
          strokeWidth="2"
          fill="none"
        />
      </g>
    </svg>
  );
}
