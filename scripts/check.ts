/**
 * Node self-checks for pure logic in src/lib and src/tools/<slug>/*.ts.
 * Run with `npm run check`.
 */
import assert from 'node:assert/strict'
import { filterTools } from '../src/lib/search'
import { accepts, viewableType } from '../src/lib/handoff'
import './certify-check'
import './pdf-check'
import './media-check'
import './image-check'
import './util-check'

const tools = [
  { name: 'Merge PDF', blurb: 'Bring pages together.', category: 'PDF' },
  { name: 'MP4 to MP3', blurb: 'Keep the sound.', category: 'Media' },
  { name: 'QR code maker', blurb: 'A little square.', category: 'Generate' },
]
const names = (cat: string, q: string) => filterTools(tools, cat, q).map((t) => t.name)

assert.deepEqual(names('all', ''), ['Merge PDF', 'MP4 to MP3', 'QR code maker'])
assert.deepEqual(names('all', '   '), names('all', ''))
assert.deepEqual(names('Media', ''), ['MP4 to MP3'])
assert.deepEqual(names('all', 'pdf'), ['Merge PDF'], 'case-insensitive')
assert.deepEqual(names('all', 'media'), ['MP4 to MP3'], 'matches category')
assert.deepEqual(names('all', 'mp3 sound'), ['MP4 to MP3'], 'every word, any order')
assert.deepEqual(names('all', 'mp3 square'), [], 'all words must match')
assert.deepEqual(names('PDF', 'qr'), [], 'category and query combine')
assert.deepEqual(names('all', 'merge photo'), [], 'alias still needs a match')
assert.deepEqual(filterTools([{ name: 'Resize image', blurb: '', category: 'Image' }], 'all', 'resize photo').length, 1, 'photo means image')

assert.ok(accepts({ name: 'a.PDF', type: '' }, '.pdf,application/pdf'), 'extension, any case')
assert.ok(accepts({ name: 'x', type: 'video/mp4' }, 'video/*,.mkv'), 'wildcard')
assert.ok(!accepts({ name: 'a.zip', type: 'application/zip' }, 'image/*,.png'), 'no match')
assert.equal(viewableType('clip.MP4'), 'video/mp4')
assert.equal(viewableType('pages.zip'), '', 'download-only')
assert.equal(viewableType('logo.svg'), '', 'svg never opened as a page')

console.log('check: ok')
