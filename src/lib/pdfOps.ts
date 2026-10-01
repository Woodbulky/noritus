/**
 * PDF operations on pdf-lib. Pure (no DOM), so they run in pdf.worker.ts and in
 * the Node checks. Every op takes one argument object plus a progress callback
 * and throws Errors whose message can be shown to the user as-is.
 */
import { degrees, EncryptedPDFError, PDFDocument, rgb, StandardFonts, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib'
import { centredOrigin, jpegOrientation, normalizeAngle, pageLabel, parseRanges, toUser, visualSize, type NumberFormat } from './pages'

export type Progress = (done: number, total: number) => void
export type Input = { name: string; bytes: Uint8Array }

const noop: Progress = () => {}

async function open({ name, bytes }: Input) {
  try {
    return await PDFDocument.load(bytes, { updateMetadata: false })
  } catch (e) {
    if (e instanceof EncryptedPDFError) throw new Error(`“${name}” is password-protected. Unlock it first, then try again.`)
    throw new Error(`“${name}” could not be opened. It may be damaged, or not a PDF.`)
  }
}

/** Page geometry as displayed: size, rotation, and a mapper to user space. */
function view(page: PDFPage) {
  const box = page.getCropBox()
  const r = normalizeAngle(page.getRotation().angle)
  const { w, h } = visualSize(box, r)
  return { w, h, r, at: (vx: number, vy: number) => toUser(box, r, vx, vy) }
}

function hexColor(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16) || 0
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

/** Every page of every file, in order. */
export async function merge({ files }: { files: Input[] }, progress = noop) {
  const out = await PDFDocument.create()
  for (const [i, f] of files.entries()) {
    const src = await open(f)
    for (const p of await out.copyPages(src, src.getPageIndices())) out.addPage(p)
    progress(i + 1, files.length)
  }
  return out.save()
}

/**
 * `ranges` null: one PDF per page. Otherwise one PDF per range ("1-3, 5"),
 * or, with `extract`, every listed page in a single PDF. Returns each PDF
 * with the 0-based pages it holds.
 */
export async function split({ file, ranges, extract }: { file: Input; ranges: string | null; extract?: boolean }, progress = noop) {
  const src = await open(file)
  const n = src.getPageCount()
  const groups = ranges === null ? Array.from({ length: n }, (_, i) => [i]) : parseRanges(ranges, n)
  const sets = extract ? [groups.flat()] : groups
  const outs: { pages: number[]; bytes: Uint8Array }[] = []
  for (const [i, pages] of sets.entries()) {
    const out = await PDFDocument.create()
    for (const p of await out.copyPages(src, pages)) out.addPage(p)
    outs.push({ pages, bytes: await out.save() })
    progress(i + 1, sets.length)
  }
  return outs
}

/** Pages in the given order, each turned by `rotate` more degrees clockwise. */
export async function organize({ file, pages }: { file: Input; pages: { index: number; rotate: number }[] }) {
  const src = await open(file)
  const out = await PDFDocument.create()
  const copied = await out.copyPages(src, pages.map((p) => p.index))
  copied.forEach((p, i) => {
    p.setRotation(degrees(normalizeAngle(p.getRotation().angle + pages[i].rotate)))
    out.addPage(p)
  })
  return out.save()
}

export type PageSize = 'a4' | 'letter' | 'fit'
const SIZES = { a4: [595.28, 841.89], letter: [612, 792] } as const

/** PNG/JPEG bytes as-is; anything else the browser can decode becomes a PNG. */
async function embedImage(doc: PDFDocument, { name, bytes }: Input): Promise<[PDFImage, number]> {
  try {
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return [await doc.embedPng(bytes), 1]
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return [await doc.embedJpg(bytes), jpegOrientation(bytes)]
    const bitmap = await createImageBitmap(new Blob([bytes as BlobPart]))
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0)
    const png = new Uint8Array(await (await canvas.convertToBlob({ type: 'image/png' })).arrayBuffer())
    return [await doc.embedPng(png), 1]
  } catch {
    throw new Error(`“${name}” could not be read as an image. Try saving it as a JPG or PNG.`)
  }
}

/**
 * One image per page. `fit` makes the page the image's size (1 px = 1 pt);
 * otherwise the page turns to match the image and the image is scaled into
 * the margins, centred.
 */
