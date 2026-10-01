import { useEffect, useState } from 'react'
import { Dropzone, FileRows, Room, RunPanel } from '../../components/Tool'
import { useJob } from '../../components/useJob'
import { outName, pdfBlob } from '../../lib/files'
import { openPdf, thumbnail } from '../../lib/pdfjs'
import { readInput, runPdf } from '../../lib/runPdf'

const FAQ: [string, string][] = [
  ['How do I reorder pages?', 'Drag a page onto another to place it before that page, or use the arrows under each page. The arrows also work with the keyboard.'],
  ['Does rotating lower the quality?', 'No. Rotation is a setting stored with the page, so nothing is redrawn or recompressed.'],
  ['Can I undo a change?', 'Use “Start over” to bring back the original order, rotation and deleted pages.'],
  ['Is my PDF uploaded?', 'No. Thumbnails and the new PDF are both made inside this browser tab.'],
]

type Page = { index: number; rotate: number }

const fresh = (count: number): Page[] => Array.from({ length: count }, (_, index) => ({ index, rotate: 0 }))

export default function PdfOrganize() {
  const [file, setFile] = useState<File | null>(null)
  const [count, setCount] = useState(0)
  const [pages, setPages] = useState<Page[]>([])
  const [thumbs, setThumbs] = useState<string[]>([])
  const [error, setError] = useState('')
  const [drag, setDrag] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const job = useJob(file, pages)

  // Open the PDF, list its pages, then draw thumbnails one by one.
  const choose = (f: File | null) => {
    setFile(f)
    setCount(0)
    setPages([])
    setThumbs([])
    setError('')
  }

  useEffect(() => {
    if (!file) return
    let live = true
    let destroy = () => {}
    openPdf(file).then(
      async (doc) => {
        destroy = () => void doc.loadingTask.destroy()
        if (!live) return destroy()
        setCount(doc.numPages)
        setPages(fresh(doc.numPages))
        for (let n = 1; n <= doc.numPages && live; n++) {
          const url = await thumbnail(doc, n).catch(() => '')
          if (live) setThumbs((t) => Object.assign([...t], { [n - 1]: url }))
        }
        destroy()
      },
      (e: Error) => live && setError(e.message),
    )
    return () => {
      live = false
      destroy()
    }
  }, [file])

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= pages.length) return
    const next = [...pages]
    next.splice(to, 0, ...next.splice(from, 1))
    setPages(next)
  }
  const update = (i: number, p: Page | null) => setPages(pages.flatMap((x, j) => (j !== i ? [x] : p ? [p] : [])))

  const run = () =>
    job.run(async (_progress, signal) => {
      const bytes = await runPdf('organize', { file: await readInput(file!), pages }, undefined, signal)
      return { blob: pdfBlob(bytes), name: outName(file!.name, '-organized', 'pdf'), note: `${pages.length} pages` }
    })

  return (
    <Room slug="pdf-organize" faq={FAQ}>
      <div className="workbench">
        <div className="file-area">
          {file ? (
            <FileRows files={[file]} onChange={() => choose(null)} detail={() => (pages.length ? `${pages.length} pages` : 'Opening…')} />
          ) : (
            <Dropzone accept=".pdf,application/pdf" what="a PDF" onFiles={([f]) => choose(f)} />
          )}
          {error && (
            <p className="feedback" role="alert">
              {error}
            </p>
          )}
          <div className="page-grid">
            {pages.map((p, i) => (
              <div
                key={p.index}
                className={`page-card${drag === i ? ' dragging' : ''}${over === i && drag !== null && drag !== i ? ' drop-before' : ''}`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move'
                  setDrag(i)
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  setOver(i)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  if (drag !== null) move(drag, i)
                }}
                onDragEnd={() => {
                  setDrag(null)
                  setOver(null)
                }}
              >
                <div className="sheet">
                  {thumbs[p.index] && <img src={thumbs[p.index]} alt={`Page ${p.index + 1}`} style={{ transform: `rotate(${p.rotate}deg) scale(${p.rotate % 180 ? 0.76 : 1})` }} />}
                </div>
                <div className="page-foot">
                  <span>{p.index + 1}</span>
                  <div>
                    <button className="row-btn" aria-label={`Move page ${p.index + 1} earlier`} disabled={i === 0} onClick={() => move(i, i - 1)}>
                      ←
                    </button>
                    <button className="row-btn" aria-label={`Move page ${p.index + 1} later`} disabled={i === pages.length - 1} onClick={() => move(i, i + 1)}>
                      →
                    </button>
                    <button className="row-btn" aria-label={`Rotate page ${p.index + 1} clockwise`} onClick={() => update(i, { ...p, rotate: (p.rotate + 90) % 360 })}>
                      ↻
                    </button>
                    <button className="row-btn" aria-label={`Delete page ${p.index + 1}`} disabled={pages.length === 1} onClick={() => update(i, null)}>
                      ×
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="options">
          <h3>The finishing touches</h3>
          <p>Drag pages to reorder them, or use the arrows. ↻ turns a page clockwise and × removes it.</p>
          {count > 0 && (
            <button className="text-link" style={{ alignSelf: 'flex-start' }} onClick={() => setPages(fresh(count))}>
              Start over <span>↺</span>
            </button>
          )}
          <RunPanel job={job} label="Save PDF" disabled={!pages.length} onRun={run} />
        </div>
      </div>
    </Room>
  )
}
