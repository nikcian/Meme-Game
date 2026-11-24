// Set di icone essenziale, disegnato su griglia 24×24 (tratto arrotondato).

const PATHS = {
  play: <path d="M8 5.2v13.6a.8.8 0 0 0 1.2.7l10.6-6.8a.8.8 0 0 0 0-1.4L9.2 4.5a.8.8 0 0 0-1.2.7z" fill="currentColor" stroke="none" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  x: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.2A8.2 8.2 0 1 1 9.8 4a6.6 6.6 0 0 0 10.2 10.2z" />,
  volume: (
    <>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="M15.5 9.2a4 4 0 0 1 0 5.6M18.4 6.6a7.6 7.6 0 0 1 0 10.8" />
    </>
  ),
  'volume-off': (
    <>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="M16 9.5l5 5M21 9.5l-5 5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  'user-plus': (
    <>
      <circle cx="9.5" cy="8" r="4" />
      <path d="M2.5 20.5a7 7 0 0 1 14 0M19 8v6M16 11h6" />
    </>
  ),
  login: <path d="M10 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20H10M14 16l4-4-4-4M18 12H9" />,
  logout: <path d="M14 4h3.5A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5H14M10 16l-4-4 4-4M6 12h9" />,
  history: (
    <>
      <path d="M3.8 12a8.2 8.2 0 1 0 2.4-5.8L3.8 8.6" />
      <path d="M3.8 4.5v4.1h4.1M12 8v4.5l3 1.8" />
    </>
  ),
  trophy: (
    <>
      <path d="M7.5 4h9v4.5a4.5 4.5 0 0 1-9 0z" />
      <path d="M7.5 6H5a2.5 2.5 0 0 0 2.7 4.3M16.5 6H19a2.5 2.5 0 0 1-2.7 4.3M12 13v3.5M8.5 20h7M9.5 16.5h5V20h-5z" />
    </>
  ),
  'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
  refresh: <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4" />,
  share: <path d="M12 3.5v11M8 7.5l4-4 4 4M5 12.5v5.5A2.5 2.5 0 0 0 7.5 20.5h9A2.5 2.5 0 0 0 19 18v-5.5" />,
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2.5" />
      <path d="M15.5 8.5V6.5A2.5 2.5 0 0 0 13 4H6.5A2.5 2.5 0 0 0 4 6.5V13a2.5 2.5 0 0 0 2.5 2.5h2" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  'eye-off': (
    <>
      <path d="M10 5.8a9.6 9.6 0 0 1 2-.3c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4M6.6 6.9A16.4 16.4 0 0 0 2.5 12S6 18.5 12 18.5a9.4 9.4 0 0 0 5.1-1.5" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M4 4l16 16" />
    </>
  ),
  sparkles: (
    <>
      <path d="M11 3.5l1.7 4.6 4.6 1.7-4.6 1.7L11 16.1l-1.7-4.6-4.6-1.7 4.6-1.7z" />
      <path d="M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
    </>
  ),
  home: <path d="M4 10.8L12 4l8 6.8v8.7a1.5 1.5 0 0 1-1.5 1.5H14.5v-6h-5v6H5.5A1.5 1.5 0 0 1 4 19.5z" />,
  flame: <path d="M12 3c.8 3.4 5.5 5.6 5.5 10.2a5.5 5.5 0 0 1-11 0c0-2.6 1.4-3.9 2.5-5.3.4 1.4 1.4 2.3 2.5 2.4-.7-2.6-.4-4.9.5-7.3z" />,
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" />
    </>
  ),
  zap: <path d="M13 2.8L5.2 13.2h6l-1 8 7.8-10.4h-6z" />,
  crown: <path d="M3.5 8.5l4.6 3.8L12 5.5l3.9 6.8 4.6-3.8-1.8 10H5.3z" />,
  keyboard: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
      <path d="M6.5 10h1M10.5 10h1M14.5 10h1M8 14h8" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.6v.2" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 4.3L2.9 17.5A2 2 0 0 0 4.6 20.5h14.8a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z" />
      <path d="M12 9.5v4M12 16.8v.2" />
    </>
  ),
  'chevron-down': <path d="M6 9.5l6 6 6-6" />,
  code: <path d="M8.5 7L3.5 12l5 5M15.5 7l5 5-5 5" />,
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="M20.5 15.5l-4.5-4.5-8.5 8.5" />
    </>
  ),
  chart: <path d="M4 20h16M7 16.5V11M12 16.5V6.5M17 16.5v-3.5" />,
  medal: (
    <>
      <circle cx="12" cy="15" r="5.5" />
      <path d="M8.8 10.5L6 3.5h4.2l1.8 4M15.2 10.5L18 3.5h-4.2L12 7.5M12 12.5v5" />
    </>
  ),
  door: <path d="M5.5 20.5V5a1.5 1.5 0 0 1 1.5-1.5h8A1.5 1.5 0 0 1 16.5 5v15.5M3 20.5h18M13 12v.5" />,
};

/**
 * @param {{ name: keyof typeof PATHS, size?: number, className?: string, strokeWidth?: number, title?: string }} props
 */
export function Icon({ name, size = 20, className, strokeWidth = 2.2, title }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      aria-label={title}
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
