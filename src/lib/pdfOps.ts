/**
 * PDF operations on pdf-lib. Pure (no DOM), so they run in pdf.worker.ts and in
 * the Node checks. Every op takes one argument object plus a progress callback
 * and throws Errors whose message can be shown to the user as-is.
 */
import { BlendMode, degrees, EncryptedPDFError, PDFCheckBox, PDFDict, PDFDocument, PDFDropdown, PDFHexString, PDFName, PDFNumber, PDFOptionList, PDFRadioGroup, PDFRawStream, PDFTextField, rgb, StandardFonts, type PDFFont, type PDFImage, type PDFPage, type PDFRef } from 'pdf-lib'
import { centredOrigin, jpegOrientation, normalizeAngle, pageLabel, parseRanges, toUser, visualSize, type NumberFormat } from './pages'

export type Progress = (done: number, total: number) => void
export type Input = { name: string; bytes: Uint8Array }

const noop: Progress = () => {}

/** AES-256 files can trip pdf-lib's parser before it notices the encryption, so look for the trailer key too. */
const encrypted = (bytes: Uint8Array) => new TextDecoder('latin1').decode(bytes.subarray(-65536)).includes('/Encrypt')

async function open({ name, bytes }: Input) {
  try {
    return await PDFDocument.load(bytes, { updateMetadata: false })
  } catch (e) {
    if (e instanceof EncryptedPDFError || encrypted(bytes)) throw new Error(`“${name}” is password-protected. Unlock it first, then try again.`)
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

/** Placement as fractions of the displayed page, from its top-left corner. */
export type Rect = { l: number; t: number; w: number; h: number }

/** A Rect in displayed points: left, bottom, width, height. */
const inPoints = (v: ReturnType<typeof view>, r: Rect) => ({ x: r.l * v.w, y: (1 - r.t - r.h) * v.h, w: r.w * v.w, h: r.h * v.h })

export type FormField = { name: string; kind: 'text' | 'check' | 'choice' | 'radio'; value: string; options: string[]; multiline: boolean }

/** The fillable fields of a PDF, in document order. Signature and button fields are left out. */
export async function readForm({ file }: { file: Input }): Promise<FormField[]> {
  const doc = await open(file)
  return doc
    .getForm()
    .getFields()
    .flatMap((f): FormField[] => {
      const name = f.getName()
      if (f instanceof PDFTextField) return [{ name, kind: 'text', value: f.getText() ?? '', options: [], multiline: f.isMultiline() }]
      if (f instanceof PDFCheckBox) return [{ name, kind: 'check', value: f.isChecked() ? 'yes' : '', options: [], multiline: false }]
      if (f instanceof PDFDropdown || f instanceof PDFOptionList) return [{ name, kind: 'choice', value: f.getSelected()[0] ?? '', options: f.getOptions(), multiline: false }]
      if (f instanceof PDFRadioGroup) return [{ name, kind: 'radio', value: f.getSelected() ?? '', options: f.getOptions(), multiline: false }]
      return []
    })
}

/** Fills fields by name. `flatten` bakes the answers into the page so they can no longer be edited. */
export async function fillForm({ file, values, flatten }: { file: Input; values: Record<string, string>; flatten: boolean }) {
  const doc = await open(file)
  const form = doc.getForm()
  for (const [name, value] of Object.entries(values)) {
    const f = form.getFieldMaybe(name)
    try {
      if (f instanceof PDFTextField) f.setText(value || undefined)
      else if (f instanceof PDFCheckBox) {
        if (value) f.check()
        else f.uncheck()
      } else if ((f instanceof PDFDropdown || f instanceof PDFOptionList || f instanceof PDFRadioGroup) && value) f.select(value)
    } catch {
      throw new Error(`“${name}” couldn’t take that answer. It may be longer than the field allows.`)
    }
  }
  try {
    form.updateFieldAppearances(await doc.embedFont(StandardFonts.Helvetica))
    if (flatten) form.flatten()
  } catch {
    throw new Error('Some answers use characters the built-in font can’t draw. Use Latin letters, numbers and common punctuation.')
  }
  return doc.save()
}

export type MarkKind = 'text' | 'highlight' | 'whiteout' | 'box' | 'ellipse'
export type Mark = { page: number; kind: MarkKind; rect: Rect; color: string; text?: string; size?: number }

/** Text, highlights, whiteout and shapes, drawn into the pages as vector content. */
export async function annotate({ file, marks }: { file: Input; marks: Mark[] }, progress = noop) {
  const doc = await open(file)
  const texts = marks.flatMap((m) => (m.kind === 'text' && m.text ? [m.text.replace(/\n/g, ' ')] : [])).join(' ')
  const font = texts ? await standardFont(doc, texts) : null
  marks.forEach((m, i) => {
    const page = doc.getPage(m.page)
    const v = view(page)
    const p = inPoints(v, m.rect)
    const rotate = degrees(v.r)
    const color = hexColor(m.color)
    if (m.kind === 'text') {
      const size = m.size ?? 14
      ;(m.text ?? '').split('\n').forEach((line, j) => {
        if (line) page.drawText(line, { ...v.at(p.x + 2, p.y + p.h - size * (j + 0.85) * 1.2), size, font: font!, color, rotate })
      })
    } else if (m.kind === 'ellipse') {
      page.drawEllipse({ ...v.at(p.x + p.w / 2, p.y + p.h / 2), xScale: p.w / 2, yScale: p.h / 2, borderColor: color, borderWidth: 2, rotate })
    } else {
      const paint = m.kind === 'highlight' ? { color, blendMode: BlendMode.Multiply } : m.kind === 'whiteout' ? { color: rgb(1, 1, 1) } : { borderColor: color, borderWidth: 2 }
      page.drawRectangle({ ...v.at(p.x, p.y), width: p.w, height: p.h, rotate, ...paint })
    }
    progress(i + 1, marks.length)
  })
  return doc.save()
}

/**
 * Pages listed in `images` are replaced by that picture (rendered with the
 * boxes already painted in), so the covered content is really gone. Other
 * pages are copied as they are.
 */
export async function redact({ file, images }: { file: Input; images: { page: number; image: Input }[] }, progress = noop) {
  const src = await open(file)
  const out = await PDFDocument.create()
  const copied = await out.copyPages(src, src.getPageIndices())
  for (const [i, page] of copied.entries()) {
    const hit = images.find((x) => x.page === i)
    if (hit) {
      const v = view(src.getPage(i))
      const [img] = await embedImage(out, hit.image)
      out.addPage([v.w, v.h]).drawImage(img, { x: 0, y: 0, width: v.w, height: v.h })
    } else out.addPage(page)
    progress(i + 1, copied.length)
  }
  return out.save()
}

export type OcrWord = { text: string; box: Rect }

/**
 * Lays recognised words over each page as invisible text, so the PDF can be
 * searched and copied while looking exactly the same.
 */
export async function ocrLayer({ file, pages }: { file: Input; pages: { page: number; words: OcrWord[] }[] }, progress = noop) {
  const doc = await open(file)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  pages.forEach(({ page: n, words }, i) => {
    const page = doc.getPage(n)
    const v = view(page)
    for (const w of words) {
      const p = inPoints(v, w.box)
      let width = 0
      try {
        width = font.widthOfTextAtSize(w.text, 1)
      } catch {
        // ponytail: Latin text only; embed a bundled TTF via fontkit to layer other scripts.
      }
      if (!width) continue
      const size = Math.max(1, Math.min(p.w / width, p.h * 1.3))
      page.drawText(w.text, { ...v.at(p.x, p.y + p.h * 0.2), size, font, opacity: 0, rotate: degrees(v.r) })
    }
    progress(i + 1, pages.length)
  })
  return doc.save()
}

export type CompressLevel = 'lossless' | 'balanced' | 'strong'
const PHOTO = { balanced: { side: 2000, quality: 0.72 }, strong: { side: 1400, quality: 0.5 } }
const name = (s: string) => PDFName.of(s)

/**
 * Re-saves with object streams, which packs the file's structure. Above
 * `lossless`, JPEG photos are scaled down to a longest side and re-encoded,
 * kept only where that makes them smaller.
 */
export async function compress({ file, level }: { file: Input; level: CompressLevel }, progress = noop) {
  const doc = await open(file)
  if (level !== 'lossless' && typeof OffscreenCanvas !== 'undefined') {
    const { side, quality } = PHOTO[level]
    const photos = doc.context.enumerateIndirectObjects().filter((e): e is [PDFRef, PDFRawStream] => {
      const o = e[1]
      if (!(o instanceof PDFRawStream) || o.dict.get(name('Subtype')) !== name('Image')) return false
      const cs = o.dict.get(name('ColorSpace'))
      // ponytail: plain RGB/grey JPEGs only; Flate images and CMYK/ICC JPEGs are kept as they are.
      return o.dict.get(name('Filter')) === name('DCTDecode') && (cs === name('DeviceRGB') || cs === name('DeviceGray')) && !o.dict.has(name('Decode'))
    })
    for (const [i, [ref, stream]] of photos.entries()) {
      try {
        const bmp = await createImageBitmap(new Blob([stream.contents as BlobPart], { type: 'image/jpeg' }))
        const scale = Math.min(1, side / Math.max(bmp.width, bmp.height))
        const w = Math.max(1, Math.round(bmp.width * scale))
        const h = Math.max(1, Math.round(bmp.height * scale))
        const canvas = new OffscreenCanvas(w, h)
        canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
        bmp.close()
        const jpg = new Uint8Array(await (await canvas.convertToBlob({ type: 'image/jpeg', quality })).arrayBuffer())
        if (jpg.length < stream.contents.length) {
          const dict = stream.dict.clone(doc.context)
          dict.set(name('Width'), PDFNumber.of(w))
          dict.set(name('Height'), PDFNumber.of(h))
          dict.set(name('ColorSpace'), name('DeviceRGB'))
          dict.delete(name('DecodeParms'))
          doc.context.assign(ref, PDFRawStream.of(dict, jpg))
        }
      } catch {
        // A photo the browser can't decode stays as it was.
      }
      progress(i + 1, photos.length)
    }
  }
  return doc.save({ useObjectStreams: true })
}

const INFO_KEYS = ['Title', 'Author', 'Subject', 'Keywords', 'Creator', 'Producer'] as const
export type Meta = Record<(typeof INFO_KEYS)[number], string> & { created: string; modified: string }

export async function readMeta({ file }: { file: Input }): Promise<Meta> {
  const doc = await open(file)
  const date = (d?: Date) => (d && !isNaN(+d) ? d.toISOString() : '')
  return {
    Title: doc.getTitle() ?? '',
    Author: doc.getAuthor() ?? '',
    Subject: doc.getSubject() ?? '',
    Keywords: doc.getKeywords() ?? '',
    Creator: doc.getCreator() ?? '',
    Producer: doc.getProducer() ?? '',
    created: date(doc.getCreationDate()),
    modified: date(doc.getModificationDate()),
  }
}

/**
 * Writes the document properties; an empty value removes that property.
 * `clear` removes every property and the dates. The XMP copy is always
 * dropped, so viewers can't show stale values from it.
 */
export async function writeMeta({ file, meta, clear }: { file: Input; meta: Partial<Meta>; clear: boolean }) {
  const doc = await open(file)
  const ctx = doc.context
  const found = ctx.trailerInfo.Info && ctx.lookup(ctx.trailerInfo.Info)
  const info = found instanceof PDFDict ? found : ctx.obj({})
  if (info !== found) ctx.trailerInfo.Info = ctx.register(info)
  for (const k of INFO_KEYS) {
    const v = clear ? '' : (meta[k] ?? '').trim()
    if (v) info.set(name(k), PDFHexString.fromText(v))
    else info.delete(name(k))
  }
  if (clear) ['CreationDate', 'ModDate', 'Trapped'].forEach((k) => info.delete(name(k)))
  doc.catalog.delete(name('Metadata'))
  return doc.save()
}

/** The pdf-lib fork that can encrypt, loaded only by these two ops so other tools don't carry it. */
const secure = () => import('@cantoo/pdf-lib').then((m) => m.PDFDocument)

/** AES-256. Without both permissions, a random owner password means the limits can't be lifted. */
export async function protect({ file, password, allowPrint, allowCopy }: { file: Input; password: string; allowPrint: boolean; allowCopy: boolean }) {
  await open(file) // plain-words errors for a damaged or already-locked file
  const doc = await (await secure()).load(file.bytes, { updateMetadata: false })
  const owner = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('')
  doc.encrypt({
    userPassword: password,
    ownerPassword: allowPrint && allowCopy ? password : owner,
    permissions: { printing: allowPrint ? 'highResolution' : false, copying: allowCopy, contentAccessibility: true, fillingForms: true, modifying: false, annotating: false, documentAssembly: false },
  })
  return doc.save()
}

/** Opens with the password and saves without encryption. */
export async function unlock({ file, password }: { file: Input; password: string }) {
  const Doc = await secure()
  try {
    return await (await Doc.load(file.bytes, { updateMetadata: false, password })).save()
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (/password/i.test(msg)) throw new Error(password ? 'That password didn’t open it. Check it and try again.' : 'This PDF needs its password to open. Type it, then try again.')
    throw new Error(`“${file.name}” could not be opened. It may be damaged, or not a PDF.`)
  }
}
