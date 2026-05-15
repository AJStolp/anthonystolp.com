type Props = {
  className?: string;
};

export function CitySkyline({ className }: Props) {
  return (
    <svg
      viewBox="0 0 600 800"
      className={className}
      preserveAspectRatio="xMidYMax slice"
      role="presentation"
    >
      <defs>
        <linearGradient id="sky-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8d5b9" />
          <stop offset="40%" stopColor="#e0b894" />
          <stop offset="100%" stopColor="#9a6e54" />
        </linearGradient>
        <linearGradient id="mtn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5a4434" />
          <stop offset="100%" stopColor="#2a1f18" />
        </linearGradient>
        <linearGradient id="bldg-1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1f2a35" />
          <stop offset="100%" stopColor="#0e1a24" />
        </linearGradient>
        <linearGradient id="bldg-2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a3845" />
          <stop offset="100%" stopColor="#172230" />
        </linearGradient>
        <linearGradient id="bldg-3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a4a5a" />
          <stop offset="100%" stopColor="#1f2a35" />
        </linearGradient>
      </defs>

      <rect width="600" height="800" fill="url(#sky-bg)" />

      <circle cx="430" cy="220" r="60" fill="#f3d8a3" opacity="0.85" />
      <circle cx="430" cy="220" r="100" fill="#f3d8a3" opacity="0.25" />

      <path
        d="M0 480 L80 380 L140 430 L220 350 L300 410 L380 320 L460 400 L540 360 L600 410 L600 800 L0 800 Z"
        fill="url(#mtn)"
        opacity="0.95"
      />

      <g>
        <rect x="40" y="470" width="60" height="330" fill="url(#bldg-1)" />
        <rect x="110" y="430" width="50" height="370" fill="url(#bldg-2)" />
        <rect x="170" y="500" width="40" height="300" fill="url(#bldg-1)" />
        <rect x="220" y="380" width="70" height="420" fill="url(#bldg-3)" />
        <rect x="300" y="450" width="55" height="350" fill="url(#bldg-1)" />
        <rect x="365" y="410" width="60" height="390" fill="url(#bldg-2)" />
        <rect x="435" y="490" width="45" height="310" fill="url(#bldg-1)" />
        <rect x="490" y="440" width="65" height="360" fill="url(#bldg-3)" />
        <rect x="560" y="500" width="40" height="300" fill="url(#bldg-2)" />
      </g>

      <g fill="#f3d8a3" opacity="0.55">
        <rect x="50" y="500" width="4" height="6" />
        <rect x="62" y="500" width="4" height="6" />
        <rect x="74" y="520" width="4" height="6" />
        <rect x="50" y="540" width="4" height="6" />
        <rect x="74" y="560" width="4" height="6" />
        <rect x="120" y="460" width="4" height="6" />
        <rect x="135" y="480" width="4" height="6" />
        <rect x="120" y="510" width="4" height="6" />
        <rect x="145" y="540" width="4" height="6" />
        <rect x="180" y="520" width="4" height="6" />
        <rect x="195" y="550" width="4" height="6" />
        <rect x="235" y="410" width="4" height="6" />
        <rect x="250" y="430" width="4" height="6" />
        <rect x="270" y="450" width="4" height="6" />
        <rect x="240" y="490" width="4" height="6" />
        <rect x="265" y="520" width="4" height="6" />
        <rect x="310" y="470" width="4" height="6" />
        <rect x="335" y="500" width="4" height="6" />
        <rect x="320" y="540" width="4" height="6" />
        <rect x="375" y="440" width="4" height="6" />
        <rect x="395" y="470" width="4" height="6" />
        <rect x="410" y="500" width="4" height="6" />
        <rect x="380" y="540" width="4" height="6" />
        <rect x="450" y="510" width="4" height="6" />
        <rect x="468" y="540" width="4" height="6" />
        <rect x="500" y="470" width="4" height="6" />
        <rect x="520" y="500" width="4" height="6" />
        <rect x="540" y="530" width="4" height="6" />
        <rect x="570" y="520" width="4" height="6" />
      </g>

      <rect x="0" y="780" width="600" height="20" fill="#1f1812" />
    </svg>
  );
}
