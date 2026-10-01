import { useState } from 'react'
import { Dropzone, FileRows, Room, RunPanel, Segmented } from '../../components/Tool'
import { useJob } from '../../components/useJob'
import { stem } from '../../lib/files'
import { runWorker } from '../../lib/runWorker'
import { sanitizeFilename } from '../../lib/sanitize'
import { buildZip } from '../../lib/zip'
import type { Out, Target } from './convert'

const FAQ: [string, string][] = [
  ['Which files can I convert?', 'Excel (.xlsx, .xls), OpenDocument (.ods), CSV, TSV and JSON, to CSV, Excel or JSON.'],
  ['What happens to a workbook with several sheets?', 'Excel keeps them all. CSV gives one file per sheet in a ZIP. JSON gives one list per sheet, named after it.'],
  ['What JSON does it expect?', 'A list of rows such as [{"name": "Asha", "city": "Pune"}], or an object with one such list per sheet. The first row of a sheet becomes the keys.'],
  ['Is my spreadsheet uploaded?', 'No. It is converted inside this browser tab and never leaves your device.'],
]

const TYPES: Record<Target, string> = { csv: 'text/csv', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', json: 'application/json' }

export default function SpreadsheetConvert() {
  const [file, setFile] = useState<File | null>(null)
  const [to, setTo] = useState<Target>('xlsx')
  const job = useJob(file, to)
  const from = file?.name.split('.').pop()?.toLowerCase()

  const run = () =>
    job.run(async (progress, signal, stage) => {
      const bytes = new Uint8Array(await file!.arrayBuffer())
      progress(null)
      const base = sanitizeFilename(stem(file!.name), 'sheet')
      const out = await runWorker<Out>(new Worker(new URL('./sheet.worker.ts', import.meta.url), { type: 'module' }), { bytes, name: file!.name, to, base }, [bytes.buffer], signal)
      const note = `${out.rows.toLocaleString()} rows${out.sheets > 1 ? `, ${out.sheets} sheets` : ''}`
      if (out.files.length === 1) return { blob: new Blob([out.files[0].bytes as BlobPart], { type: TYPES[to] }), name: out.files[0].name, note }
      stage('save')
      return { blob: await buildZip(out.files), name: `${base}-csv.zip`, note }
    })

  return (
    <Room slug="spreadsheet-convert" faq={FAQ}>
      <div className="workbench">
        <div className="file-area">
          <Dropzone accept=".xlsx,.xls,.ods,.csv,.tsv,.json,text/csv,application/json" what="a spreadsheet, CSV or JSON" onFiles={([f]) => setFile(f)} />
          <FileRows files={file ? [file] : []} onChange={() => setFile(null)} />
        </div>
        <div className="options">
          <h3>The finishing touches</h3>
          <Segmented
            label="Convert to"
            value={to}
            onChange={setTo}
            options={[
              ['xlsx', 'Excel'],
              ['csv', 'CSV'],
              ['json', 'JSON'],
            ]}
          />
          <p>{to === 'csv' ? 'UTF-8 with a byte-order mark, so Excel shows every character correctly.' : to === 'json' ? 'Each row becomes an object, keyed by the header row.' : 'A standard .xlsx workbook that opens in Excel, Sheets and LibreOffice.'}</p>
          <RunPanel job={job} label="Convert" disabled={!file || from === to} onRun={run} />
        </div>
      </div>
    </Room>
  )
}
