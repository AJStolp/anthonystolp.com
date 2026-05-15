type Props = {
  className?: string;
  variant?: 1 | 2 | 3;
  opacity?: number;
};

const PATHS: Record<NonNullable<Props["variant"]>, string> = {
  // Wide low-slung cumulus
  1: "M40 90 C 30 60, 80 50, 110 65 C 130 35, 200 35, 220 65 C 260 45, 320 65, 320 95 C 360 90, 380 130, 350 140 C 360 165, 310 175, 280 160 C 250 180, 180 180, 150 160 C 110 175, 60 165, 50 140 C 20 135, 20 100, 40 90 Z",
  // Tall billowy
  2: "M30 110 C 20 80, 60 60, 90 75 C 100 45, 170 40, 195 75 C 240 60, 290 90, 280 120 C 320 130, 320 170, 280 175 C 270 200, 210 205, 180 185 C 140 205, 80 195, 70 170 C 30 165, 10 130, 30 110 Z",
  // Long stratus
  3: "M20 100 C 10 80, 60 70, 90 85 C 110 60, 180 60, 210 85 C 250 70, 320 80, 350 100 C 400 85, 460 100, 470 125 C 510 130, 510 160, 470 165 C 450 185, 380 185, 350 170 C 310 185, 230 185, 200 165 C 160 180, 90 175, 70 155 C 30 155, 0 125, 20 100 Z",
};

export function Cloud({ className, variant = 1, opacity = 1 }: Props) {
  const path = PATHS[variant];
  const viewBox = variant === 3 ? "0 0 510 200" : "0 0 380 210";
  return (
    <svg
      viewBox={viewBox}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="presentation"
      style={{ opacity }}
    >
      <defs>
        <linearGradient id={`cloud-fill-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="65%" stopColor="#fbfdff" />
          <stop offset="100%" stopColor="#dde7f0" />
        </linearGradient>
        <filter id={`cloud-soft-${variant}`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="0.6" />
        </filter>
      </defs>
      <path
        d={path}
        fill={`url(#cloud-fill-${variant})`}
        filter={`url(#cloud-soft-${variant})`}
      />
    </svg>
  );
}
