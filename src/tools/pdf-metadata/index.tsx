import { useEffect, useState } from 'react'
import { Dropzone, Field, FileRows, Room, RunPanel, Segmented } from '../../components/Tool'
import { useJob } from '../../components/useJob'
import { outName, pdfBlob } from '../../lib/files'
import type { Meta } from '../../lib/pdfOps'
import { readInput, runPdf } from '../../lib/runPdf'

const FAQ: [string, string][] = [
  ['What is PDF metadata?', 'Hidden document properties: title, author, the app that made it, and when. They travel with the file and can reveal more than you meant to share.'],
  ['What does “Remove everything” clear?', 'Title, author, subject, keywords, the creating app and both dates, plus the XMP copy some apps keep. The pages are untouched.'],
  ['Why does my PDF reader show a different title?', 'Some readers show the file name when there is no title. After editing, close and reopen the file to see the new properties.'],
  ['Is my PDF uploaded?', 'No. The properties are read and changed inside this browser tab and the file never leaves your device.'],
]

const KEYS = ['Title', 'Author', 'Subject', 'Keywords', 'Creator', 'Producer'] as const
const LABEL: Record<(typeof KEYS)[number], string> = { Title: 'Title', Author: 'Author', Subject: 'Subject', Keywords: 'Keywords', Creator: 'Made with', Producer: 'Saved by' }
const when = (iso: string) => (iso ? new Date(iso).toLocaleString() : 'Not set')

export default function PdfMetadata() {
  const [file, setFile] = useState<File | null>(null)
  const [meta, setMeta] = useState<Meta | null>(null)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'edit' | 'clear'>('edit')
  const job = useJob(file, meta, mode)

  useEffect(() => {
    if (!file) return
    const ctrl = new AbortController()
    readInput(file)
      .then((input) => runPdf('readMeta', { file: input }, undefined, ctrl.signal))
      .then(setMeta, (e: Error) => e.name !== 'AbortError' && setError(e.message))
    return () => ctrl.abort()
  }, [file])

  const choose = (f: File | null) => {
    setFile(f)
    setMeta(null)
    setError('')
  }

  const run = () =>
    job.run(async (progress, signal) => {
      const bytes = await runPdf('writeMeta', { file: await readInput(file!), meta: meta!, clear: mode === 'clear' }, progress, signal)
      return { blob: pdfBlob(bytes), name: outName(file!.name, mode === 'clear' ? '-clean' : '', 'pdf') }
    })

  return (
    <Room slug="pdf-metadata" faq={FAQ}>
      <div className="workbench">
        <div className="file-area">
          {file ? <FileRows files={[file]} onChange={() => choose(null)} /> : <Dropzone accept=".pdf,application/pdf" what="a PDF" onFiles={([f]) => choose(f)} />}
          {error && (
            <p className="feedback" role="alert">
              {error}
            </p>
          )}
          {meta && (
            <div className="form-fields">
              {KEYS.map((k) => (
                <Field key={k} label={LABEL[k]}>
                  <input className="input" value={meta[k]} disabled={mode === 'clear'} onChange={(e) => setMeta({ ...meta, [k]: e.target.value })} />
                </Field>
              ))}
              <p className="muted">
                Created: {when(meta.created)} · Modified: {when(meta.modified)}
              </p>
            </div>
          )}
        </div>
        <div className="options">
          <h3>The finishing touches</h3>
          <Segmented
            label="Properties"
            value={mode}
            onChange={setMode}
            options={[
              ['edit', 'Edit'],
              ['clear', 'Remove everything'],
            ]}
          />
          <p>{mode === 'edit' ? 'Change any field on the left. An empty field is removed from the file.' : 'Every property and date is removed. The pages stay as they are.'}</p>
          <RunPanel job={job} label={mode === 'edit' ? 'Save properties' : 'Remove properties'} disabled={!meta} onRun={run} />
        </div>
      </div>
    </Room>
  )
}
