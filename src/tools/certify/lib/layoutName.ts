import type { Font } from 'fontkit'

/**
 * The single source of truth for where text lands on the template.
 *
 * Both the on-screen preview and the PDF worker call `layoutName()` and then
 * draw the glyphs it returns, so "what you see" and "what is embedded" are the
 * same numbers rather than two implementations that happen to agree. All
 * measuring goes through fontkit metrics — never canvas `measureText`, whose
 * hinting and subpixel rules differ from the PDF rasteriser.
 *
 * Units: template points. An image template maps 1 px -> 1 pt (72 DPI), so
 * these are also template pixels.
 */

export type Align = 'left' | 'center' | 'right'
export type TextCase = 'none' | 'upper' | 'title'

/** Box as fractions of the template, so a layout survives any resolution. */
export type Box = { l: number; t: number; r: number; b: number }

export type TextStyle = {
  fontId: string
  size: number
  spacing: number
  kase: TextCase
  align: Align
  color: string
  /** Shrink long text to fit the box, down to MIN_FIT_RATIO of `size`. */
  fit: boolean
  box: Box
}

/** Never shrink below this share of the chosen size. */
export const MIN_FIT_RATIO = 0.55

export const DEFAULT_BOX: Box = { l: 0.23, t: 0.48, r: 0.77, b: 0.56 }

export const DEFAULT_STYLE: TextStyle = {
  fontId: 'italiana',
  size: 72,
  spacing: 2,
  kase: 'upper',
  align: 'center',
  color: '#111111',
  fit: true,
  box: { ...DEFAULT_BOX },
}

/** Second (optional) text field: smaller, sits below the name by default. */
export const DEFAULT_SECOND: TextStyle = {
  ...DEFAULT_STYLE,
  size: 34,
  spacing: 1,
  kase: 'none',
  box: { l: 0.3, t: 0.6, r: 0.7, b: 0.65 },
}

export function applyCase(text: string, kase: TextCase) {
  if (kase === 'upper') return text.toUpperCase()
  if (kase === 'title') return text.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase())
  return text
}

export type PlacedGlyph = {
  glyphId: number
  /** Pen offset from the run's left edge, in points. */
  x: number
  /** Outline in font units, y-up — scale by size/unitsPerEm to draw. */
  path: string
}

export type Layout = {
  /** Case-transformed text actually drawn. */
  text: string
  /** Size after auto-fit. */
  size: number
  /** Left edge of the run. */
  x: number
  /** Baseline, measured DOWN from the top of the template. */
  baseline: number
  width: number
  /** True when auto-fit had to shrink this one. */
  shrunk: boolean
  /** True when it still does not fit at the minimum size. */
  overflows: boolean
  glyphs: PlacedGlyph[]
}

/**
 * pdf-lib advances custom-font text by each glyph's own `advanceWidth` and
 * applies letter spacing as a PDF `Tc`, which spaces every glyph. We mirror
 * exactly that: sum of advances plus one gap between glyphs.
 */
function runWidth(font: Font, text: string, size: number, spacing: number) {
  const scale = size / font.unitsPerEm
  const { glyphs } = font.layout(text)
  let w = 0
  for (const g of glyphs) w += g.advanceWidth * scale
  return w + spacing * Math.max(0, glyphs.length - 1)
}

/** Cap height is the band we optically centre; fall back for fonts without it. */
export function capHeight(font: Font, size: number) {
  const cap =
    font.capHeight && font.capHeight > 0 ? font.capHeight : (font.ascent - font.descent) * 0.7
  return (cap / font.unitsPerEm) * size
}

export function measureText(font: Font, text: string, size: number, spacing: number) {
  return runWidth(font, text, size, spacing)
}

/** Largest size <= `size` whose run fits `boxWidth`, floored at MIN_FIT_RATIO. */
function fitSize(font: Font, text: string, size: number, spacing: number, boxWidth: number) {
  if (boxWidth <= 0 || runWidth(font, text, size, spacing) <= boxWidth) return size
  // Width is near-linear in size; bisection cleans up the letter-spacing term,
  // which does not scale with it.
  let lo = size * MIN_FIT_RATIO
  let hi = size
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2
    if (runWidth(font, text, mid, spacing) <= boxWidth) lo = mid
    else hi = mid
  }
  return lo
}

/**
 * Paints a laid-out run onto a canvas from the font's own outlines, at `scale`
 * canvas pixels per template point. The preview and the alignment harness both
 * call this, so there is exactly one drawing implementation to keep in step
 * with the PDF writer.
 */
export function paintRun(
  ctx: CanvasRenderingContext2D,
  font: Font,
  place: Layout,
  colour: string,
  scale: number,
) {
  if (!place.text) return
  const unit = (place.size / font.unitsPerEm) * scale
  ctx.save()
  ctx.fillStyle = colour
  ctx.translate(place.x * scale, place.baseline * scale)
  for (const g of place.glyphs) {
    if (!g.path) continue
    ctx.save()
    ctx.translate(g.x * scale, 0)
    // Font outlines are y-up; canvas is y-down.
    ctx.scale(unit, -unit)
    ctx.fill(new Path2D(g.path))
    ctx.restore()
  }
  ctx.restore()
}

export function layoutName(
  font: Font,
  raw: string,
  style: TextStyle,
  templateWidth: number,
  templateHeight: number,
): Layout {
  const text = applyCase(raw, style.kase)
  const boxX = style.box.l * templateWidth
  const boxW = (style.box.r - style.box.l) * templateWidth
  const midY = ((style.box.t + style.box.b) / 2) * templateHeight

  const size = style.fit ? fitSize(font, text, style.size, style.spacing, boxW) : style.size
  const width = runWidth(font, text, size, style.spacing)

  const x =
    style.align === 'left'
      ? boxX
      : style.align === 'right'
        ? boxX + boxW - width
        : boxX + (boxW - width) / 2

  // Optical centring: straddle the box midline with the cap band, not with the
  // em box, so a name looks vertically centred to the eye.
  const baseline = midY + capHeight(font, size) / 2

  const scale = size / font.unitsPerEm
  const glyphs: PlacedGlyph[] = []
  let pen = 0
  for (const g of font.layout(text).glyphs) {
    glyphs.push({ glyphId: g.id, x: pen, path: g.path.toSVG() })
    pen += g.advanceWidth * scale + style.spacing
  }

  return {
    text,
    size,
    x,
    baseline,
    width,
    shrunk: size < style.size - 1e-6,
    overflows: width > boxW + 0.5,
    glyphs,
  }
}
