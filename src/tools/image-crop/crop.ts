/** Crop-box math in image pixels. No DOM, so Node checks test it. */

export type Box = { x: number; y: number; w: number; h: number }
export type Handle = 'move' | 'nw' | 'ne' | 'sw' | 'se'

const MIN = 8
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** The largest centred box with `ratio` (w/h), or the whole image when free. */
export function centred(W: number, H: number, ratio: number | null): Box {
  if (!ratio) return { x: 0, y: 0, w: W, h: H }
  let w = W
  let h = w / ratio
  if (h > H) [h, w] = [H, H * ratio]
  return { x: (W - w) / 2, y: (H - h) / 2, w, h }
}

/** `b` after dragging `handle` by dx, dy. The opposite corner stays put; `ratio` keeps the shape. */
export function drag(b: Box, handle: Handle, dx: number, dy: number, W: number, H: number, ratio: number | null): Box {
  if (handle === 'move') return { ...b, x: clamp(b.x + dx, 0, W - b.w), y: clamp(b.y + dy, 0, H - b.h) }
  const east = handle === 'ne' || handle === 'se'
  const south = handle === 'sw' || handle === 'se'
  const ax = east ? b.x : b.x + b.w
  const ay = south ? b.y : b.y + b.h
  const maxW = east ? W - ax : ax
  const maxH = south ? H - ay : ay
  let w = clamp(east ? b.w + dx : b.w - dx, MIN, maxW)
  let h = clamp(south ? b.h + dy : b.h - dy, MIN, maxH)
  if (ratio) {
    if (w / h > ratio) h = w / ratio
    else w = h * ratio
    if (w > maxW) [w, h] = [maxW, maxW / ratio]
    if (h > maxH) [w, h] = [maxH * ratio, maxH]
  }
  return { x: east ? ax : ax - w, y: south ? ay : ay - h, w, h }
}

/** Whole pixels inside the image, for the encoder. */
export function pixels(b: Box, W: number, H: number): Box {
  const x = clamp(Math.round(b.x), 0, W - 1)
  const y = clamp(Math.round(b.y), 0, H - 1)
  return { x, y, w: clamp(Math.round(b.w), 1, W - x), h: clamp(Math.round(b.h), 1, H - y) }
}
