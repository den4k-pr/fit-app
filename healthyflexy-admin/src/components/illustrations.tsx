/** Векторні ілюстрації CRM у стилі застосунку: мʼякі форми, лісовий і мʼятний */

export function HeroIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 320" className={className} aria-hidden>
      <defs>
        <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#BDF2D2" stopOpacity="0.55" />
          <stop offset="1" stopColor="#BDF2D2" stopOpacity="0" />
        </linearGradient>
        <clipPath id="hero-clip">
          <circle cx="210" cy="160" r="150" />
        </clipPath>
      </defs>
      <circle cx="210" cy="160" r="150" fill="url(#hero-sky)" />
      <g clipPath="url(#hero-clip)">
      <circle cx="320" cy="70" r="26" fill="#F0C040" opacity="0.9" />
      {/* пагорби */}
      <path d="M20 270c60-50 120-58 190-30s130 20 190-14v94H20z" fill="#33B26E" opacity="0.35" />
      <path d="M0 290c80-36 150-40 220-18s130 14 200-8v56H0z" fill="#23784D" opacity="0.55" />
      </g>
      {/* батько/мати: вправа з піднятими руками */}
      <g transform="translate(130 120)">
        <circle cx="30" cy="0" r="16" fill="#F2C9A8" />
        <path d="M18-8c4-12 22-14 28-2-6-2-18-2-28 2z" fill="#D9D9D9" />
        <path d="M14 22h32l6 58H8z" fill="#2A9D62" />
        <path d="M14 26 -6 -10M46 26l20-36" stroke="#F2C9A8" strokeWidth="9" strokeLinecap="round" />
        <path d="M20 80l-4 52M40 80l6 52" stroke="#17593A" strokeWidth="11" strokeLinecap="round" />
      </g>
      {/* дитина з телефоном */}
      <g transform="translate(240 150)">
        <circle cx="24" cy="0" r="13" fill="#E8B48C" />
        <path d="M12-4c2-12 22-14 26 0-8-4-18-4-26 0z" fill="#4A3426" />
        <path d="M10 18h28l4 48H6z" fill="#17593A" />
        <path d="M36 28l14 14" stroke="#E8B48C" strokeWidth="7" strokeLinecap="round" />
        <rect x="46" y="30" width="16" height="26" rx="4" fill="#16271D" />
        <rect x="48.5" y="33" width="11" height="18" rx="2" fill="#BDF2D2" />
        <path d="M16 66l-2 36M32 66l4 36" stroke="#23784D" strokeWidth="9" strokeLinecap="round" />
      </g>
      {/* серце між ними */}
      <path d="M214 112s-16-9.6-16-21a8.5 8.5 0 0 1 16-4 8.5 8.5 0 0 1 16 4c0 11.4-16 21-16 21z" fill="#E24B4A" />
      {/* листочки */}
      <path d="M70 250c0-24 20-40 38-44-4 20-18 38-38 44z" fill="#17593A" />
      <path d="M360 240c-4-20 8-38 24-44 2 18-8 36-24 44z" fill="#17593A" opacity="0.8" />
    </svg>
  );
}

export function IconBlob({ children, tone = 'green' }: { children: React.ReactNode; tone?: 'green' | 'gold' | 'violet' | 'blue' | 'red' }) {
  const bg = { green: '#E9F6EE', gold: '#FDF4E3', violet: '#EEEDFE', blue: '#E6F1FB', red: '#FDF0EF' }[tone];
  const fg = { green: '#17593A', gold: '#9C7420', violet: '#5B4DB8', blue: '#1F5E9E', red: '#B5473A' }[tone];
  return (
    <div className="relative grid size-14 place-items-center" style={{ color: fg }}>
      <svg viewBox="0 0 56 56" className="absolute inset-0" aria-hidden>
        <path d="M28 2c14 0 26 8 26 24s-10 28-26 28S2 44 2 28 14 2 28 2z" fill={bg} />
      </svg>
      <span className="relative">{children}</span>
    </div>
  );
}

