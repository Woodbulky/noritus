/** Page maths and every pdf-lib op, end to end in Node. Imported by check.ts. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { degrees, PDFDocument } from 'pdf-lib'
import { centredOrigin, jpegOrientation, normalizeAngle, pageLabel, parseRanges, toUser } from '../src/lib/pages'
import * as ops from '../src/lib/pdfOps'
import { buffers } from '../src/lib/transfer'
import { svgPath, wifiPayload } from '../src/tools/qr-generator/qr'
import { outName } from '../src/lib/files'

// --- ranges ---
assert.deepEqual(parseRanges('1-3, 5', 9), [[0, 1, 2], [4]])
assert.deepEqual(parseRanges('8-', 9), [[7, 8]])
assert.deepEqual(parseRanges('-2', 9), [[0, 1]])
assert.deepEqual(parseRanges('3-1', 9), [[2, 1, 0]], 'reverse ranges keep their order')
assert.deepEqual(parseRanges(' 2 , ,4 ', 9), [[1], [3]])
assert.throws(() => parseRanges('0', 9), /doesn’t exist/)
assert.throws(() => parseRanges('10', 9), /has 9 pages/)
assert.throws(() => parseRanges('a', 9), /not a page/)
assert.throws(() => parseRanges('', 9), /Type the pages/)

// --- rotation-aware placement ---
assert.equal(normalizeAngle(-90), 270)
assert.equal(normalizeAngle(450), 90)
const box = { x: 0, y: 0, width: 600, height: 800 }
// The visual bottom-left corner of a page rotated 90° clockwise is stored at the user top-left.
assert.deepEqual(toUser(box, 90, 0, 0), { x: 600, y: 0 })
assert.deepEqual(toUser(box, 0, 10, 20), { x: 10, y: 20 })
assert.deepEqual(toUser(box, 180, 0, 0), { x: 600, y: 800 })
assert.deepEqual(toUser(box, 270, 0, 0), { x: 0, y: 800 })
assert.deepEqual(toUser({ ...box, x: 5, y: 7 }, 0, 1, 1), { x: 6, y: 8 }, 'crop box offset')
const o = centredOrigin(100, 100, 40, 10, 0)
assert.deepEqual(o, { x: 80, y: 95 })
const o90 = centredOrigin(100, 100, 40, 10, 90)
assert.ok(Math.abs(o90.x - 105) < 1e-9 && Math.abs(o90.y - 80) < 1e-9)

assert.equal(pageLabel('n', 3, 9), '3')
assert.equal(pageLabel('page-n-of-total', 3, 9), 'Page 3 of 9')
assert.equal(pageLabel('n-of-total', 3, 9), '3 / 9')

// --- EXIF orientation ---
const exif = (le: boolean, value: number) => {
  const u16 = (n: number) => (le ? [n & 255, n >> 8] : [n >> 8, n & 255])
  const tiff = [...(le ? [0x49, 0x49] : [0x4d, 0x4d]), ...u16(42), ...(le ? [8, 0, 0, 0] : [0, 0, 0, 8]), ...u16(1), ...u16(0x0112), ...u16(3), ...(le ? [1, 0, 0, 0] : [0, 0, 0, 1]), ...u16(value), 0, 0]
  const body = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff]
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe1, (body.length + 2) >> 8, (body.length + 2) & 255, ...body, 0xff, 0xda])
}
assert.equal(jpegOrientation(exif(true, 6)), 6)
assert.equal(jpegOrientation(exif(false, 8)), 8)
assert.equal(jpegOrientation(new Uint8Array([0xff, 0xd8, 0xff, 0xda])), 1)
assert.equal(jpegOrientation(new Uint8Array([0x89, 0x50])), 1)

// --- small helpers ---
assert.equal(wifiPayload('Club;Net', 'p:w"'), String.raw`WIFI:T:WPA;S:Club\;Net;P:p\:w\";;`)
assert.equal(wifiPayload('Open', ''), 'WIFI:T:nopass;S:Open;;')
assert.equal(svgPath([[true, false], [false, true]]), 'M0 0h1v1h-1zM1 1h1v1h-1z')
assert.equal(outName('My: scan?.pdf', '-merged', 'pdf'), 'My scan-merged.pdf')
assert.equal(outName('???.pdf', '', 'zip'), 'file.zip')
const u = new Uint8Array(4)
assert.deepEqual(buffers({ a: [u, u], b: { c: u.subarray(1) } }), [u.buffer])

// --- pdf-lib ops ---
async function makePdf(sizes: [number, number][], rotate = 0) {
  const d = await PDFDocument.create()
  for (const s of sizes) d.addPage(s).setRotation(degrees(rotate))
  return d.save()
}
const input = async (name: string, sizes: [number, number][], rotate = 0) => ({ name, bytes: await makePdf(sizes, rotate) })
const pages = async (bytes: Uint8Array) => (await PDFDocument.load(bytes)).getPages()

const a = await input('a.pdf', [[600, 800], [600, 800]])
const b = await input('b.pdf', [[300, 300]])
const merged = await pages(await ops.merge({ files: [a, b] }))
assert.deepEqual(merged.map((p) => p.getWidth()), [600, 600, 300])

const three = await input('c.pdf', [[100, 100], [200, 200], [300, 300]])
assert.equal((await ops.split({ file: three, ranges: null })).length, 3)
const byRange = await ops.split({ file: three, ranges: '3, 1-2' })
assert.deepEqual(byRange.map((o) => o.pages), [[2], [0, 1]])
const extracted = await ops.split({ file: three, ranges: '3, 1', extract: true })
assert.deepEqual((await pages(extracted[0].bytes)).map((p) => p.getWidth()), [300, 100])
await assert.rejects(ops.split({ file: three, ranges: '4' }), /has 3 pages/)

const organized = await pages(await ops.organize({ file: three, pages: [{ index: 2, rotate: 90 }, { index: 0, rotate: 270 }] }))
assert.deepEqual(organized.map((p) => [p.getWidth(), p.getRotation().angle]), [[300, 90], [100, 270]])

const png = { name: 'laurel.png', bytes: new Uint8Array(fs.readFileSync('public/templates/certify/laurel.png')) }
const imgs = await pages(await ops.imagesToPdf({ images: [png], size: 'a4', margin: 24 }))
assert.ok(imgs[0].getWidth() > imgs[0].getHeight(), 'landscape image → landscape A4')
const fit = await pages(await ops.imagesToPdf({ images: [png], size: 'fit', margin: 24 }))
assert.equal(fit[0].getWidth(), 1600)
await assert.rejects(ops.imagesToPdf({ images: [{ name: 'x.png', bytes: new Uint8Array([0x89, 0x50, 1, 2]) }], size: 'a4', margin: 0 }), /could not be read/)

const rotated = await input('r.pdf', [[600, 800]], 90)
for (const file of [a, rotated]) {
  const base = file.bytes.length
  assert.ok((await ops.watermark({ file, text: 'DRAFT', size: 40, opacity: 0.3, angle: 45, color: '#ce4b2c' })).length > base)
  assert.ok((await ops.pageNumbers({ file, format: 'page-n-of-total', vertical: 'bottom', horizontal: 'right', start: 1, size: 11, margin: 28 })).length > base)
  assert.ok((await ops.sign({ file, signature: png, pages: [0], rect: { l: 0.5, t: 0.8, w: 0.3, h: 0.1 } })).length > base)
}
await assert.rejects(ops.watermark({ file: a, text: 'नमस्ते', size: 40, opacity: 1, angle: 0, color: '#000000' }), /built-in font/)
await assert.rejects(ops.merge({ files: [{ name: 'bad.pdf', bytes: new Uint8Array([1, 2, 3]) }] }), /“bad.pdf” could not be opened/)

// --- forms ---
const formDoc = await PDFDocument.create()
const fp = formDoc.addPage([400, 400])
const f = formDoc.getForm()
f.createTextField('name').addToPage(fp, { x: 10, y: 300, width: 200, height: 20 })
f.createCheckBox('agree').addToPage(fp, { x: 10, y: 250, width: 15, height: 15 })
const dd = f.createDropdown('size')
dd.addOptions(['S', 'M', 'L'])
dd.addToPage(fp, { x: 10, y: 200, width: 100, height: 20 })
const form = { name: 'form.pdf', bytes: await formDoc.save() }
const fields = await ops.readForm({ file: form })
assert.deepEqual(fields.map((x) => [x.name, x.kind]), [['name', 'text'], ['agree', 'check'], ['size', 'choice']])
assert.deepEqual(fields[2].options, ['S', 'M', 'L'])
const filled = { name: 'f.pdf', bytes: await ops.fillForm({ file: form, values: { name: 'Asha', agree: 'yes', size: 'M' }, flatten: false }) }
assert.deepEqual((await ops.readForm({ file: filled })).map((x) => x.value), ['Asha', 'yes', 'M'])
const flat = await ops.fillForm({ file: form, values: { name: 'Asha' }, flatten: true })
assert.equal((await ops.readForm({ file: { name: 'x.pdf', bytes: flat } })).length, 0, 'flattened fields are gone')
await assert.rejects(ops.fillForm({ file: form, values: { name: 'नमस्ते' }, flatten: false }), /built-in font/)

// --- annotate, redact, OCR layer ---
for (const file of [a, rotated]) {
  const rect = { l: 0.1, t: 0.1, w: 0.4, h: 0.1 }
  const marks: ops.Mark[] = (['text', 'highlight', 'whiteout', 'box', 'ellipse'] as const).map((kind) => ({ page: 0, kind, rect, color: '#ce4b2c', text: 'Hi\nthere', size: 12 }))
  assert.ok((await ops.annotate({ file, marks })).length > file.bytes.length)
  assert.ok((await ops.ocrLayer({ file, pages: [{ page: 0, words: [{ text: 'Hello', box: rect }, { text: 'नमस्ते', box: rect }] }] })).length > file.bytes.length)
}
const redacted = await pages(await ops.redact({ file: rotated, images: [{ page: 0, image: png }] }))
assert.deepEqual([redacted[0].getWidth(), redacted[0].getHeight(), redacted[0].getRotation().angle], [800, 600, 0], 'redacted page keeps its displayed size, upright')
assert.deepEqual((await pages(await ops.redact({ file: three, images: [] }))).map((p) => p.getWidth()), [100, 200, 300])

// --- compress, metadata ---
assert.equal((await pages(await ops.compress({ file: three, level: 'lossless' }))).length, 3)
const metaDoc = await PDFDocument.create()
metaDoc.addPage()
metaDoc.setTitle('Secret plan')
metaDoc.setAuthor('Asha')
const withMeta = { name: 'm.pdf', bytes: await metaDoc.save() }
assert.equal((await ops.readMeta({ file: withMeta })).Author, 'Asha')
const edited = await ops.readMeta({ file: { name: 'e.pdf', bytes: await ops.writeMeta({ file: withMeta, meta: { Title: 'Plan ✓', Author: '' }, clear: false }) } })
assert.deepEqual([edited.Title, edited.Author], ['Plan ✓', ''])
const cleared = await ops.readMeta({ file: { name: 'c.pdf', bytes: await ops.writeMeta({ file: withMeta, meta: {}, clear: true }) } })
assert.deepEqual([cleared.Title, cleared.Producer, cleared.created], ['', '', ''])

// --- protect / unlock ---
const locked = { name: 'l.pdf', bytes: await ops.protect({ file: three, password: 'tiger', allowPrint: true, allowCopy: false }) }
await assert.rejects(ops.merge({ files: [locked] }), /password-protected/)
await assert.rejects(ops.unlock({ file: locked, password: 'lion' }), /didn’t open/)
await assert.rejects(ops.unlock({ file: locked, password: '' }), /needs its password/)
assert.equal((await pages(await ops.unlock({ file: locked, password: 'tiger' }))).length, 3)
await assert.rejects(ops.protect({ file: locked, password: 'x', allowPrint: true, allowCopy: true }), /password-protected/)

console.log('pdf: ok')
