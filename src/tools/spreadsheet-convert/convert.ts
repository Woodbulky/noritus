import * as XLSX from 'xlsx'

export type Target = 'csv' | 'xlsx' | 'json'
export type Out = { files: { name: string; bytes: Uint8Array }[]; sheets: number; rows: number }

const TEXT = /\.(csv|tsv|txt)$/i

function read(bytes: Uint8Array, name: string): XLSX.WorkBook {
  if (/\.json$/i.test(name)) {
    let data: unknown
    try {
      data = JSON.parse(new TextDecoder().decode(bytes))
    } catch {
      throw new Error(`“${name}” isn’t valid JSON.`)
    }
    const book = XLSX.utils.book_new()
    // An array of rows is one sheet; an object of arrays is one sheet per key.
    const sheets = Array.isArray(data) ? { Sheet1: data } : data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
    for (const [sheet, rows] of Object.entries(sheets)) {
      if (!Array.isArray(rows)) continue
      const objects = rows.every((r) => r && typeof r === 'object' && !Array.isArray(r))
      XLSX.utils.book_append_sheet(book, objects ? XLSX.utils.json_to_sheet(rows) : XLSX.utils.aoa_to_sheet(rows.map((r) => (Array.isArray(r) ? r : [r]))), sheet.slice(0, 31))
    }
    if (!book.SheetNames.length) throw new Error('This JSON has no rows. Use a list of objects, like [{"name": "Asha"}].')
    return book
  }
  try {
    // Text is decoded as UTF-8 first; SheetJS would otherwise guess an old code page.
    return TEXT.test(name) ? XLSX.read(new TextDecoder().decode(bytes), { type: 'string', cellDates: true }) : XLSX.read(bytes, { type: 'array', cellDates: true })
  } catch {
    throw new Error(`“${name}” couldn’t be read as a spreadsheet. Try re-saving it as .xlsx or .csv.`)
  }
}

/** Any sheet to CSV (one file per sheet), XLSX, or JSON (rows as objects keyed by the header row). */
export function convert(bytes: Uint8Array, name: string, to: Target, base: string): Out {
  const book = read(bytes, name)
  const names = book.SheetNames
  const rows = names.reduce((n, s) => n + XLSX.utils.sheet_to_json(book.Sheets[s]).length, 0)
  const enc = new TextEncoder()
  if (to === 'xlsx') return { files: [{ name: `${base}.xlsx`, bytes: new Uint8Array(XLSX.write(book, { type: 'array', bookType: 'xlsx' })) }], sheets: names.length, rows }
  if (to === 'json') {
    const json = (s: string) => XLSX.utils.sheet_to_json(book.Sheets[s], { defval: null })
    const data = names.length === 1 ? json(names[0]) : Object.fromEntries(names.map((s) => [s, json(s)]))
    return { files: [{ name: `${base}.json`, bytes: enc.encode(JSON.stringify(data, null, 2)) }], sheets: names.length, rows }
  }
  // A byte-order mark so Excel opens UTF-8 CSV with the right characters.
  const csv = (s: string) => enc.encode('﻿' + XLSX.utils.sheet_to_csv(book.Sheets[s]))
  const files = names.map((s) => ({ name: names.length === 1 ? `${base}.csv` : `${base}-${s.replace(/[/\\:*?"<>|]/g, '')}.csv`, bytes: csv(s) }))
  return { files, sheets: names.length, rows }
}
