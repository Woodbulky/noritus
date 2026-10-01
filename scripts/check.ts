/**
 * Node self-checks for pure logic in src/lib and src/tools/<slug>/*.ts.
 * Run with `npm run check`.
 */
import assert from 'node:assert/strict'
import { filterTools } from '../src/lib/search'
import './certify-check'
import './pdf-check'

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

console.log('check: ok')
