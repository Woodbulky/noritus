/** Phase 5 utilities: pure logic, checked in Node. Imported by check.ts. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import * as XLSX from 'xlsx'
import { md5 } from '../src/tools/hash/md5'
import { entropy, generate, groups } from '../src/tools/password-generator/password'
import { diffLines } from '../src/tools/text-diff/diff'
import { count, minutes } from '../src/tools/word-counter/count'
import { fromBase64, toBase64 } from '../src/tools/base64/b64'
import { convert } from '../src/tools/spreadsheet-convert/convert'

// --- md5 against Node, across block and padding boundaries ---
const enc = new TextEncoder()
assert.equal(md5(new Uint8Array()), 'd41d8cd98f00b204e9800998ecf8427e')
assert.equal(md5(enc.encode('abc')), '900150983cd24fb0d6963f7d28e17f72')
for (const n of [1, 55, 56, 63, 64, 65, 119, 120, 1000, 100_003]) {
  const b = Uint8Array.from({ length: n }, (_, i) => (i * 31 + 7) & 255)
  assert.equal(md5(b), createHash('md5').update(b).digest('hex'), `md5 of ${n} bytes`)
}

// --- passwords ---
const all = { lower: true, upper: true, digits: true, symbols: true, similar: false }
for (let i = 0; i < 200; i++) {
  const p = generate(8, all)
  assert.equal(p.length, 8)
  assert.ok(/[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p) && /[^a-zA-Z\d]/.test(p), `every group present: ${p}`)
}
assert.ok(!/[Il1O0o]/.test(generate(200, { ...all, similar: true })))
assert.equal(generate(10, { lower: false, upper: false, digits: false, symbols: false, similar: false }), '')
assert.equal(generate(6, { ...all, lower: false, upper: false, symbols: false }).replace(/\d/g, ''), '')
assert.equal(entropy(10, { ...all, upper: false, symbols: false }), Math.round(10 * Math.log2(36)))
assert.equal(groups({ ...all, similar: true })[2], '23456789')
// Rejection keeps the pick uniform: values at or above the limit are thrown away.
let calls = 0
const seq = [2 ** 32 - 1, 5]
assert.equal(generate(1, { lower: false, upper: false, digits: true, symbols: false, similar: false }, () => seq[calls++]), '5')

// --- diff ---
const d = (a: string, b: string, key?: (s: string) => string) => diffLines(a.split('\n'), b.split('\n'), key)!.map((l) => (l.kind === 'same' ? ' ' : l.kind === 'add' ? '+' : '-') + l.text)
assert.deepEqual(d('a\nb\nc', 'a\nx\nc'), [' a', '-b', '+x', ' c'])
assert.deepEqual(d('a\nb', 'a\nb\nc'), [' a', ' b', '+c'])
assert.deepEqual(d('a\nb\nc', 'b'), ['-a', ' b', '-c'])
assert.deepEqual(d('Hello', 'hello', (s) => s.toLowerCase()), [' hello'])
assert.deepEqual(d('', ''), [' '])
assert.equal(diffLines(Array.from({ length: 5000 }, (_, i) => `a${i}`), Array.from({ length: 5000 }, (_, i) => `b${i}`)), null, 'too big says so')

// --- word count ---
const c = count('Hello world. This is a test!\n\nSecond paragraph here, world.')
assert.deepEqual([c.words, c.sentences, c.paragraphs], [10, 3, 2])
assert.deepEqual(c.top[0], ['world', 2])
assert.equal(count('नमस्ते दुनिया').words, 2, 'Hindi words')
assert.equal(count('👍🏽 ok').characters, 4, 'an emoji with a skin tone is one character')
assert.equal(count('a b').noSpaces, 2)
assert.equal(count('').words, 0)
assert.equal(minutes(100, 238), 'under a minute')
assert.equal(minutes(1000, 238), '4 min')

// --- base64 ---
const bytes = Uint8Array.from({ length: 70_000 }, (_, i) => i & 255)
assert.equal(toBase64(bytes), Buffer.from(bytes).toString('base64'))
assert.deepEqual(fromBase64(toBase64(bytes)).bytes, bytes)
assert.equal(toBase64(enc.encode('??>'), true), 'Pz8-')
assert.equal(new TextDecoder().decode(fromBase64('Pz8-').bytes), '??>')
assert.deepEqual(fromBase64('data:image/png;base64,iVBO').type, 'image/png')
assert.equal(new TextDecoder().decode(fromBase64(' aGVs\nbG8= ').bytes), 'hello')
assert.throws(() => fromBase64('abc$'), /valid Base64/)
assert.throws(() => fromBase64('a'), /valid Base64/)

// --- spreadsheets ---
const csvIn = enc.encode('name,city\nÅsa,Pune\nRavi,Delhi\n')
const asJson = JSON.parse(new TextDecoder().decode(convert(csvIn, 'people.csv', 'json', 'people').files[0].bytes))
assert.deepEqual(asJson, [{ name: 'Åsa', city: 'Pune' }, { name: 'Ravi', city: 'Delhi' }], 'UTF-8 CSV keeps accents')
const x = convert(csvIn, 'people.csv', 'xlsx', 'people')
assert.equal(x.rows, 2)
const back = XLSX.read(x.files[0].bytes, { type: 'array' })
assert.equal(back.Sheets[back.SheetNames[0]].A2.v, 'Åsa')
const fromJson = convert(enc.encode(JSON.stringify({ A: [{ n: 1 }], B: [{ n: 2 }, { n: 3 }] })), 'two.json', 'csv', 'two')
assert.deepEqual(fromJson.files.map((f) => f.name), ['two-A.csv', 'two-B.csv'])
assert.equal(new TextDecoder('utf-8', { ignoreBOM: true }).decode(fromJson.files[1].bytes), '﻿n\n2\n3')
assert.throws(() => convert(enc.encode('{oops'), 'bad.json', 'csv', 'bad'), /isn’t valid JSON/)
assert.throws(() => convert(enc.encode('{"a": 1}'), 'flat.json', 'csv', 'flat'), /has no rows/)

console.log('util: ok')
