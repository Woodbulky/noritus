import * as XLSX from 'xlsx'

/** First-cell values we treat as a header row rather than a name. */
const HEADERS = new Set(['name', 'names', 'student name', 'full name'])

export type SheetResult = {
  names: string[]
  /** Column B, aligned with `names` — feeds the optional second text field. */
  extras: string[]
  sheetName: string
  headerSkipped: boolean
}

/** Collapse runs of whitespace and trim, so "Diya  Patel" is one clean name. */
export const normalizeName = (raw: string) => raw.replace(/\s+/g, ' ').trim()

const cell = (v: unknown) => normalizeName(v == null ? '' : String(v))

/** First sheet, first column. Column B rides along for the second field. */
export async function parseSheet(file: File): Promise<SheetResult> {
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
    throw new Error(`"${file.name}" is not a spreadsheet. Choose an .xlsx, .xls or .csv file.`)
  }

  const buffer = await file.arrayBuffer()
  let book: XLSX.WorkBook
  try {
    // A .csv is bytes with no declared encoding, and SheetJS falls back to a
    // single-byte codepage — which turns "आरव" into mojibake. Google Sheets and
    // Excel both export UTF-8, usually without a BOM, so decode it as UTF-8
    // ourselves. TextDecoder strips a BOM if there is one and substitutes
    // U+FFFD rather than throwing on a genuinely legacy-encoded file.
    book = /\.csv$/i.test(file.name)
      ? XLSX.read(new TextDecoder().decode(buffer), { type: 'string', raw: false })
      : XLSX.read(buffer, { type: 'array', raw: false })
  } catch {
    throw new Error('That spreadsheet could not be read. Try re-saving it as .xlsx or .csv.')
  }

  const sheetName = book.SheetNames[0]
  if (!sheetName) throw new Error('That workbook has no sheets.')

  const rows = XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[sheetName], {
    header: 1,
    blankrows: false,
    defval: '',
  })
  if (rows.length === 0) throw new Error(`Sheet "${sheetName}" is empty.`)

  const pairs = rows.map((r) => [cell(r?.[0]), cell(r?.[1])] as const)
  const headerSkipped = HEADERS.has((pairs[0]?.[0] ?? '').toLowerCase())
  if (headerSkipped) pairs.shift()

  const kept = pairs.filter(([name]) => name !== '')
  if (kept.length === 0) {
    throw new Error(`No names in the first column of "${sheetName}". Put one name per row.`)
  }

  return {
    names: kept.map(([name]) => name),
    extras: kept.map(([, extra]) => extra),
    sheetName,
    headerSkipped,
  }
}

/** "Paste names" box: one per line, blanks dropped. */
export function parsePasted(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map(normalizeName)
    .filter(Boolean)
}
