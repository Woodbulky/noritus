import * as fontkit from 'fontkit'
import type { Font } from 'fontkit'

export type FontOption = {
  id: string
  name: string
  /** Covers Devanagari, so it can render Hindi/Marathi names. */
  dev?: boolean
}

/** Bundled as .ttf in /public/fonts — no network at generation time. */
export const FONTS: FontOption[] = [
  { id: 'italiana', name: 'Italiana' },
  { id: 'cinzel', name: 'Cinzel' },
  { id: 'marcellus', name: 'Marcellus' },
  { id: 'forum', name: 'Forum' },
  { id: 'playfair-display', name: 'Playfair Display' },
  { id: 'cormorant-garamond', name: 'Cormorant Garamond' },
  { id: 'great-vibes', name: 'Great Vibes' },
  { id: 'alex-brush', name: 'Alex Brush' },
  { id: 'tiro-devanagari-hindi', name: 'Tiro Devanagari Hindi', dev: true },
]

export const CUSTOM_FONT_ID = 'custom'

export const isDevanagari = (s: string) => /[ऀ-ॿ]/.test(s)

const fontUrl = (id: string) => `${import.meta.env.BASE_URL}fonts/${id}.ttf`

const byteCache = new Map<string, Uint8Array>()
const parsedCache = new Map<string, Font>()
const cssFaces = new Map<string, FontFace>()

let customName = ''
export const customFontName = () => customName

export function fontLabel(id: string) {
  if (id === CUSTOM_FONT_ID) return customName || 'Uploaded font'
  return FONTS.find((f) => f.id === id)?.name ?? id
}

export function fontOption(id: string): FontOption {
  if (id === CUSTOM_FONT_ID) return { id, name: fontLabel(id) }
  return FONTS.find((f) => f.id === id) ?? { id, name: id }
}

/** Registers a user-supplied .ttf/.otf under CUSTOM_FONT_ID. Throws if unreadable. */
export async function setCustomFont(file: File): Promise<FontOption> {
  if (!/\.(ttf|otf)$/i.test(file.name)) {
    throw new Error('Fonts must be a .ttf or .otf file.')
  }
  const bytes = new Uint8Array(await file.arrayBuffer())
  let parsed: Font
  try {
    parsed = fontkit.create(bytes) as Font
    if ('fonts' in parsed) parsed = (parsed as unknown as { fonts: Font[] }).fonts[0]
    if (!parsed?.unitsPerEm) throw new Error('no metrics')
  } catch {
    throw new Error(`"${file.name}" is not a readable TrueType/OpenType font.`)
  }

  customName = file.name.replace(/\.[^.]+$/, '')
  byteCache.set(CUSTOM_FONT_ID, bytes)
  parsedCache.set(CUSTOM_FONT_ID, parsed)
  // Drop the stale CSS face so the picker re-registers the new bytes.
  const stale = cssFaces.get(CUSTOM_FONT_ID)
  if (stale) {
    document.fonts.delete(stale)
    cssFaces.delete(CUSTOM_FONT_ID)
  }
  return { id: CUSTOM_FONT_ID, name: customName, dev: isDevanagari('अ') && hasGlyphs(parsed, 'अ') }
}

const hasGlyphs = (font: Font, text: string) =>
  [...text].every((c) => font.hasGlyphForCodePoint(c.codePointAt(0)!))

export async function loadFontBytes(id: string): Promise<Uint8Array> {
  const hit = byteCache.get(id)
  if (hit) return hit
  let res: Response
  try {
    res = await fetch(fontUrl(id))
  } catch {
    throw new Error(`Could not load the font "${fontLabel(id)}". Check your connection.`)
  }
  if (!res.ok) throw new Error(`Could not load the font "${fontLabel(id)}" (${res.status}).`)
  const bytes = new Uint8Array(await res.arrayBuffer())
  byteCache.set(id, bytes)
  return bytes
}

/** fontkit instance used for measuring, shaping and glyph outlines. */
export async function loadFont(id: string): Promise<Font> {
  const hit = parsedCache.get(id)
  if (hit) return hit
  const bytes = await loadFontBytes(id)
  let font: Font
  try {
    font = fontkit.create(bytes) as Font
  } catch {
    throw new Error(`"${fontLabel(id)}" is not a readable TrueType/OpenType font.`)
  }
  if ('fonts' in font) font = (font as unknown as { fonts: Font[] }).fonts[0]
  parsedCache.set(id, font)
  return font
}

/** Registers the face with the document so the font picker can preview it. */
export async function loadCssFont(id: string): Promise<string> {
  const family = `cg-${id}`
  if (cssFaces.has(id)) return family
  const bytes = await loadFontBytes(id)
  const face = new FontFace(family, bytes.slice().buffer as ArrayBuffer)
  cssFaces.set(id, face)
  await face.load()
  document.fonts.add(face)
  return family
}

/** Distinct characters in `text` the font has no glyph for (whitespace ignored). */
export function missingGlyphs(font: Font, text: string): string[] {
  const missing = new Set<string>()
  for (const ch of text) {
    if (/\s/.test(ch)) continue
    if (!font.hasGlyphForCodePoint(ch.codePointAt(0)!)) missing.add(ch)
  }
  return [...missing]
}
