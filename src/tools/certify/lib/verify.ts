import { encode } from 'uqr'

/**
 * Certificate IDs and the QR that carries them.
 *
 * There is no backend, so verification is a list the organiser publishes: each
 * certificate is stamped with an ID, and `verify.csv` maps every ID back to a
 * name, a detail and an event. Anyone holding the CSV can check a scan.
 *
 * IDs are a pure function of name + event, so re-running a batch — or issuing
 * one replacement — produces the same ID as the first time.
 */

export type Corner = 'tl' | 'tr' | 'bl' | 'br'

export type QrStyle = {
  on: boolean
  corner: Corner
  /** Side of the QR as a fraction of template width. */
  size: number
  dark: string
  /** Plate drawn behind the code; a QR needs light quiet space to scan. */
  light: string
}

export const DEFAULT_QR: QrStyle = {
  on: false,
  corner: 'br',
  size: 0.11,
  dark: '#111111',
  light: '#ffffff',
}

export const CORNERS: { v: Corner; label: string }[] = [
  { v: 'tl', label: '↖' },
  { v: 'tr', label: '↗' },
  { v: 'bl', label: '↙' },
  { v: 'br', label: '↘' },
]

/** Crockford's base32: no I, L, O or U, so a read-aloud ID is unambiguous. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

function fnv1a(s: string, seed: number) {
  let h = seed >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}

/**
 * Eight base32 characters — 40 bits, taken from two independently seeded
 * FNV-1a passes. Well under 2^53, so the arithmetic below stays exact.
 */
export function certId(name: string, event: string) {
  const key = `${name.trim().toLowerCase()}|${event.trim().toLowerCase()}`
  let n = fnv1a(key, 0x811c9dc5) * 256 + (fnv1a(key, 0x9e3779b1) & 0xff)
  let out = ''
  for (let i = 0; i < 8; i++) {
    out = ALPHABET[n % 32] + out
    n = Math.floor(n / 32)
  }
  return out
}

/**
 * What the QR actually encodes. `{id}` in the link is substituted; a link
 * without it gets the ID appended, and no link at all falls back to the bare
 * ID so a scan still shows something checkable.
 */
export function qrPayload(id: string, link: string) {
  const url = link.trim()
  if (!url) return `CERT:${id}`
  if (url.includes('{id}')) return url.replaceAll('{id}', id)
  return url + (url.includes('?') ? '&' : '?') + `id=${id}`
}

/** Modules as `[row][col]`, row 0 at the top. */
export const qrMatrix = (text: string): boolean[][] => encode(text).data

/** Inset from the template edge, as a fraction of its width. */
// ponytail: fixed inset; make it a slider only if someone actually needs one.
const INSET = 0.06

/** Where the code lands, in template points, measured from the top-left. */
export function qrRect(qr: QrStyle, width: number, height: number) {
  const side = qr.size * width
  const m = INSET * width
  const left = qr.corner === 'tl' || qr.corner === 'bl'
  const top = qr.corner === 'tl' || qr.corner === 'tr'
  return { x: left ? m : width - m - side, y: top ? m : height - m - side, side }
}

/**
 * Dark modules merged into horizontal runs, as `[row, col, length]`. A typical
 * code has ~450 dark modules but only ~120 runs, and the PDF writer and the
 * canvas preview both draw one rectangle per run.
 */
export function* qrRuns(m: boolean[][]): Generator<[number, number, number]> {
  for (let r = 0; r < m.length; r++) {
    for (let c = 0; c < m.length; c++) {
      if (!m[r][c]) continue
      let end = c
      while (end + 1 < m.length && m[r][end + 1]) end++
      yield [r, c, end - c + 1]
      c = end
    }
  }
}

/** The light plate extends a 2-module quiet zone past the code on every side. */
export const quietZone = (side: number, modules: number) => (side / modules) * 2

const esc = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v)

/**
 * The verification list. Leads with a BOM so Excel opens Devanagari names as
 * UTF-8 instead of mojibake.
 */
export function verifyCsv(rows: { code: string; name: string; extra?: string }[], event: string) {
  const issued = new Date().toISOString().slice(0, 10)
  const lines = ['Certificate ID,Name,Detail,Event,Issued']
  for (const r of rows) {
    lines.push([r.code, r.name, r.extra ?? '', event, issued].map(esc).join(','))
  }
  return '﻿' + lines.join('\r\n') + '\r\n'
}
