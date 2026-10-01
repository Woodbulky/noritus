import { useState } from 'react'
import { Dropzone, FileRows, Room, RunPanel } from '../../components/Tool'
import { PageMarks, type Box } from '../../components/PageMarks'
import { usePdf } from '../../components/usePdf'
import { useJob } from '../../components/useJob'
import { outName, pages, pdfBlob } from '../../lib/files'
import { renderPage } from '../../lib/pdfjs'
import { runPdf, readInput } from '../../lib/runPdf'

const FAQ: [string, string][] = [
  ['Is the text really gone?', 'Yes. Every page with a box is turned into a picture with the box painted in, so the hidden words are no longer in the file at all.'],
  ['What happens to the other pages?', 'Pages without a box are kept exactly as they were, with their text still selectable.'],
  ['Why can’t I select text on a redacted page?', 'Because it is now a picture. That is what makes the redaction safe. Run OCR afterwards if you need that page searchable again.'],
  ['Is my PDF uploaded?', 'No. Pages are drawn and redacted inside this browser tab and the file never leaves your device.'],
]

const DPI = 150

export default function PdfRedact() {
  const [file, setFile] = useState<File | null>(null)
  const { doc, error } = usePdf(file)
  const [boxes, setBoxes] = useState<Box[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const job = useJob(file, boxes)

  const choose = (f: File | null) => {
    setFile(f)
    setBoxes([])
    setSelected(null)
  }

  const run = () =>
    job.run(async (progress, signal) => {
      const hit = [...new Set(boxes.map((b) => b.page))].sort((a, b) => a - b)
      const images = []
      for (const [i, page] of hit.entries()) {
        if (signal.aborted) break
        const canvas = await renderPage(doc!, page + 1, DPI / 72)
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = '#000'
        for (const b of boxes.filter((x) => x.page === page)) ctx.fillRect(b.l * canvas.width, b.t * canvas.height, b.w * canvas.width, b.h * canvas.height)
        const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/jpeg', 0.92))
        canvas.width = canvas.height = 0
        if (!blob) throw new Error(`Page ${page + 1} is too large to redact in this browser.`)
        images.push({ page, image: { name: `page-${page + 1}.jpg`, bytes: new Uint8Array(await blob.arrayBuffer()) } })
        progress(((i + 1) / hit.length) * 0.8)
      }
      const bytes = await runPdf('redact', { file: await readInput(file!), images }, (p) => p !== null && progress(0.8 + p * 0.2), signal)
      return { blob: pdfBlob(bytes), name: outName(file!.name, '-redacted', 'pdf'), note: `${pages(hit.length)} redacted` }
    })

  const count = new Set(boxes.map((b) => b.page)).size

  return (
    <Room slug="pdf-redact" faq={FAQ}>
      <div className="workbench">
        <div className="file-area">
          {file ? (
            <FileRows files={[file]} onChange={() => choose(null)} detail={() => (doc ? pages(doc.numPages) : 'Opening…')} />
          ) : (
            <Dropzone accept=".pdf,application/pdf" what="a PDF" onFiles={([f]) => choose(f)} />
          )}
          {error && (
            <p className="feedback" role="alert">
              {error}
            </p>
          )}
          {doc && <PageMarks doc={doc} boxes={boxes} onChange={setBoxes} selected={selected} onSelect={setSelected} create={(page, a) => ({ page, ...a })} paint={() => ({ background: '#000' })} />}
        </div>
        <div className="options">
          <h3>Black it out</h3>
          <p>Drag across anything you want gone: names, numbers, signatures. Go page by page with Previous and Next.</p>
          <p>
            {count
              ? `${boxes.length} ${boxes.length === 1 ? 'box' : 'boxes'} on ${pages(count)}. Those pages become pictures at ${DPI} DPI so the hidden content is truly removed.`
              : 'No boxes yet.'}
          </p>
          <RunPanel job={job} label="Redact PDF" disabled={!doc || !boxes.length} onRun={run} />
        </div>
      </div>
    </Room>
  )
}
