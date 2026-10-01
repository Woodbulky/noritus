import { useState } from 'react'
import { Dropzone, Field, FileRows, Room, RunPanel, Segmented } from '../../components/Tool'
import { PageMarks, type Box } from '../../components/PageMarks'
import { usePdf } from '../../components/usePdf'
import { useJob } from '../../components/useJob'
import { outName, pages, pdfBlob } from '../../lib/files'
import type { MarkKind } from '../../lib/pdfOps'
import { readInput, runPdf } from '../../lib/runPdf'

const FAQ: [string, string][] = [
  ['How do I add something?', 'Pick Text, Highlight, Whiteout, Box or Ellipse, then drag across the page where it should go. Select it again to move, resize or remove it.'],
  ['Does whiteout delete the text underneath?', 'No. It paints white over it, which hides it on screen and in print, but the text is still in the file. Use Redact PDF to really remove it.'],
  ['Can I edit the existing text?', 'Not in place. Whiteout over the old words, then add a text box with the new ones.'],
  ['Is my PDF uploaded?', 'No. Everything is drawn inside this browser tab and the file never leaves your device.'],
]

type Mark = Box & { kind: MarkKind; color: string; text: string; size: number }

const KINDS: [MarkKind, string][] = [
  ['text', 'Text'],
  ['highlight', 'Highlight'],
  ['whiteout', 'Whiteout'],
  ['box', 'Box'],
  ['ellipse', 'Ellipse'],
]
const DEFAULT_COLOR: Record<MarkKind, string> = { text: '#183e38', highlight: '#f1ce69', whiteout: '#ffffff', box: '#ce4b2c', ellipse: '#ce4b2c' }

export default function PdfAnnotate() {
  const [file, setFile] = useState<File | null>(null)
  const { doc, error } = usePdf(file)
  const [marks, setMarks] = useState<Mark[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [kind, setKind] = useState<MarkKind>('text')
  const [color, setColor] = useState(DEFAULT_COLOR.text)
  const [size, setSize] = useState(14)
  const job = useJob(file, marks)
  const pick = marks.find((m) => m.id === selected)

  const choose = (f: File | null) => {
    setFile(f)
    setMarks([])
    setSelected(null)
  }
  const edit = (patch: Partial<Mark>) => setMarks(marks.map((m) => (m.id === selected ? { ...m, ...patch } : m)))

  const run = () =>
    job.run(async (progress, signal) => {
      const out = marks.filter((m) => m.kind !== 'text' || m.text.trim()).map(({ page, kind, color, text, size, l, t, w, h }) => ({ page, kind, color, text, size, rect: { l, t, w, h } }))
      const bytes = await runPdf('annotate', { file: await readInput(file!), marks: out }, progress, signal)
      return { blob: pdfBlob(bytes), name: outName(file!.name, '-annotated', 'pdf') }
    })

  return (
    <Room slug="pdf-annotate" faq={FAQ}>
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
          {doc && (
            <PageMarks
              doc={doc}
              boxes={marks}
              onChange={setMarks}
              selected={selected}
              onSelect={setSelected}
              create={(page, a) => ({ page, ...a, kind, color, size, text: kind === 'text' ? 'Your text' : '' })}
              paint={(m) =>
                m.kind === 'highlight'
                  ? { background: m.color, mixBlendMode: 'multiply' }
                  : m.kind === 'whiteout'
                    ? { background: '#fff' }
                    : m.kind === 'text'
                      ? { color: m.color }
                      : { border: `2px solid ${m.color}`, borderRadius: m.kind === 'ellipse' ? '50%' : 0 }
              }
            >
              {(m, scale) => (m.kind === 'text' ? <span style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontSize: m.size * scale, paddingLeft: 2 * scale, display: 'block' }}>{m.text}</span> : null)}
            </PageMarks>
          )}
        </div>
        <div className="options">
          <h3>Mark it up</h3>
          <Segmented
            label="Add"
            value={kind}
            onChange={(k) => {
              setKind(k)
              setColor(DEFAULT_COLOR[k])
            }}
            options={KINDS}
          />
          {kind !== 'whiteout' && (
            <div className="side-by-side">
              <Field label="Colour">
                <input className="input" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
              </Field>
              {kind === 'text' && (
                <Field label={`Size · ${size} pt`}>
                  <input type="range" min={6} max={48} value={size} onChange={(e) => setSize(+e.target.value)} />
                </Field>
              )}
            </div>
          )}
          <p>Drag across the page to add a {KINDS.find(([k]) => k === kind)![1].toLowerCase()}.</p>
          {pick && (
            <>
              <span className="option-label">Selected {KINDS.find(([k]) => k === pick.kind)![1].toLowerCase()}</span>
              {pick.kind === 'text' && (
                <Field label="Its text">
                  <textarea className="input" rows={3} value={pick.text} onChange={(e) => edit({ text: e.target.value })} />
                </Field>
              )}
              {pick.kind !== 'whiteout' && (
                <div className="side-by-side">
                  <Field label="Its colour">
                    <input className="input" type="color" value={pick.color} onChange={(e) => edit({ color: e.target.value })} />
                  </Field>
                  {pick.kind === 'text' && (
                    <Field label={`Its size · ${pick.size} pt`}>
                      <input type="range" min={6} max={48} value={pick.size} onChange={(e) => edit({ size: +e.target.value })} />
                    </Field>
                  )}
                </div>
              )}
            </>
          )}
          <RunPanel job={job} label="Save PDF" disabled={!doc || !marks.length} onRun={run} />
        </div>
      </div>
    </Room>
  )
}
