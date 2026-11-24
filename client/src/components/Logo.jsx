/** Logo originale del gioco: un fumetto che ride, con contorno e ombra "a sticker". */
export function LogoMark({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false" className="logo-mark">
      <path
        d="M10 8h44a6 6 0 0 1 6 6v28a6 6 0 0 1-6 6H31L19 58V48h-9a6 6 0 0 1-6-6V14a6 6 0 0 1 6-6z"
        transform="translate(3 3)"
        className="logo-mark__shadow"
      />
      <path
        d="M10 8h44a6 6 0 0 1 6 6v28a6 6 0 0 1-6 6H31L19 58V48h-9a6 6 0 0 1-6-6V14a6 6 0 0 1 6-6z"
        className="logo-mark__bubble"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M18.5 25.5l5-5 5 5M35.5 25.5l5-5 5 5"
        fill="none"
        className="logo-mark__ink"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M20 30.5h24a12 12 0 0 1-24 0z" className="logo-mark__mouth" />
      <ellipse cx="32" cy="39" rx="6" ry="3.2" className="logo-mark__tongue" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="logo">
      <LogoMark />
      <span className="logo__word">
        Meme<span className="logo__accent">Game</span>
      </span>
    </span>
  );
}
