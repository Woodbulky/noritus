/** Image sizing, ICO packing, crop math and metadata stripping. Imported by check.ts. */
import assert from 'node:assert/strict'
import { buildIco, change, keepType, plan } from '../src/lib/image'
import { centred, drag, pixels } from '../src/tools/image-crop/crop'
import { readExif, strip } from '../src/tools/exif-remove/strip'

// --- plan ---
assert.deepEqual(plan(400, 300), { width: 400, height: 300, src: { x: 0, y: 0, w: 400, h: 300 }, dst: { x: 0, y: 0, w: 400, h: 300 } })
assert.deepEqual(plan(400, 300, { kind: 'scale', scale: 0.5 }).dst, { x: 0, y: 0, w: 200, h: 150 })
assert.equal(plan(3, 3, { kind: 'scale', scale: 0.01 }).width, 1, 'never 0 px')
assert.deepEqual([plan(4000, 3000, { kind: 'within', w: 1920, h: 1920 }).width, plan(4000, 3000, { kind: 'within', w: 1920, h: 1920 }).height], [1920, 1440])
assert.equal(plan(800, 600, { kind: 'within', w: 1920, h: 1080 }).width, 800, 'within never enlarges')
assert.equal(plan(4000, 3000, { kind: 'within', w: 0, h: 600 }).width, 800, '0 = no limit on that side')
assert.equal(plan(4000, 3000, { kind: 'within', w: 0, h: 0 }).width, 4000)
const cover = plan(400, 200, { kind: 'cover', w: 32, h: 32 })
assert.deepEqual(cover, { width: 32, height: 32, src: { x: 100, y: 0, w: 200, h: 200 }, dst: { x: 0, y: 0, w: 32, h: 32 } }, 'cover crops the centre')
const contain = plan(400, 200, { kind: 'contain', w: 32, h: 32 })
assert.deepEqual(contain, { width: 32, height: 32, src: { x: 0, y: 0, w: 400, h: 200 }, dst: { x: 0, y: 8, w: 32, h: 16 } }, 'contain centres the whole image')
assert.equal(plan(16, 16, { kind: 'contain', w: 512, h: 512 }).dst.w, 512, 'contain may enlarge (favicons from small logos)')

assert.equal(change(1000, 420), '−58%')
assert.equal(change(1000, 1100), '+10%')
assert.equal(keepType({ name: 'IMG_1.HEIC', type: '' }), 'image/jpeg')
assert.equal(keepType({ name: 'a.webp', type: 'image/webp' }), 'image/webp')
assert.equal(keepType({ name: 'a.gif', type: 'image/gif' }), 'image/png')
assert.equal(keepType({ name: 'a.JPEG', type: '' }), 'image/jpeg')

// --- ico ---
const ico = buildIco([
  { size: 16, bytes: new Uint8Array([1, 2, 3]) },
  { size: 256, bytes: new Uint8Array([4, 5]) },
])
const iv = new DataView(ico.buffer)
assert.deepEqual([iv.getUint16(0, true), iv.getUint16(2, true), iv.getUint16(4, true)], [0, 1, 2], 'ICONDIR')
assert.deepEqual([ico[6], ico[7], iv.getUint32(6 + 8, true), iv.getUint32(6 + 12, true)], [16, 16, 3, 38], 'first entry: 16 px, 3 bytes at 6+32')
assert.deepEqual([ico[22], iv.getUint32(22 + 12, true)], [0, 41], '256 px is written as 0')
assert.deepEqual([...ico.subarray(38)], [1, 2, 3, 4, 5])

// --- crop ---
assert.deepEqual(centred(400, 300, null), { x: 0, y: 0, w: 400, h: 300 })
assert.deepEqual(centred(400, 300, 1), { x: 50, y: 0, w: 300, h: 300 })
assert.deepEqual(centred(400, 300, 16 / 9), { x: 0, y: 37.5, w: 400, h: 225 })
const b = { x: 100, y: 100, w: 100, h: 100 }
assert.deepEqual(drag(b, 'move', 500, -500, 400, 300, null), { x: 300, y: 0, w: 100, h: 100 }, 'move stays inside')
assert.deepEqual(drag(b, 'se', 20, 10, 400, 300, null), { x: 100, y: 100, w: 120, h: 110 })
assert.deepEqual(drag(b, 'nw', 20, 10, 400, 300, null), { x: 120, y: 110, w: 80, h: 90 }, 'opposite corner stays put')
assert.deepEqual(drag(b, 'nw', -500, -500, 400, 300, null), { x: 0, y: 0, w: 200, h: 200 }, 'clamped at the edges')
assert.deepEqual(drag(b, 'se', 50, 0, 400, 300, 1), { x: 100, y: 100, w: 150, h: 150 }, 'ratio follows the bigger move')
assert.deepEqual(drag(b, 'se', 500, 0, 400, 300, 1), { x: 100, y: 100, w: 200, h: 200 }, 'ratio shrinks to fit the image')
assert.equal(drag(b, 'se', -500, -500, 400, 300, null).w, 8, 'minimum size')
assert.deepEqual(pixels({ x: 10.4, y: 0.6, w: 399.9, h: 50 }, 400, 300), { x: 10, y: 1, w: 390, h: 50 })

// --- metadata stripping ---
const u8 = (...parts: (number[] | string)[]) => new Uint8Array(parts.flatMap((p) => (typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : p)))
const seg = (marker: number, body: Uint8Array) => u8([0xff, marker, (body.length + 2) >> 8, (body.length + 2) & 255], [...body])
const has = (hay: Uint8Array, needle: string) => Buffer.from(hay).includes(needle)

