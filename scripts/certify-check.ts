/**
 * Node-side checks for the layout + PDF pipeline — the parts that do not need
 * a browser. Imported by check.ts.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as fontkit from 'fontkit'
import type { Font } from 'fontkit'
import {
  DEFAULT_STYLE,
  MIN_FIT_RATIO,
  applyCase,
  capHeight,
  layoutName,
  measureText,
  type TextStyle,
} from '../src/tools/certify/lib/layoutName'
import { createRenderer, type TemplateSpec } from '../src/tools/certify/lib/generatePdf'
import { missingGlyphs } from '../src/tools/certify/lib/fonts'
import {
  applyPattern,
  duplicateIndices,
  filenames,
  sanitizeFilename,
  uniqueStems,
} from '../src/lib/sanitize'
import { emptyHistory, push, redo, undo } from '../src/tools/certify/lib/history'
import {
  DEFAULT_QR,
  certId,
  qrMatrix,
  qrPayload,
  qrRect,
  qrRuns,
  verifyCsv,
} from '../src/tools/certify/lib/verify'

const OUT = 'scripts/out'
fs.mkdirSync(OUT, { recursive: true })

const png = new Uint8Array(fs.readFileSync('public/templates/certify/laurel.png'))
const W = png[16] * 2 ** 24 + png[17] * 2 ** 16 + png[18] * 2 ** 8 + png[19]
const H = png[20] * 2 ** 24 + png[21] * 2 ** 16 + png[22] * 2 ** 8 + png[23]
const template: TemplateSpec = { kind: 'png', bytes: png, width: W, height: H }

const italianaBytes = new Uint8Array(fs.readFileSync('public/fonts/italiana.ttf'))
const font = fontkit.create(Buffer.from(italianaBytes)) as Font

const style: TextStyle = DEFAULT_STYLE
const boxW = (style.box.r - style.box.l) * W
const boxTop = style.box.t * H
const boxBottom = style.box.b * H

// --- case transforms -------------------------------------------------------
assert.equal(applyCase('jane o. doe', 'title'), 'Jane O. Doe')
assert.equal(applyCase('Jane Doe', 'upper'), 'JANE DOE')
assert.equal(applyCase('Jane Doe', 'none'), 'Jane Doe')

// --- placement -------------------------------------------------------------
const REF = 'AARAV SHARMA'
const p = layoutName(font, REF, style, W, H)
assert.equal(p.text, REF)
assert.ok(!p.shrunk, 'the reference name should not need auto-fit at the default size')
assert.ok(!p.overflows)
assert.equal(p.glyphs.length, font.layout(REF).glyphs.length, 'one placed glyph per shaped glyph')

// horizontally centred in the box
const leftGap = p.x - style.box.l * W
const rightGap = style.box.r * W - (p.x + p.width)
assert.ok(Math.abs(leftGap - rightGap) < 0.01, 'not horizontally centred')

// cap band straddles the box midline, and stays inside the box
const mid = (boxTop + boxBottom) / 2
const cap = capHeight(font, p.size)
assert.ok(Math.abs(p.baseline - cap / 2 - mid) < 0.01, 'cap band not centred on the box middle')
assert.ok(p.baseline - cap > boxTop && p.baseline < boxBottom, 'text escapes the box')

// --- per-glyph advances ----------------------------------------------------
// The last glyph's pen position plus its own advance must equal the run width.
const spacedStyle: TextStyle = { ...style, spacing: 8, fit: false }
const sp = layoutName(font, 'ABC', spacedStyle, W, H)
const lastAdvance =
  (font.layout('ABC').glyphs[2].advanceWidth / font.unitsPerEm) * sp.size
assert.ok(
  Math.abs(sp.glyphs[2].x + lastAdvance - sp.width) < 1e-6,
  'glyph advances must sum to the measured width',
)
assert.equal(
  Math.round(measureText(font, 'ABC', 100, 10) - measureText(font, 'ABC', 100, 0)),
  20,
  'letter spacing applies to the gaps only',
)

// --- alignment -------------------------------------------------------------
const left = layoutName(font, REF, { ...style, align: 'left' }, W, H)
const right = layoutName(font, REF, { ...style, align: 'right' }, W, H)
assert.ok(Math.abs(left.x - style.box.l * W) < 0.01)
assert.ok(Math.abs(right.x + right.width - style.box.r * W) < 0.01)

// --- auto-fit --------------------------------------------------------------
const MEDIUM = 'CHANDRASHEKHAR VENKATARAMAN'
const med = layoutName(font, MEDIUM, style, W, H)
assert.ok(med.shrunk, 'a long-ish name should shrink')
assert.ok(med.size >= style.size * MIN_FIT_RATIO - 1e-6, 'must not shrink past the floor')
assert.ok(med.width <= boxW + 0.5, 'a shrunken name should fit')
assert.ok(!med.overflows)

// At the default preset this one needs less than the floor allows, so it is
// permitted to overflow and must flag itself rather than being clipped.
const LONG = 'VENKATA SUBRAMANYAM RAGHUNATHAN IYER'
const long = layoutName(font, LONG, style, W, H)
assert.equal(Math.round(long.size * 1e6), Math.round(style.size * MIN_FIT_RATIO * 1e6))
assert.ok(long.overflows, 'an unfittable name must report overflow')

// fit:false leaves the size alone and still reports the overflow
const unfitted = layoutName(font, LONG, { ...style, fit: false }, W, H)
assert.equal(unfitted.size, style.size)
assert.ok(unfitted.overflows)

// --- unicode ---------------------------------------------------------------
const DEV = 'हर्ष कासलीवाल'
assert.ok(missingGlyphs(font, DEV).length > 0, 'Italiana has no Devanagari')
const tiroBytes = new Uint8Array(fs.readFileSync('public/fonts/tiro-devanagari-hindi.ttf'))
const tiro = fontkit.create(Buffer.from(tiroBytes)) as Font
assert.deepEqual(missingGlyphs(tiro, DEV), [], 'Tiro should cover Devanagari')
assert.ok(tiro.layout('हर्ष').glyphs.length < [...'हर्ष'].length, 'conjunct should be shaped')

// --- filenames -------------------------------------------------------------
assert.equal(sanitizeFilename('A/B\\C:D*E?F"G<H>I|J'), 'ABCDEFGHIJ')
assert.equal(sanitizeFilename('Jane  Doe-Smith'), 'Jane  Doe-Smith', 'spaces and hyphens survive')
assert.equal(sanitizeFilename('...'), 'certificate', 'a name with nothing usable gets a fallback')
assert.deepEqual(uniqueStems(['Amit', 'Amit', 'amit']), ['Amit', 'Amit (2)', 'amit (3)'])
assert.deepEqual([...duplicateIndices(['A', 'B', 'a'])], [0, 2])
assert.equal(applyPattern('{index}_{name}', 'Asha', 0, 1000, ''), '0001_Asha')
assert.equal(applyPattern('{name}_{event}', 'Asha', 0, 10, 'TechFest'), 'Asha_TechFest')
assert.deepEqual(filenames(['Asha', 'Asha'], '{index}_{name}'), ['01_Asha', '02_Asha'])

// --- undo / redo -----------------------------------------------------------
let h = emptyHistory<number>()
h = push(h, 1)
h = push(h, 2)
const back = undo(h, 3)!
assert.equal(back.state, 2)
const forward = redo(back.history, back.state)!
assert.equal(forward.state, 3, 'redo returns the state undo moved away from')
assert.equal(undo(emptyHistory<number>(), 1), null)

// --- real PDFs -------------------------------------------------------------
const renderer = createRenderer({
  template,
  name: { style, fontBytes: italianaBytes },
})
const one = await renderer.renderOne({ name: REF })
fs.writeFileSync(`${OUT}/single.pdf`, one)
assert.equal(Buffer.from(one.subarray(0, 5)).toString(), '%PDF-', 'not a PDF')

fs.writeFileSync(
  `${OUT}/devanagari.pdf`,
  await createRenderer({ template, name: { style, fontBytes: tiroBytes } }).renderOne({ name: DEV }),
)
fs.writeFileSync(
  `${OUT}/spaced.pdf`,
  await createRenderer({
    template,
    name: { style: { ...style, spacing: 8 }, fontBytes: italianaBytes },
  }).renderOne({ name: REF }),
)

// second field on its own box + font
fs.writeFileSync(
  `${OUT}/two-fields.pdf`,
  await createRenderer({
    template,
    name: { style, fontBytes: italianaBytes },
    second: {
      style: { ...style, size: 34, kase: 'none', box: { l: 0.3, t: 0.6, r: 0.7, b: 0.65 } },
      fontBytes: tiroBytes,
    },
  }).renderOne({ name: REF, extra: 'Rank 1' }),
)

const names = [REF, LONG, DEV]
const combined = await renderer.renderCombined(names.map((name) => ({ name })))
fs.writeFileSync(`${OUT}/combined.pdf`, combined)
assert.ok(
  combined.length < one.length * names.length * 0.6,
  'the template is not being shared across pages',
)

// --- verification IDs and QR ----------------------------------------------
// Stable across runs and insensitive to case and surrounding space, so a
// reissued certificate carries the ID it was first given.
assert.equal(certId('Aarav Sharma', 'TechFest'), certId('  aarav sharma ', 'techfest'))
assert.notEqual(certId('Aarav Sharma', 'TechFest'), certId('Aarav Sharma', 'Other Event'))
assert.notEqual(certId('Aarav Sharma', 'TechFest'), certId('Diya Patel', 'TechFest'))
assert.match(certId('Aarav Sharma', 'TechFest'), /^[0-9A-HJKMNP-TV-Z]{8}$/)

// 5000 distinct names, no collisions at 40 bits.
const ids = new Set<string>()
for (let i = 0; i < 5000; i++) ids.add(certId(`Person Number ${i}`, 'TechFest'))
assert.equal(ids.size, 5000, 'certificate IDs collided')

assert.equal(qrPayload('ABC12345', ''), 'CERT:ABC12345')
assert.equal(qrPayload('ABC12345', 'https://c.org/v/{id}'), 'https://c.org/v/ABC12345')
assert.equal(qrPayload('ABC12345', 'https://c.org/v'), 'https://c.org/v?id=ABC12345')
assert.equal(qrPayload('ABC12345', 'https://c.org/v?a=1'), 'https://c.org/v?a=1&id=ABC12345')

// Runs must cover exactly the dark modules, and nothing else.
const matrix = qrMatrix(qrPayload(certId('Aarav Sharma', 'TechFest'), 'https://c.org/v/{id}'))
const painted = matrix.map((row) => row.map(() => false))
let runs = 0
for (const [r, c, len] of qrRuns(matrix)) {
  runs++
  for (let i = 0; i < len; i++) {
    assert.ok(matrix[r][c + i], 'a run covered a light module')
    assert.ok(!painted[r][c + i], 'a run overlapped another')
    painted[r][c + i] = true
  }
}
assert.deepEqual(painted, matrix, 'some dark modules were never drawn')
const darkModules = matrix.flat().filter(Boolean).length
assert.ok(runs < darkModules * 0.75, `run merging is not helping: ${runs} for ${darkModules}`)

// Placement stays on the page, in the corner asked for.
const place = qrRect({ ...DEFAULT_QR, corner: 'br', size: 0.11 }, W, H)
assert.ok(place.x + place.side < W && place.y + place.side < H, 'QR runs off the page')
assert.ok(place.x > W / 2 && place.y > H / 2, 'QR is not in the bottom-right')
const topLeft = qrRect({ ...DEFAULT_QR, corner: 'tl', size: 0.11 }, W, H)
assert.ok(topLeft.x < W / 2 && topLeft.y < H / 2, 'QR is not in the top-left')
assert.equal(topLeft.side, place.side)

// The CSV quotes commas, doubles quotes, and leads with a BOM for Excel.
const csv = verifyCsv(
  [
    { code: 'ABC12345', name: 'Patel, Diya', extra: 'Rank 1' },
    { code: 'XYZ98765', name: 'He said "hi"' },
  ],
  'TechFest 2026',
)
assert.ok(csv.startsWith('﻿Certificate ID,Name,Detail,Event,Issued\r\n'))
assert.ok(csv.includes('ABC12345,"Patel, Diya",Rank 1,TechFest 2026,'))
assert.ok(csv.includes('XYZ98765,"He said ""hi""",,TechFest 2026,'))

// A stamped certificate is bigger than a bare one, but not by much.
const qrPdf = await createRenderer({
  template,
  name: { style, fontBytes: italianaBytes },
  qr: { ...DEFAULT_QR, on: true },
  verifyLink: 'https://c.org/v/{id}',
}).renderOne({ name: REF, code: certId(REF, 'TechFest') })
fs.writeFileSync(`${OUT}/qr.pdf`, qrPdf)
assert.ok(qrPdf.length > one.length, 'the QR added nothing to the page')
assert.ok(qrPdf.length < one.length + 40 * 1024, 'the QR is costing too many bytes')
console.log(
  `qr: ${runs} runs for ${darkModules} modules, +${qrPdf.length - one.length} bytes per page`,
)

// --- throughput ------------------------------------------------------------
const N = Number(process.env.BENCH ?? 50)
const t0 = performance.now()
let bytes = 0
for (let i = 0; i < N; i++) bytes += (await renderer.renderOne({ name: `Person Number ${i}` })).length
const ms = performance.now() - t0

console.log(
  `single: ${(one.length / 1024).toFixed(0)} KB  combined(${names.length}p): ${(
    combined.length / 1024
  ).toFixed(0)} KB`,
)
console.log(
  `${N} certificates in ${ms.toFixed(0)} ms (${(ms / N).toFixed(1)} ms each, ${(
    bytes /
    N /
    1024
  ).toFixed(0)} KB each) -> 1000 names ~= ${((ms / N) * 1000) / 1000}s`,
)
console.log(
  `placement: ${p.size} pt, x ${p.x.toFixed(1)}, baseline ${p.baseline.toFixed(1)} (template ${W}x${H})`,
)
console.log('certify: ok')
