import { useState } from 'react'
import { Dropzone, FileRows, Room, RunPanel, Segmented } from '../../components/Tool'
import { useJob } from '../../components/useJob'
import { outName, pages, pdfBlob } from '../../lib/files'
import type { OcrWord } from '../../lib/pdfOps'
import { openPdf, renderPage } from '../../lib/pdfjs'
import { readInput, runPdf } from '../../lib/runPdf'

const FAQ: [string, string][] = [
  ['What does OCR do?', 'It reads the words in a scanned page or photo, so you can search, select and copy them. The searchable PDF looks exactly like the original.'],
  ['Why does it download something?', 'The first time, it fetches the text-recognition engine and your language (about 7 MB) from jsDelivr, a public code CDN. Only the engine is downloaded; your PDF stays here.'],
  ['How long does it take?', 'A few seconds per page on a laptop, longer on a phone. Long scans take a while, and you can cancel any time.'],
  ['Is my PDF uploaded?', 'No. The pages are read inside this browser tab and the file never leaves your device.'],
]

// Pinned so the engine and models can't change underneath us.
const CDN = 'https://cdn.jsdelivr.net/npm'
const ENGINE = { workerPath: `${CDN}/tesseract.js@7.0.0/dist/worker.min.js`, corePath: `${CDN}/tesseract.js-core@7.0.0` }
const LANGS: [string, string][] = [
  ['eng', 'English'],
  ['hin', 'Hindi'],
  ['spa', 'Spanish'],
  ['fra', 'French'],
  ['deu', 'German'],
]
const DPI = 300

export default function PdfOcr() {
  const [file, setFile] = useState<File | null>(null)
  const [lang, setLang] = useState('eng')
  const [output, setOutput] = useState<'pdf' | 'txt'>('pdf')
  const job = useJob(file, lang, output)

  const run = () =>
    job.run(async (progress, signal) => {
      const doc = await openPdf(file!)
      const { createWorker, OEM } = await import('tesseract.js')
      let page = 0
      const n = doc.numPages
      const worker = await createWorker(lang, OEM.LSTM_ONLY, {
        ...ENGINE,
        langPath: `${CDN}/@tesseract.js-data/${lang}@1.0.0/4.0.0_best_int`,
        cacheMethod: 'none', // the browser's HTTP cache keeps the model; nothing goes in IndexedDB
        logger: (m) => m.status === 'recognizing text' && progress((page + m.progress) / n),
      })
      const stop = () => void worker.terminate()
      signal.addEventListener('abort', stop)
      try {
        const layers: { page: number; words: OcrWord[] }[] = []
        const texts: string[] = []
        for (; page < n && !signal.aborted; page++) {
          const canvas = await renderPage(doc, page + 1, DPI / 72)
          const { width, height } = canvas
          const { data } = await worker.recognize(canvas, {}, { text: true, blocks: output === 'pdf' })
          canvas.width = canvas.height = 0
          texts.push(data.text.trim())
          const words = (data.blocks ?? []).flatMap((b) => b.paragraphs.flatMap((p) => p.lines.flatMap((l) => l.words)))
          layers.push({
            page,
            words: words
              .filter((w) => w.text.trim() && w.confidence > 30)
              .map((w) => ({ text: w.text, box: { l: w.bbox.x0 / width, t: w.bbox.y0 / height, w: (w.bbox.x1 - w.bbox.x0) / width, h: (w.bbox.y1 - w.bbox.y0) / height } })),
          })
        }
        if (signal.aborted) throw new DOMException('Cancelled', 'AbortError')
        const found = texts.join('\n\n')
        if (!found.trim()) throw new Error('No text was found. Check the language, or try a sharper scan.')
        if (output === 'txt') return { blob: new Blob([found], { type: 'text/plain;charset=utf-8' }), name: outName(file!.name, '-ocr', 'txt'), note: `${pages(n)} read` }
        const bytes = await runPdf('ocrLayer', { file: await readInput(file!), pages: layers }, undefined, signal)
        return { blob: pdfBlob(bytes), name: outName(file!.name, '-searchable', 'pdf'), note: `${pages(n)} read` }
      } finally {
        signal.removeEventListener('abort', stop)
        stop()
        void doc.loadingTask.destroy()
      }
    })

  return (
    <Room slug="pdf-ocr" faq={FAQ}>
      <div className="workbench">
        <div className="file-area">
          <Dropzone accept=".pdf,application/pdf" what="a scanned PDF" onFiles={([f]) => setFile(f)} />
          <FileRows files={file ? [file] : []} onChange={() => setFile(null)} />
        </div>
        <div className="options">
          <h3>The finishing touches</h3>
          <Segmented label="Language" value={lang} onChange={setLang} options={LANGS} />
          <Segmented
            label="Get"
            value={output}
            onChange={setOutput}
            options={[
              ['pdf', 'Searchable PDF'],
              ['txt', 'Plain text'],
            ]}
          />
          <p>{output === 'pdf' && lang === 'hin' ? 'Hindi is best as plain text; the searchable PDF can only hold Latin letters for now.' : 'The first run downloads the reading engine and language, about 7 MB, once.'}</p>
          <RunPanel job={job} label="Read text" disabled={!file} onRun={run} />
        </div>
      </div>
    </Room>
  )
}
