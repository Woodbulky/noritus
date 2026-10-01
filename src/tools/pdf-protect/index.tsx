import { useState } from 'react'
import { Dropzone, Field, FileRows, Room, RunPanel } from '../../components/Tool'
import { useJob } from '../../components/useJob'
import { outName, pdfBlob } from '../../lib/files'
import { readInput, runPdf } from '../../lib/runPdf'

const FAQ: [string, string][] = [
  ['How strong is the protection?', 'The file is encrypted with AES-256, the strongest standard PDF encryption. A long password with words and numbers is what keeps it safe.'],
  ['What if I forget the password?', 'There is no way back in, for you or for us: the password never leaves your device and isn’t stored anywhere. Keep a copy of the original.'],
  ['What do “printing” and “copying” do?', 'They ask PDF readers to allow or block those actions once the file is open. Most readers respect them, but they are a request, not a lock.'],
  ['Is my PDF or password uploaded?', 'No. The encryption happens inside this browser tab. Neither the file nor the password leaves your device.'],
]

export default function PdfProtect() {
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [show, setShow] = useState(false)
  const [allowPrint, setAllowPrint] = useState(true)
  const [allowCopy, setAllowCopy] = useState(true)
  const job = useJob(file, password, allowPrint, allowCopy)
  const mismatch = !show && again !== '' && again !== password

  const run = () =>
    job.run(async (progress, signal) => {
      const bytes = await runPdf('protect', { file: await readInput(file!), password, allowPrint, allowCopy }, progress, signal)
      return { blob: pdfBlob(bytes), name: outName(file!.name, '-protected', 'pdf'), note: 'AES-256' }
    })

  return (
    <Room slug="pdf-protect" faq={FAQ}>
      <div className="workbench">
        <div className="file-area">
          <Dropzone accept=".pdf,application/pdf" what="a PDF" onFiles={([f]) => setFile(f)} />
          <FileRows files={file ? [file] : []} onChange={() => setFile(null)} />
        </div>
        <div className="options">
          <h3>Choose a password</h3>
          <Field label="Password">
            <input className="input" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </Field>
          {!show && (
            <Field label="Type it again">
              <input className="input" type="password" value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password" />
            </Field>
          )}
          <label className="check">
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show password
          </label>
          {mismatch && <p className="feedback">The two passwords don’t match yet.</p>}
          <span className="option-label">Once it’s open, allow</span>
          <label className="check">
            <input type="checkbox" checked={allowPrint} onChange={(e) => setAllowPrint(e.target.checked)} /> Printing
          </label>
          <label className="check">
            <input type="checkbox" checked={allowCopy} onChange={(e) => setAllowCopy(e.target.checked)} /> Copying text
          </label>
          <RunPanel job={job} label="Protect PDF" disabled={!file || !password || (!show && again !== password)} onRun={run} />
        </div>
      </div>
    </Room>
  )
}