export function EmptyIllustration() {
  return (
    <svg viewBox="0 0 160 120" className="h-28 w-auto" aria-hidden>
      <ellipse cx="80" cy="104" rx="56" ry="8" fill="#DCEBE1" />
      <rect x="40" y="30" width="80" height="64" rx="12" fill="#fff" stroke="#B9E0C7" strokeWidth="2" />
      <path d="M40 50h80" stroke="#B9E0C7" strokeWidth="2" />
      <circle cx="52" cy="40" r="3" fill="#33B26E" />
      <circle cx="62" cy="40" r="3" fill="#F0C040" />
      <rect x="54" y="62" width="52" height="6" rx="3" fill="#E9F6EE" />
      <rect x="54" y="74" width="34" height="6" rx="3" fill="#E9F6EE" />
      <path d="M118 22c0-10 8-16 16-18-2 9-8 16-16 18z" fill="#33B26E" />
    </svg>
  );
}

export function PaletteIllustration() {
  return (
    <svg viewBox="0 0 64 64" className="size-14" aria-hidden>
      <path d="M32 6C17 6 6 17 6 31c0 13 10 23 22 23 4 0 5-3 3-6-2-3 0-6 4-6h6c9 0 17-7 17-16C58 15 46 6 32 6z" fill="#E9F6EE" stroke="#17593A" strokeWidth="2.5" />
      <circle cx="20" cy="28" r="4.5" fill="#E24B4A" />
      <circle cx="28" cy="17" r="4.5" fill="#F0C040" />
      <circle cx="41" cy="17" r="4.5" fill="#33B26E" />
      <circle cx="47" cy="29" r="4.5" fill="#378ADD" />
    </svg>
  );
}

export function TextsIllustration() {
  return (
    <svg viewBox="0 0 64 64" className="size-14" aria-hidden>
      <rect x="10" y="6" width="36" height="50" rx="7" fill="#E9F6EE" stroke="#17593A" strokeWidth="2.5" />
      <path d="M18 20h20M18 28h20M18 36h12" stroke="#33B26E" strokeWidth="3" strokeLinecap="round" />
      <path d="M40 50l14-14 5 5-14 14h-5z" fill="#F0C040" stroke="#17593A" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

export function LimitsIllustration() {
  return (
    <svg viewBox="0 0 64 64" className="size-14" aria-hidden>
      <circle cx="32" cy="34" r="24" fill="#E9F6EE" stroke="#17593A" strokeWidth="2.5" />
      <path d="M14 40a18 18 0 0 1 36 0" fill="none" stroke="#33B26E" strokeWidth="5" strokeLinecap="round" />
      <path d="M32 40l10-12" stroke="#17593A" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="32" cy="40" r="4" fill="#17593A" />
    </svg>
  );
}

export function DumbbellIllustration() {
  return (
    <svg viewBox="0 0 64 64" className="size-14" aria-hidden>
      <circle cx="32" cy="32" r="28" fill="#E9F6EE" />
      <rect x="8" y="24" width="8" height="16" rx="3" fill="#17593A" />
      <rect x="15" y="20" width="7" height="24" rx="3" fill="#23784D" />
      <rect x="42" y="20" width="7" height="24" rx="3" fill="#23784D" />
      <rect x="48" y="24" width="8" height="16" rx="3" fill="#17593A" />
      <rect x="22" y="29" width="20" height="6" rx="3" fill="#33B26E" />
    </svg>
  );
}

export function CalendarIllustration() {
  return (
    <svg viewBox="0 0 64 64" className="size-14" aria-hidden>
      <rect x="8" y="12" width="48" height="44" rx="9" fill="#fff" stroke="#17593A" strokeWidth="2.5" />
      <path d="M8 24h48" stroke="#17593A" strokeWidth="2.5" />
      <path d="M20 8v8M44 8v8" stroke="#17593A" strokeWidth="3" strokeLinecap="round" />
      <circle cx="21" cy="34" r="3.5" fill="#33B26E" />
      <circle cx="32" cy="34" r="3.5" fill="#33B26E" />
      <circle cx="43" cy="34" r="3.5" fill="#DCEBE1" />
      <circle cx="21" cy="45" r="3.5" fill="#33B26E" />
      <circle cx="32" cy="45" r="3.5" fill="#F0C040" />
    </svg>
  );
}

export function PeopleIllustration() {
  return (
    <svg viewBox="0 0 64 64" className="size-14" aria-hidden>
      <circle cx="32" cy="32" r="28" fill="#E9F6EE" />
      <circle cx="24" cy="24" r="7" fill="#17593A" />
      <path d="M11 46c1-9 7-14 13-14s12 5 13 14z" fill="#17593A" />
      <circle cx="42" cy="27" r="6" fill="#33B26E" />
      <path d="M31 48c1-8 6-12 11-12s10 4 11 12z" fill="#33B26E" />
    </svg>
  );
}
