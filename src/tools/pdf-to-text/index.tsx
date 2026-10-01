import { useState } from 'react'
import { Dropzone, FileRows, Room, RunPanel } from '../../components/Tool'
import { useJob } from '../../components/useJob'
import { outName, pages } from '../../lib/files'
import { openPdf } from '../../lib/pdfjs'

const FAQ: [string, string][] = [
  ['Why is my text file empty?', 'The PDF is probably a scan: pictures of pages with no text inside. Use PDF OCR to read the text out of the pictures.'],
  ['Is the layout kept?', 'Only the reading order and line breaks. Columns, tables and fonts are not kept; this gives you plain text to paste anywhere.'],
  ['Does it work with Hindi and other languages?', 'Yes. Whatever text is stored in the PDF comes out as it is, in any language.'],
  ['Is my PDF uploaded?', 'No. The text is read inside this browser tab and the file never leaves your device.'],
]

export default function PdfToText() {
  const [file, setFile] = useState<File | null>(null)
  const job = useJob(file)

  const run = () =>
    job.run(async (progress, signal) => {
      const doc = await openPdf(file!)
      try {
        const out: string[] = []
        for (let i = 1; i <= doc.numPages && !signal.aborted; i++) {
          const page = await doc.getPage(i)
          const { items } = await page.getTextContent()
          out.push(items.map((it) => ('str' in it ? it.str + (it.hasEOL ? '\n' : '') : '')).join('').trim())
          page.cleanup()
          progress(i / doc.numPages)
        }
        const text = out.join('\n\n').trim()
        if (!text.trim()) throw new Error('This PDF has no text inside, so it is probably a scan. Try PDF OCR to read it.')
        return { blob: new Blob([text], { type: 'text/plain;charset=utf-8' }), name: outName(file!.name, '', 'txt'), note: `${pages(doc.numPages)}, ${text.length.toLocaleString()} characters` }
      } finally {
        void doc.loadingTask.destroy()
      }
    })

  return (
    <Room slug="pdf-to-text" faq={FAQ}>
      <div className="workbench">
        <div className="file-area">
          <Dropzone accept=".pdf,application/pdf" what="a PDF" onFiles={([f]) => setFile(f)} />
          <FileRows files={file ? [file] : []} onChange={() => setFile(null)} />
        </div>
        <div className="options">
          <h3>The finishing touches</h3>
          <p>Every page’s text, in reading order, in one plain .txt file. A blank line separates pages.</p>
          <RunPanel job={job} label="Get text" disabled={!file} onRun={run} />
        </div>
      </div>
    </Room>
  )
}
