import { PDFDocument, rgb, setCharacterSpacing, type PDFFont, type PDFPage } from 'pdf-lib'
import * as fontkit from 'fontkit'
import type { Font } from 'fontkit'
import { layoutName, type Layout, type TextStyle } from './layoutName'
import type { TemplateKind } from './loadTemplate'
import { qrMatrix, qrPayload, qrRect, qrRuns, quietZone, type QrStyle } from './verify'

/** The slice of a Template that is safe to post to a worker (no ImageBitmap). */
export type TemplateSpec = {
  kind: TemplateKind
  bytes: Uint8Array
  /** Native size in points. */
  width: number
  height: number
}

/** One text field: its style plus the font file to embed for it. */
export type FieldSpec = { style: TextStyle; fontBytes: Uint8Array }

export type RenderJob = {
  template: TemplateSpec
  name: FieldSpec
  /** Optional second field (e.g. rank / team), off unless supplied. */
  second?: FieldSpec
  /** Verification QR, off unless supplied. */
  qr?: QrStyle
  /** Link template the QR encodes; `{id}` is substituted per row. */
  verifyLink?: string
}

/** One certificate's worth of text. */
export type Row = {
  name: string
  extra?: string
  /** Verification ID, minted on the main thread so the CSV matches exactly. */
  code?: string
}

function hexToRgb(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  const n = m ? parseInt(m[1], 16) : 0
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

/** Draws one laid-out run. pdf-lib's origin is bottom-left; ours is top-left. */
function draw(page: PDFPage, pdfFont: PDFFont, style: TextStyle, place: Layout, height: number) {
  if (!place.text) return
  // Tc spaces every glyph code without disturbing fontkit's shaping, which
  // matters for Devanagari conjuncts.
  if (style.spacing) page.pushOperators(setCharacterSpacing(style.spacing))
  page.drawText(place.text, {
    x: place.x,
    y: height - place.baseline,
    size: place.size,
    font: pdfFont,
    color: hexToRgb(style.color),
  })
  if (style.spacing) page.pushOperators(setCharacterSpacing(0))
}

/** Stamps one QR, a rectangle per run of dark modules. */
function drawQr(
  page: PDFPage,
  m: boolean[][],
  style: QrStyle,
  place: ReturnType<typeof qrRect>,
  height: number,
) {
  const n = m.length
  const unit = place.side / n
  const quiet = quietZone(place.side, n)
  // pdf-lib measures y up from the bottom; `place.y` is down from the top.
  const bottom = height - place.y - place.side
  page.drawRectangle({
    x: place.x - quiet,
    y: bottom - quiet,
    width: place.side + quiet * 2,
    height: place.side + quiet * 2,
    color: hexToRgb(style.light),
  })
  const dark = hexToRgb(style.dark)
  for (const [r, c, len] of qrRuns(m)) {
    page.drawRectangle({
      x: place.x + c * unit,
      y: bottom + (n - 1 - r) * unit,
      width: len * unit,
      height: unit,
      color: dark,
    })
  }
}

/** Embeds the template once into `pdf` and returns a per-page stamper. */
async function templateStamper(pdf: PDFDocument, tpl: TemplateSpec) {
  const bytes = tpl.bytes.slice()
  if (tpl.kind === 'pdf') {
    const [embedded] = await pdf.embedPdf(bytes, [0])
    return (page: PDFPage) =>
      page.drawPage(embedded, { x: 0, y: 0, width: tpl.width, height: tpl.height })
  }
  const image = tpl.kind === 'png' ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes)
  return (page: PDFPage) =>
    page.drawImage(image, { x: 0, y: 0, width: tpl.width, height: tpl.height })
}

/**
 * pdf-lib expects fontkit v1, whose subsetter streams its output. We hand it
 * fontkit v2 instead, bridged to that streaming shape.
 *
 * Why not @pdf-lib/fontkit: that package is a babel build of fontkit v1 that
 * calls `regeneratorRuntime` from its Indic shaper, which is not defined in a
 * modern ESM bundle — embedding any Devanagari name throws. Using v2 for both
 * measuring and embedding also means preview and PDF share one shaper, so the
 * two can never disagree about glyphs or advances.
 */
