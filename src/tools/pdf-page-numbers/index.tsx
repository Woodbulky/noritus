import { useState } from 'react'
import { Dropzone, Field, FileRows, Room, RunPanel, Segmented } from '../../components/Tool'
import { useJob } from '../../components/useJob'
import { outName, pdfBlob } from '../../lib/files'
import { NUMBER_FORMATS, type NumberFormat } from '../../lib/pages'
import type { NumberOptions } from '../../lib/pdfOps'
import { readInput, runPdf } from '../../lib/runPdf'

const FAQ: [string, string][] = [
  ['Can I start from a number other than 1?', 'Yes. Set “Start at”, for example to 3 if two cover pages come before this PDF.'],
  ['Will numbers land in the right place on rotated pages?', 'Yes. Positions follow the page as you see it, not how it is stored.'],
  ['Which font is used?', 'Helvetica, which every PDF reader has, so the numbers look the same everywhere.'],
  ['Is my PDF uploaded?', 'No. Numbers are added inside this browser tab and the file never leaves your device.'],
]

export default function PdfPageNumbers() {
  const [file, setFile] = useState<File | null>(null)
  const [format, setFormat] = useState<NumberFormat>('n')
  const [vertical, setVertical] = useState<NumberOptions['vertical']>('bottom')
  const [horizontal, setHorizontal] = useState<NumberOptions['horizontal']>('center')
  const [start, setStart] = useState(1)
  const [size, setSize] = useState(11)
  const job = useJob(file, format, vertical, horizontal, start, size)

  const run = () =>
    job.run(async (progress, signal) => {
      const bytes = await runPdf('pageNumbers', { file: await readInput(file!), format, vertical, horizontal, start, size, margin: 28 }, progress, signal)
      return { blob: pdfBlob(bytes), name: outName(file!.name, '-numbered', 'pdf') }
    })

  return (
    <Room slug="pdf-page-numbers" faq={FAQ}>
      <div className="workbench">
        <div className="file-area">
          <Dropzone accept=".pdf,application/pdf" what="a PDF" onFiles={([f]) => setFile(f)} />
          <FileRows files={file ? [file] : []} onChange={() => setFile(null)} />
        </div>
        <div className="options">
          <h3>The finishing touches</h3>
          <Segmented label="Style" value={format} onChange={setFormat} options={NUMBER_FORMATS} />
          <Segmented
            label="Position"
            value={vertical}
            onChange={setVertical}
            options={[
              ['top', 'Top'],
              ['bottom', 'Bottom'],
            ]}
          />
          <Segmented
            label="Alignment"
            value={horizontal}
            onChange={setHorizontal}
            options={[
              ['left', 'Left'],
              ['center', 'Centre'],
              ['right', 'Right'],
            ]}
          />
          <div className="side-by-side">
            <Field label="Start at">
              <input className="input" type="number" min={0} max={99999} value={start} onChange={(e) => setStart(Math.max(0, Math.floor(+e.target.value) || 0))} />
            </Field>
            <Field label="Size (pt)">
              <input className="input" type="number" min={6} max={48} value={size} onChange={(e) => setSize(Math.min(48, Math.max(6, +e.target.value || 11)))} />
            </Field>
          </div>
          <RunPanel job={job} label="Add page numbers" disabled={!file} onRun={run} />
        </div>
      </div>
    </Room>
  )
}
