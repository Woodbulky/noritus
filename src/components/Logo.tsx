/** The N whose right stem ends in a coral dot: "the file stays here". */
export function Mark({ onDark }: { onDark?: boolean }) {
  return (
    <svg className={onDark ? 'mark on-dark' : 'mark'} viewBox="0 0 40 40" aria-hidden="true">
      <rect className="m-tile" x="2" y="2" width="36" height="36" rx="11" />
      <path className="m-n" pathLength={100} d="M12.5 28V12.5L27.5 28V13" />
      <g className="m-dotg">
        <circle className="m-dot" cx="27.5" cy="12" r="3.3" />
      </g>
    </svg>
  )
}

export function Brand() {
  return (
    <a className="brand" href="/" aria-label="Noritus home">
      <span className="logo">
        <Mark />
      </span>
      noritus<span className="stop">.</span>
    </a>
  )
}