// A little-endian EXIF block: Orientation 6, Make, GPS pointer.
const tiff = u8('II', [42, 0, 8, 0, 0, 0], [3, 0], [0x12, 1, 3, 0, 1, 0, 0, 0, 6, 0, 0, 0], [0x0f, 1, 2, 0, 4, 0, 0, 0], 'Cam\0', [0x25, 0x88, 4, 0, 1, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0])
assert.deepEqual(readExif(tiff), { orientation: 6, found: ['camera make and model', 'GPS location'] })
assert.deepEqual(readExif(u8('MM', [0, 42])), { orientation: 1, found: [] }, 'a cut-off block is not an error')

const scan = u8([0x12, 0xff, 0x00, 0x34, 0xff, 0xd3, 0x56]) // a stuffed 0xFF00 and a restart marker
const jpg = u8(
  [0xff, 0xd8],
  [...seg(0xe0, u8('JFIF\0', [1, 2, 0, 0, 1, 0, 1, 0, 0]))],
  [...seg(0xe1, u8('Exif\0\0', [...tiff]))],
  [...seg(0xe1, u8('http://ns.adobe.com/xap/1.0/\0<x:xmpmeta/>'))],
  [...seg(0xe2, u8('ICC_PROFILE\0', [1, 1, 9, 9]))],
  [...seg(0xe2, u8('MPF\0', [0, 0]))],
  [...seg(0xfe, u8('my comment'))],
  [...seg(0xdb, u8([0, 1, 2, 3]))],
  [...seg(0xda, u8([1, 1, 0, 0, 63, 0]))],
  [...scan],
  [0xff, 0xd9],
  'trailing preview with Exif',
)
const clean = strip(jpg)!
assert.equal(clean.format, 'jpg')
assert.deepEqual(clean.removed.sort(), ['GPS location', 'XMP data', 'camera make and model', 'comments', 'embedded previews', 'maker data'])
assert.ok(!has(clean.bytes, 'Cam') && !has(clean.bytes, 'xmpmeta') && !has(clean.bytes, 'my comment') && !has(clean.bytes, 'MPF') && !has(clean.bytes, 'trailing'))
assert.ok(has(clean.bytes, 'JFIF') && has(clean.bytes, 'ICC_PROFILE'), 'JFIF and the colour profile stay')
assert.ok(Buffer.from(clean.bytes).includes(Buffer.from(scan)), 'scan data copied exactly, past stuffed bytes and restart markers')
assert.deepEqual([...clean.bytes.subarray(-2)], [0xff, 0xd9])
const orient = clean.bytes.indexOf(0xe1, 2) - 1
assert.deepEqual(readExif(clean.bytes.subarray(orient + 10, orient + 36)), { orientation: 6, found: [] }, 'orientation kept on its own')
assert.equal(strip(strip(jpg)!.bytes)!.bytes.length, clean.bytes.length, 'stripping twice changes nothing more')

const chunk = (type: string, data: Uint8Array) => {
  const head = new Uint8Array(8)
  new DataView(head.buffer).setUint32(0, data.length)
  head.set(u8(type), 4)
  return u8([...head], [...data], [0, 0, 0, 0])
}
const png = u8('\x89PNG\r\n\x1a\n', [...chunk('IHDR', new Uint8Array(13))], [...chunk('tEXt', u8('Author\0me'))], [...chunk('IDAT', u8([1, 2, 3]))], [...chunk('eXIf', tiff)], [...chunk('IEND', new Uint8Array(0))])
const cleanPng = strip(png)!
assert.deepEqual(cleanPng.removed, ['text notes', 'EXIF data'])
assert.equal(cleanPng.bytes.length, png.length - (12 + 9) - (12 + tiff.length))
assert.ok(!has(cleanPng.bytes, 'Author') && has(cleanPng.bytes, 'IDAT') && has(cleanPng.bytes, 'IEND'))

const riff = (type: string, data: Uint8Array) => {
  const head = u8(type, [0, 0, 0, 0])
  new DataView(head.buffer).setUint32(4, data.length, true)
  return u8([...head], [...data], data.length & 1 ? [0] : [])
}
const body = u8([...riff('VP8X', u8([0x2c, 0, 0, 0, 0, 0, 0, 0, 0, 0]))], [...riff('VP8L', u8([1, 2, 3, 4]))], [...riff('EXIF', u8('odd'))], [...riff('XMP ', u8('<x/>'))])
const webp = u8('RIFF', [0, 0, 0, 0], 'WEBP', [...body])
new DataView(webp.buffer).setUint32(4, webp.length - 8, true)
const cleanWebp = strip(webp)!
assert.deepEqual(cleanWebp.removed, ['EXIF data', 'XMP data'])
assert.equal(cleanWebp.bytes[20], 0x20, 'only the ICC flag is left in VP8X')
assert.equal(new DataView(cleanWebp.bytes.buffer).getUint32(4, true), cleanWebp.bytes.length - 8, 'RIFF size updated')
assert.equal(cleanWebp.bytes.length, 12 + 18 + 12)

assert.equal(strip(u8('GIF89a')), null, 'other formats are not edited in place')
assert.throws(() => strip(u8([0xff, 0xd8, 0x00, 0x00])), /bad marker/, 'damaged JPEG throws')

console.log('image: ok')
