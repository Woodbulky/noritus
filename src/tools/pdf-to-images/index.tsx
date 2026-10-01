import { useState } from 'react'
import { Dropzone, FileRows, Room, RunPanel, Segmented } from '../../components/Tool'
import { useJob } from '../../components/useJob'
import { outName, stem } from '../../lib/files'
import { openPdf, renderPage } from '../../lib/pdfjs'
import { sanitizeFilename } from '../../lib/sanitize'
import { buildZip, type ZipEntry } from '../../lib/zip'

const FAQ: [string, string][] = [
  ['PNG or JPG?', 'PNG keeps text perfectly sharp. JPG makes much smaller files and suits pages full of photos.'],
  ['Which resolution should I pick?', '150 DPI is right for screens and sharing. Choose 300 DPI for printing, or 72 DPI for quick previews.'],
  ['Why did I get a ZIP?', 'A PDF with more than one page gives one image per page, bundled in a ZIP so you only download once.'],
  ['Is my PDF uploaded?', 'No. Pages are drawn inside this browser tab and the file never leaves your device.'],
]

export default function PdfToImages() {
  const [file, setFile] = useState<File | null>(null)
  const [format, setFormat] = useState<'png' | 'jpg'>('png')
  const [dpi, setDpi] = useState(150)
  const job = useJob(file, format, dpi)

  const run = () =>
    job.run(async (progress, signal, stage) => {
      const f = file!
      const doc = await openPdf(f)
      try {
        const n = doc.numPages
        const pad = String(n).length
        const base = sanitizeFilename(stem(f.name), 'page')
        const entries: ZipEntry[] = []
        let last: Blob | null = null
        // ponytail: rasterises on the main thread (pdf.js parses in its own worker); move to OffscreenCanvas if long PDFs stutter.
        for (let i = 1; i <= n && !signal.aborted; i++) {
          const canvas = await renderPage(doc, i, dpi / 72)
          last = await new Promise<Blob>((ok, fail) =>
            canvas.toBlob((b) => (b ? ok(b) : fail(new Error(`Page ${i} is too large to turn into an image. Try a lower resolution.`))), format === 'png' ? 'image/png' : 'image/jpeg', 0.9),
          )
          canvas.width = canvas.height = 0 // free the pixels now, not at GC time
          entries.push({ name: `${base}-${String(i).padStart(pad, '0')}.${format}`, bytes: new Uint8Array(await last.arrayBuffer()) })
          progress(i / n)
        }
        if (n === 1) return { blob: last!, name: outName(f.name, '', format) }
        stage('save')
        return { blob: await buildZip(entries), name: outName(f.name, `-${format}`, 'zip'), note: `${n} images` }
      } finally {
        void doc.loadingTask.destroy()
      }
    })

  return (
    <Room slug="pdf-to-images" faq={FAQ}>
      <div className="workbench">
        <div className="file-area">
          <Dropzone accept=".pdf,application/pdf" what="a PDF" onFiles={([f]) => setFile(f)} />
          <FileRows files={file ? [file] : []} onChange={() => setFile(null)} />
        </div>
        <div className="options">
          <h3>The finishing touches</h3>
          <Segmented
            label="Format"
            value={format}
            onChange={setFormat}
            options={[
              ['png', 'PNG'],
              ['jpg', 'JPG'],
            ]}
          />
          <Segmented
            label="Resolution"
            value={dpi}
            onChange={setDpi}
            options={[
              [72, '72 DPI'],
              [150, '150 DPI'],
              [300, '300 DPI'],
            ]}
          />
          <p>One image per page.</p>
          <RunPanel job={job} label="Make images" disabled={!file} onRun={run} />
        </div>
      </div>
    </Room>
  )
}
