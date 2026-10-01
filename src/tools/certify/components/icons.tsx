/** The mockup's inline SVGs, in one place. All inherit currentColor. */

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

export const Check = ({ size = 16, width = 2.6 }: { size?: number; width?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={width} {...stroke}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

export const ChevronLeft = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke}>
    <path d="m15 18-6-6 6-6" />
  </svg>
)

export const ChevronRight = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke}>
    <path d="m9 18 6-6-6-6" />
  </svg>
)

export const Download = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke}>
    <path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" />
  </svg>
)

export const Close = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

export const Pencil = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke}>
    <path d="M4 20h4L20 8l-4-4L4 16v4Z" />
  </svg>
)

export const Eyedropper = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke}>
    <path d="m14 4 6 6m-2-2-8.5 8.5L5 18l1.5-4.5L15 5" />
  </svg>
)

export const Undo = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke}>
    <path d="M4 9h11a4 4 0 0 1 0 8H9M4 9l4-4M4 9l4 4" />
  </svg>
)

export const Redo = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke}>
    <path d="M20 9H9a4 4 0 0 0 0 8h6m5-8-4-4m4 4-4 4" />
  </svg>
)

export const Bookmark = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke}>
    <path d="M6 4h12v16l-6-4-6 4V4Z" />
  </svg>
)
