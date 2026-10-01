/**
 * Lossless metadata removal: the image data is copied byte for byte and only
 * metadata blocks are dropped. No DOM, so Node checks test it.
 */

export type Stripped = { bytes: Uint8Array; removed: string[] }

const ascii = (b: Uint8Array, at: number, n: number) => String.fromCharCode(...b.subarray(at, at + n))
const concat = (parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.length
  }
  return out
}

/** What an EXIF block (TIFF data after "Exif\0\0") holds: the photo's orientation and the kinds of personal data in it. */
export function readExif(tiff: Uint8Array): { orientation: number; found: string[] } {
  const found = new Set<string>()
  let orientation = 1
  try {
    const v = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength)
    const le = v.getUint16(0) === 0x4949
    const ifd = v.getUint32(4, le)
    for (let i = 0, n = v.getUint16(ifd, le); i < n; i++) {
      const e = ifd + 2 + i * 12
      const tag = v.getUint16(e, le)
      if (tag === 0x0112) orientation = v.getUint16(e + 8, le)
      if (tag === 0x8825) found.add('GPS location')
      if (tag === 0x010f || tag === 0x0110) found.add('camera make and model')
      if (tag === 0x8769 || tag === 0x0132) found.add('date and camera settings')
    }
  } catch {
    // A damaged block still gets removed; we just can't say what was in it.
  }
  return { orientation: orientation >= 1 && orientation <= 8 ? orientation : 1, found: [...found] }
}

/** A minimal EXIF APP1 holding only the orientation, so a rotated photo stays the right way up. */
export function orientationApp1(orientation: number) {
  // prettier-ignore
  return new Uint8Array([
    0xff, 0xe1, 0x00, 0x22, // APP1, length 34
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // "Exif\0\0"
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, // big-endian TIFF, IFD at 8
    0x00, 0x01, // one entry
    0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, orientation, 0x00, 0x00, // Orientation, SHORT, 1
    0x00, 0x00, 0x00, 0x00, // no next IFD
  ])
}

function jpeg(b: Uint8Array): Stripped {
  const keep: Uint8Array[] = [b.subarray(0, 2)]
  const removed = new Set<string>()
  let i = 2
  while (i + 1 < b.length) {
    if (b[i] !== 0xff) throw new Error('bad marker')
    const m = b[i + 1]
    if (m === 0xff) {
      i++ // fill byte
      continue
    }
    if (m === 0xd9) {
      keep.push(b.subarray(i, i + 2))
      if (i + 2 < b.length) removed.add('embedded previews')
      break // anything after the end marker (previews, depth maps) carries its own metadata
    }
    let end = i + 2 + ((b[i + 2] << 8) | b[i + 3])
    if (m === 0xda) {
      // Scan data runs to the next real marker (not a stuffed 0xFF00 or a restart marker).
      while (end + 1 < b.length && !(b[end] === 0xff && b[end + 1] !== 0 && (b[end + 1] < 0xd0 || b[end + 1] > 0xd7))) end++
    }
    const seg = b.subarray(i, end)
    const id = (n: number) => ascii(seg, 4, n)
    if (m === 0xe1 && id(6) === 'Exif\0\0') {
      const exif = readExif(seg.subarray(10))
      exif.found.forEach((f) => removed.add(f))
      if (!exif.found.length) removed.add('EXIF data')
      if (exif.orientation !== 1) keep.push(orientationApp1(exif.orientation))
    } else if (m === 0xe1) removed.add('XMP data')
    else if (m === 0xed) removed.add('IPTC captions and keywords')
    else if (m === 0xfe) removed.add('comments')
    else if ((m === 0xe2 && id(12) !== 'ICC_PROFILE\0') || (m >= 0xe3 && m <= 0xef && m !== 0xee)) removed.add('maker data')
    else keep.push(seg) // image data, tables, JFIF, colour profile, Adobe colour info
    i = end
  }
  return { bytes: concat(keep), removed: [...removed] }
}

const PNG_DROP: Record<string, string> = { tEXt: 'text notes', zTXt: 'text notes', iTXt: 'text notes', eXIf: 'EXIF data', tIME: 'edit date' }

function png(b: Uint8Array): Stripped {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength)
  const keep: Uint8Array[] = [b.subarray(0, 8)]
  const removed = new Set<string>()
  for (let i = 8; i + 8 <= b.length; ) {
    const end = i + 12 + v.getUint32(i)
    const type = ascii(b, i + 4, 4)
    if (PNG_DROP[type]) removed.add(PNG_DROP[type])
    else keep.push(b.subarray(i, end))
    i = end
    if (type === 'IEND') break
  }
  return { bytes: concat(keep), removed: [...removed] }
}

function webp(b: Uint8Array): Stripped {
  const keep: Uint8Array[] = [b.subarray(0, 12)]
  const removed = new Set<string>()
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength)
  for (let i = 12; i + 8 <= b.length; ) {
    const end = i + 8 + v.getUint32(i + 4, true) + (v.getUint32(i + 4, true) & 1)
    const type = ascii(b, i, 4)
    if (type === 'EXIF') removed.add('EXIF data')
    else if (type === 'XMP ') removed.add('XMP data')
    else keep.push(b.slice(i, end)) // a copy, so VP8X flags can be edited below
    i = end
  }
  const out = concat(keep)
  const ov = new DataView(out.buffer)
  ov.setUint32(4, out.length - 8, true)
  if (ascii(out, 12, 4) === 'VP8X') out[20] &= ~0x0c // clear the EXIF and XMP flags
  return { bytes: out, removed: [...removed] }
}

/** Strips JPG, PNG or WebP metadata. Null for other formats. Throws on a damaged file. */
export function strip(b: Uint8Array): (Stripped & { format: 'jpg' | 'png' | 'webp' }) | null {
  if (b[0] === 0xff && b[1] === 0xd8) return { ...jpeg(b), format: 'jpg' }
  if (ascii(b, 0, 8) === '\x89PNG\r\n\x1a\n') return { ...png(b), format: 'png' }
  if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') return { ...webp(b), format: 'webp' }
  return null
}
