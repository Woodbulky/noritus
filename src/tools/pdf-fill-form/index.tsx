import { useEffect, useState } from 'react'
import { Dropzone, Field, FileRows, Room, RunPanel } from '../../components/Tool'
import { useJob } from '../../components/useJob'
import { outName, pdfBlob } from '../../lib/files'
import type { FormField } from '../../lib/pdfOps'
import { readInput, runPdf } from '../../lib/runPdf'

const FAQ: [string, string][] = [
  ['Which PDFs work?', 'PDFs with real fillable fields, the kind you can click into in a PDF reader. A scanned form has none; use Annotate PDF to type on it instead.'],
  ['What does “Lock the answers” do?', 'It flattens the form: the answers become part of the page and can no longer be changed. Good for sending a finished form.'],
  ['Why are some characters refused?', 'The answers are drawn with a built-in Latin font. Letters outside it, such as Hindi or Chinese, can’t be drawn yet.'],
  ['Is my form uploaded?', 'No. The form is read and filled inside this browser tab and never leaves your device.'],
]

export default function PdfFillForm() {
  const [file, setFile] = useState<File | null>(null)
  const [fields, setFields] = useState<FormField[] | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [flatten, setFlatten] = useState(false)
  const job = useJob(file, values, flatten)

  useEffect(() => {
    if (!file) return
    const ctrl = new AbortController()
    readInput(file)
      .then((input) => runPdf('readForm', { file: input }, undefined, ctrl.signal))
      .then(
        (fs) => {
          setFields(fs)
          setValues(Object.fromEntries(fs.map((f) => [f.name, f.value])))
        },
        (e: Error) => e.name !== 'AbortError' && setError(e.message),
      )
    return () => ctrl.abort()
  }, [file])

  const choose = (f: File | null) => {
    setFile(f)
    setFields(null)
    setValues({})
    setError('')
  }
  const set = (name: string, v: string) => setValues({ ...values, [name]: v })

  const run = () =>
    job.run(async (progress, signal) => {
      const bytes = await runPdf('fillForm', { file: await readInput(file!), values, flatten }, progress, signal)
      return { blob: pdfBlob(bytes), name: outName(file!.name, '-filled', 'pdf') }
    })

  return (
    <Room slug="pdf-fill-form" faq={FAQ}>
      <div className="workbench">
        <div className="file-area">
          {file ? (
            <FileRows files={[file]} onChange={() => choose(null)} detail={() => (fields ? `${fields.length} ${fields.length === 1 ? 'field' : 'fields'}` : 'Reading…')} />
          ) : (
            <Dropzone accept=".pdf,application/pdf" what="a PDF form" onFiles={([f]) => choose(f)} />
          )}
          {error && (
            <p className="feedback" role="alert">
              {error}
            </p>
          )}
          {fields && !fields.length && (
            <p className="workspace-note">
              This PDF has no fillable fields. To write on it anyway, use <a href="/pdf-annotate">Annotate PDF</a>.
            </p>
          )}
          {fields && fields.length > 0 && (
            <div className="form-fields">
              {fields.map((f) =>
                f.kind === 'check' ? (
                  <label key={f.name} className="check">
                    <input type="checkbox" checked={!!values[f.name]} onChange={(e) => set(f.name, e.target.checked ? 'yes' : '')} /> {f.name}
                  </label>
                ) : (
                  <Field key={f.name} label={f.name}>
                    {f.kind === 'text' ? (
                      f.multiline ? (
                        <textarea className="input" rows={3} value={values[f.name] ?? ''} onChange={(e) => set(f.name, e.target.value)} />
                      ) : (
                        <input className="input" value={values[f.name] ?? ''} onChange={(e) => set(f.name, e.target.value)} />
                      )
                    ) : (
                      <select className="input" value={values[f.name] ?? ''} onChange={(e) => set(f.name, e.target.value)}>
                        <option value="">—</option>
                        {f.options.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    )}
                  </Field>
                ),
              )}
            </div>
          )}
        </div>
        <div className="options">
          <h3>The finishing touches</h3>
          <label className="check">
            <input type="checkbox" checked={flatten} onChange={(e) => setFlatten(e.target.checked)} /> Lock the answers (flatten the form)
          </label>
          <p>Fill in the fields on the left. Anything you leave empty stays empty.</p>
          <RunPanel job={job} label="Save filled PDF" disabled={!fields?.length} onRun={run} />
        </div>
      </div>
    </Room>
  )
}
