interface LogoProps {
  size?: number;
}

/** Single C-Shell mark: amber terminal-prompt chevron with a cursor block. */
export function Logo({ size = 18 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="1.5"
        y="1.5"
        width="21"
        height="21"
        rx="4"
        stroke="var(--accent, #f0a500)"
        strokeWidth="2"
        opacity="0.35"
      />
      <path
        d="M9 8l-4 4 4 4M15 8l4 4-4 4"
        stroke="var(--accent, #f0a500)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="11.5" y="15" width="2.5" height="4" rx="0.75" fill="var(--text-bright, #f0a500)" />
    </svg>
  );
}
