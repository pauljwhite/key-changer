import type { SVGProps } from "react";

export type IconName =
  | "arrow"
  | "check"
  | "chevron"
  | "download"
  | "moon"
  | "pause"
  | "play"
  | "refresh"
  | "settings"
  | "sparkle"
  | "sun"
  | "volume"
  | "x";

const paths: Record<IconName, React.ReactNode> = {
  arrow: <><path d="M5 12h14"/><path d="m14 7 5 5-5 5"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  chevron: <path d="m8 10 4 4 4-4"/>,
  download: <><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></>,
  moon: <path d="M20.5 14.2A8 8 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z"/>,
  pause: <><path d="M9 5v14"/><path d="M15 5v14"/></>,
  play: <path d="m8 5 11 7-11 7Z"/>,
  refresh: <><path d="M20 7v5h-5"/><path d="M19 12a7.5 7.5 0 1 0-2 5"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
  sparkle: <><path d="m12 3 1.1 3.1L16 7.5l-2.9 1.4L12 12l-1.1-3.1L8 7.5l2.9-1.4Z"/><path d="m18.5 13 .7 2 1.8.8-1.8.9-.7 2-.7-2-1.8-.9 1.8-.8Z"/><path d="m6 14 .8 2.2 2.2.8-2.2.8L6 20l-.8-2.2L3 17l2.2-.8Z"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
  volume: <><path d="M6 9H3v6h3l5 4V5Z"/><path d="M15 9a4 4 0 0 1 0 6"/><path d="M18 6a8 8 0 0 1 0 12"/></>,
  x: <><path d="m6 6 12 12"/><path d="m18 6-12 12"/></>,
};

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      {paths[name]}
    </svg>
  );
}

export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="brand-accent" x1="8" y1="4" x2="55" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--accent-pale)" />
          <stop offset="1" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      <rect x="4.5" y="4.5" width="55" height="55" rx="18" className="brand-body" />
      <path d="M17 18v28M27 18v28M37 18v28M47 18v28" className="brand-whites" />
      <path d="M23 18v15M33 18v15M43 18v15" className="brand-blacks" />
      <path d="M18 46c9-1 14-4 20-11 3-3 6-4 9-4" className="brand-path" />
    </svg>
  );
}
