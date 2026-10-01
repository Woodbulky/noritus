import { useState } from 'react'
import { Dropzone, Field, FileRows, Room, RunPanel } from '../../components/Tool'
import { useJob } from '../../components/useJob'
import { outName, pdfBlob } from '../../lib/files'
import { readInput, runPdf } from '../../lib/runPdf'

const FAQ: [string, string][] = [
  ['Can this crack a password I don’t know?', 'No. You need the password that opens the file. This tool removes it so you don’t have to type it every time.'],
  ['What about PDFs that open but won’t print or copy?', 'Leave the password empty and press Unlock. If the file opens without one, the printing and copying limits are removed.'],
  ['Does unlocking change the content?', 'No. Pages, text and images stay exactly the same; only the encryption is taken off.'],
  ['Is my PDF or password uploaded?', 'No. The file is unlocked inside this browser tab. Neither the file nor the password leaves your device.'],
]

export default function PdfUnlock() {
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const job = useJob(file, password)

  const run = () =>
    job.run(async (progress, signal) => {
      const bytes = await runPdf('unlock', { file: await readInput(file!), password }, progress, signal)
      return { blob: pdfBlob(bytes), name: outName(file!.name, '-unlocked', 'pdf') }
    })

  return (
    <Room slug="pdf-unlock" faq={FAQ}>
      <div className="workbench">
        <div className="file-area">
          <Dropzone accept=".pdf,application/pdf" what="a PDF" onFiles={([f]) => setFile(f)} />
          <FileRows files={file ? [file] : []} onChange={() => setFile(null)} />
        </div>
        <div className="options">
          <h3>The password</h3>
          <Field label="Password that opens it" hint="Leave empty if it opens without one but blocks printing or copying.">
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" onKeyDown={(e) => e.key === 'Enter' && file && job.state.kind !== 'running' && run()} />
          </Field>
          <RunPanel job={job} label="Unlock PDF" disabled={!file} onRun={run} />
        </div>
      </div>
    </Room>
  )
}
