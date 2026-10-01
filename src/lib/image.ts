/** Pure image helpers: output sizes, formats and ICO packing. No DOM: Node checks test these. */

export const IMAGE_ACCEPT = 'image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif,.heic,.heif,.svg'

export type OutType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif'
export const EXT: Record<OutType, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' }
export const LABEL: Record<OutType, string> = { 'image/jpeg': 'JPG', 'image/png': 'PNG', 'image/webp': 'WebP', 'image/avif': 'AVIF' }

const ext = (name: string) => name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? ''
export const isHeic = (f: { name: string; type: string }) => /^image\/hei[cf]/.test(f.type) || ['heic', 'heif'].includes(ext(f.name))
export const isSvg = (f: { name: string; type: string }) => f.type === 'image/svg+xml' || ext(f.name) === 'svg'

/** The format a "keep the format" run writes: the input's when we can, JPG for HEIC photos, else PNG. */
export function keepType(f: { name: string; type: string }): OutType {
  if (isHeic(f)) return 'image/jpeg'
  const e = ext(f.name)
  if (f.type === 'image/jpeg' || e === 'jpg' || e === 'jpeg') return 'image/jpeg'
  if (f.type === 'image/webp' || e === 'webp') return 'image/webp'
  return 'image/png'
}

export type Rect = { x: number; y: number; w: number; h: number }

export type Fit =
  /** Multiply both sides, e.g. 0.5. */
  | { kind: 'scale'; scale: number }
  /** Shrink to fit inside w × h, never enlarge. 0 = no limit on that side. */
  | { kind: 'within'; w: number; h: number }
  /** Exactly w × h, cropping the overflow from the centre. */
  | { kind: 'cover'; w: number; h: number }
  /** Exactly w × h, the whole image centred inside, the rest left empty. */
  | { kind: 'contain'; w: number; h: number }

/** Where a w × h source lands: canvas size, the part of the source used, and where it is drawn. All whole pixels. */
export type Plan = { width: number; height: number; src: Rect; dst: Rect }

export function plan(w: number, h: number, fit?: Fit): Plan {
  const full = { x: 0, y: 0, w, h }
  const sized = (k: number): Plan => {
    const width = Math.max(1, Math.round(w * k))
    const height = Math.max(1, Math.round(h * k))
    return { width, height, src: full, dst: { x: 0, y: 0, w: width, h: height } }
  }
  if (!fit) return sized(1)
  if (fit.kind === 'scale') return sized(fit.scale)
  if (fit.kind === 'within') return sized(Math.min(1, fit.w ? fit.w / w : 1, fit.h ? fit.h / h : 1))
  if (fit.kind === 'cover') {
    const k = Math.max(fit.w / w, fit.h / h)
    const sw = Math.min(w, Math.round(fit.w / k))
    const sh = Math.min(h, Math.round(fit.h / k))
    return { width: fit.w, height: fit.h, src: { x: Math.floor((w - sw) / 2), y: Math.floor((h - sh) / 2), w: sw, h: sh }, dst: { x: 0, y: 0, w: fit.w, h: fit.h } }
  }
  const k = Math.min(fit.w / w, fit.h / h)
  const dw = Math.max(1, Math.round(w * k))
  const dh = Math.max(1, Math.round(h * k))
  return { width: fit.w, height: fit.h, src: full, dst: { x: Math.floor((fit.w - dw) / 2), y: Math.floor((fit.h - dh) / 2), w: dw, h: dh } }
}

/** "−42%" / "+8%" from input and output byte counts. */
export const change = (before: number, after: number) => {
  const p = Math.round((1 - after / before) * 100)
  return p >= 0 ? `−${p}%` : `+${-p}%`
}

/** A .ico holding PNG images, which every current browser reads. Sizes of 256+ are stored as 0, per the format. */
export function buildIco(pngs: { size: number; bytes: Uint8Array }[]): Uint8Array {
  const head = 6 + 16 * pngs.length
  const out = new Uint8Array(head + pngs.reduce((n, p) => n + p.bytes.length, 0))
  const v = new DataView(out.buffer)
  v.setUint16(2, 1, true) // type: icon
  v.setUint16(4, pngs.length, true)
  let at = head
  pngs.forEach((p, i) => {
    const e = 6 + 16 * i
    out[e] = out[e + 1] = p.size >= 256 ? 0 : p.size
    v.setUint16(e + 4, 1, true) // colour planes
    v.setUint16(e + 6, 32, true) // bits per pixel
    v.setUint32(e + 8, p.bytes.length, true)
    v.setUint32(e + 12, at, true)
    out.set(p.bytes, at)
    at += p.bytes.length
  })
  return out
}

/** One image through the worker: decode, crop, fit, encode. */
export type ImageJob = {
  file: Blob
  /** For error messages. */
  name: string
  heic?: boolean
  /** In source pixels, after EXIF rotation. */
  crop?: Rect
  fit?: Fit
  type: OutType
  /** 0–1, for JPG/WebP/AVIF. */
  quality?: number
  /** Fill behind transparent pixels. JPG gets white when unset. */
  background?: string
}
export type ImageOut = { blob: Blob; width: number; height: number }