export async function imagesToPdf({ images, size, margin }: { images: Input[]; size: PageSize; margin: number }, progress = noop) {
  const doc = await PDFDocument.create()
  for (const [i, file] of images.entries()) {
    const [img, orientation] = await embedImage(doc, file)
    // ponytail: EXIF 3/6/8 (rotations) only; mirrored orientations (2/4/5/7) are drawn unmirrored.
    const quarter = orientation === 6 || orientation === 8
    const iw = quarter ? img.height : img.width
    const ih = quarter ? img.width : img.height
    let pw = iw
    let ph = ih
    let m = 0
    if (size !== 'fit') {
      const [a, b] = SIZES[size]
      ;[pw, ph] = iw > ih ? [b, a] : [a, b]
      m = margin
    }
    const scale = Math.min((pw - 2 * m) / iw, (ph - 2 * m) / ih)
    const dw = iw * scale
    const dh = ih * scale
    const bx = (pw - dw) / 2
    const by = (ph - dh) / 2
    const page = doc.addPage([pw, ph])
    // Drawn size is the raw image's; rotation pivots on the origin.
    const raw = quarter ? { width: dh, height: dw } : { width: dw, height: dh }
    if (orientation === 6) page.drawImage(img, { x: bx, y: by + dh, ...raw, rotate: degrees(-90) })
    else if (orientation === 8) page.drawImage(img, { x: bx + dw, y: by, ...raw, rotate: degrees(90) })
    else if (orientation === 3) page.drawImage(img, { x: bx + dw, y: by + dh, ...raw, rotate: degrees(180) })
    else page.drawImage(img, { x: bx, y: by, ...raw })
    progress(i + 1, images.length)
  }
  return doc.save()
}

async function standardFont(doc: PDFDocument, text: string, bold = false): Promise<PDFFont> {
  const font = await doc.embedFont(bold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica)
  try {
    font.encodeText(text)
  } catch {
    // ponytail: WinAnsi only; embed a bundled TTF via fontkit if non-Latin text is needed.
    throw new Error('Some characters can’t be drawn with the built-in font. Use Latin letters, numbers and common punctuation.')
  }
  return font
}

export type WatermarkOptions = {
  file: Input
  text: string
  /** PNG/JPEG to stamp instead of text. */
  image?: Input
  /** Text size in pt, or image width as a fraction of the page width. */
  size: number
  opacity: number
  angle: number
  color: string
}

/** Text or image, centred on every page. */
export async function watermark(o: WatermarkOptions, progress = noop) {
  const doc = await open(o.file)
  const font = o.image ? null : await standardFont(doc, o.text, true)
  const img = o.image ? (await embedImage(doc, o.image))[0] : null
  const pages = doc.getPages()
  pages.forEach((page, i) => {
    const v = view(page)
    if (img) {
      const w = v.w * o.size
      const h = (w * img.height) / img.width
      const at = centredOrigin(v.w / 2, v.h / 2, w, h, o.angle)
      page.drawImage(img, { ...v.at(at.x, at.y), width: w, height: h, rotate: degrees(o.angle + v.r), opacity: o.opacity })
    } else {
      const w = font!.widthOfTextAtSize(o.text, o.size)
      const h = font!.heightAtSize(o.size, { descender: false })
      const at = centredOrigin(v.w / 2, v.h / 2, w, h, o.angle)
      page.drawText(o.text, { ...v.at(at.x, at.y), size: o.size, font: font!, color: hexColor(o.color), opacity: o.opacity, rotate: degrees(o.angle + v.r) })
    }
    progress(i + 1, pages.length)
  })
  return doc.save()
}

export type NumberOptions = {
  file: Input
  format: NumberFormat
  vertical: 'top' | 'bottom'
  horizontal: 'left' | 'center' | 'right'
  start: number
  size: number
  margin: number
}

export async function pageNumbers(o: NumberOptions, progress = noop) {
  const doc = await open(o.file)
  const font = await standardFont(doc, 'Page 0123456789 of /')
  const pages = doc.getPages()
  const total = pages.length + o.start - 1
  pages.forEach((page, i) => {
    const v = view(page)
    const text = pageLabel(o.format, i + o.start, total)
    const w = font.widthOfTextAtSize(text, o.size)
    const h = font.heightAtSize(o.size, { descender: false })
    const x = o.horizontal === 'left' ? o.margin : o.horizontal === 'right' ? v.w - o.margin - w : (v.w - w) / 2
    const y = o.vertical === 'bottom' ? o.margin : v.h - o.margin - h
    page.drawText(text, { ...v.at(x, y), size: o.size, font, color: rgb(0.1, 0.1, 0.1), rotate: degrees(v.r) })
    progress(i + 1, pages.length)
  })
  return doc.save()
}

export type SignOptions = {
  file: Input
  signature: Input
  /** 0-based pages to sign. */
  pages: number[]
  /** Placement as fractions of the displayed page, from its top-left corner. */
  rect: { l: number; t: number; w: number; h: number }
}

export async function sign(o: SignOptions) {
  const doc = await open(o.file)
  const [img] = await embedImage(doc, o.signature)
  for (const i of o.pages) {
    const page = doc.getPage(i)
    const v = view(page)
    const w = o.rect.w * v.w
    const h = o.rect.h * v.h
    page.drawImage(img, { ...v.at(o.rect.l * v.w, (1 - o.rect.t - o.rect.h) * v.h), width: w, height: h, rotate: degrees(v.r) })
  }
  return doc.save()
}
