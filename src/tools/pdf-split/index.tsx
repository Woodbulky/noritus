import { useState } from 'react'
import { Dropzone, Field, FileRows, Room, RunPanel, Segmented } from '../../components/Tool'
import { useJob } from '../../components/useJob'
import { outName, pages, pdfBlob, stem } from '../../lib/files'
import { readInput, runPdf } from '../../lib/runPdf'
import { sanitizeFilename } from '../../lib/sanitize'
import { buildZip } from '../../lib/zip'

type Mode = 'every' | 'ranges' | 'extract'

const FAQ: [string, string][] = [
  ['How do I write page ranges?', 'Use commas and dashes: “1-3, 5, 8-” means pages 1 to 3, page 5, and page 8 to the end.'],
  ['What is the difference between the modes?', '“Every page” makes one PDF per page. “By ranges” makes one PDF per range. “Extract” puts all the pages you list into a single PDF.'],
  ['Why did I get a ZIP?', 'When the split makes more than one PDF, they are bundled into one ZIP so you only download once.'],
  ['Is my PDF uploaded?', 'No. Splitting happens in this browser tab and the file never leaves your device.'],
]

const label = (g: number[]) => (g.length === 1 ? `p${g[0] + 1}` : `p${g[0] + 1}-${g[g.length - 1] + 1}`)

export default function PdfSplit() {
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<Mode>('every')
  const [ranges, setRanges] = useState('')
  const job = useJob(file, mode, ranges)

  const run = () =>
    job.run(async (progress, signal, stage) => {
      const f = file!
      const outs = await runPdf('split', { file: await readInput(f), ranges: mode === 'every' ? null : ranges, extract: mode === 'extract' }, progress, signal)
      if (outs.length === 1) {
        const [o] = outs
        return { blob: pdfBlob(o.bytes), name: outName(f.name, mode === 'extract' ? '-extract' : `-${label(o.pages)}`, 'pdf'), note: pages(o.pages.length) }
      }
      const base = sanitizeFilename(stem(f.name), 'file')
      stage('save')
      const blob = await buildZip(outs.map((o) => ({ name: `${base}-${label(o.pages)}.pdf`, bytes: o.bytes })))
      return { blob, name: outName(f.name, '-split', 'zip'), note: `${outs.length} PDFs` }
    })

  return (
    <Room slug="pdf-split" faq={FAQ}>
      <div className="workbench">
        <div className="file-area">
          <Dropzone accept=".pdf,application/pdf" what="a PDF" onFiles={([f]) => setFile(f)} />
          <FileRows files={file ? [file] : []} onChange={() => setFile(null)} />
        </div>
        <div className="options">
          <h3>The finishing touches</h3>
          <Segmented
            label="Split"
            value={mode}
            onChange={setMode}
            options={[
              ['every', 'Every page'],
              ['ranges', 'By ranges'],
              ['extract', 'Extract'],
            ]}
          />
          {mode !== 'every' && (
            <Field label="Pages">
              <input className="input" value={ranges} onChange={(e) => setRanges(e.target.value)} placeholder="1-3, 5, 8-" />
            </Field>
          )}
          <p>
            {mode === 'every'
              ? 'One PDF per page, bundled in a ZIP.'
              : mode === 'ranges'
                ? 'One PDF per range. Several ranges come as a ZIP.'
                : 'All the pages you list, in that order, in one PDF.'}
          </p>
          <RunPanel job={job} label="Split PDF" disabled={!file || (mode !== 'every' && !ranges.trim())} onRun={run} />
        </div>
      </div>
    </Room>
  )
}