const pdfLibFontkit = {
  create(bytes: Uint8Array, postscriptName?: string) {
    const font = fontkit.create(bytes, postscriptName) as Font
    const createSubset = font.createSubset.bind(font)
    font.createSubset = () => {
      const subset = createSubset()
      ;(subset as unknown as { encodeStream: () => unknown }).encodeStream = () => {
        const handlers: Record<string, (arg?: unknown) => void> = {}
        const emitter = {
          on(event: string, fn: (arg?: unknown) => void) {
            handlers[event] = fn
            return emitter
          },
        }
        queueMicrotask(() => {
          try {
            handlers.data?.(subset.encode())
            handlers.end?.()
          } catch (err) {
            handlers.error?.(err)
          }
        })
        return emitter
      }
      return subset
    }
    return font
  },
}

const parse = (bytes: Uint8Array): Font => {
  let f = fontkit.create(bytes.slice()) as Font
  if ('fonts' in f) f = (f as unknown as { fonts: Font[] }).fonts[0]
  return f
}

export function createRenderer(job: RenderJob) {
  const { template } = job
  const size: [number, number] = [template.width, template.height]
  const nameFont = parse(job.name.fontBytes)
  const secondFont = job.second ? parse(job.second.fontBytes) : null

  const place = (row: Row) => ({
    name: layoutName(nameFont, row.name, job.name.style, ...size),
    second:
      job.second && secondFont && row.extra
        ? layoutName(secondFont, row.extra, job.second.style, ...size)
        : null,
  })

  const qr = job.qr?.on ? job.qr : null
  const qrPlace = qr ? qrRect(qr, template.width, template.height) : null

  /** Every field on one page, so the two render paths cannot drift apart. */
  const stampRow = (page: PDFPage, row: Row, fonts: { name: PDFFont; second: PDFFont | null }) => {
    const p = place(row)
    draw(page, fonts.name, job.name.style, p.name, template.height)
    if (p.second && fonts.second && job.second) {
      draw(page, fonts.second, job.second.style, p.second, template.height)
    }
    if (qr && qrPlace && row.code) {
      drawQr(page, qrMatrix(qrPayload(row.code, job.verifyLink ?? '')), qr, qrPlace, template.height)
    }
  }

  /**
   * A one-page PDF holding nothing but the template, built once. Each
   * certificate re-loads these bytes instead of re-encoding the artwork, so
   * the expensive image embed happens a single time per batch.
   */
  let basePromise: Promise<Uint8Array> | null = null
  const base = () =>
    (basePromise ??= (async () => {
      const pdf = await PDFDocument.create()
      const stamp = await templateStamper(pdf, template)
      stamp(pdf.addPage(size))
      return pdf.save()
    })())

  async function embedFonts(pdf: PDFDocument) {
    pdf.registerFontkit(pdfLibFontkit as never)
    const name = await pdf.embedFont(job.name.fontBytes.slice(), { subset: true })
    const second = job.second
      ? await pdf.embedFont(job.second.fontBytes.slice(), { subset: true })
      : null
    return { name, second }
  }

  async function renderOne(row: Row): Promise<Uint8Array> {
    const pdf = await PDFDocument.load(await base())
    const fonts = await embedFonts(pdf)
    stampRow(pdf.getPage(0), row, fonts)
    return pdf.save()
  }

  async function renderCombined(
    rows: Row[],
    onProgress?: (done: number) => void,
    cancelled?: () => boolean,
  ): Promise<Uint8Array> {
    const pdf = await PDFDocument.create()
    const fonts = await embedFonts(pdf)
    const stamp = await templateStamper(pdf, template)
    for (let i = 0; i < rows.length; i++) {
      if (cancelled?.()) throw new CancelledError()
      const page = pdf.addPage(size)
      stamp(page)
      stampRow(page, rows[i], fonts)
      onProgress?.(i + 1)
      // A macrotask, not a microtask: only this lets the worker pick up a
      // pending cancel message part-way through a big combined document.
      if (i % 25 === 24) await new Promise((r) => setTimeout(r, 0))
    }
    return pdf.save()
  }

  return { nameFont, secondFont, place, renderOne, renderCombined }
}

export class CancelledError extends Error {
  constructor() {
    super('Cancelled')
    this.name = 'CancelledError'
  }
}
