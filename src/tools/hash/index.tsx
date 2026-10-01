import { useState } from 'react'
import { CopyButton, Dropzone, Field, FileRows, Room, RunPanel, Segmented } from '../../components/Tool'
import { useJob } from '../../components/useJob'
import { outName } from '../../lib/files'
import { runWorker } from '../../lib/runWorker'
import type { Algo } from './hash.worker'

const FAQ: [string, string][] = [
  ['What is a hash for?', 'It is a fingerprint of a file. If the hash you get matches the one a download page lists, your copy is complete and unchanged.'],
  ['Which one should I use?', 'Use whichever the website lists, most often SHA-256. MD5 and SHA-1 are fine for spotting damaged downloads but not for security.'],
  ['How do I compare?', 'Paste the expected hash into “Compare with”. It is checked against every result, ignoring capital letters and spaces.'],
  ['Is my file uploaded?', 'No. The fingerprint is calculated inside this browser tab and the file never leaves your device.'],
]

const ALGOS: Algo[] = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512']

export default function Hash() {
  const [mode, setMode] = useState<'file' | 'text'>('file')
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('')
  const [hashes, setHashes] = useState<Partial<Record<Algo, string>> | null>(null)
  const [expect, setExpect] = useState('')
  const source = mode === 'file' ? file : text
  const job = useJob(source)
  const want = expect.replace(/\s/g, '').toLowerCase()
  const shown = job.state.kind === 'done' ? hashes : null

  const run = () =>
    job.run(async (progress, signal) => {
      const blob = mode === 'file' ? file! : new Blob([text])
      progress(null)
      const out = await runWorker<Partial<Record<Algo, string>>>(new Worker(new URL('./hash.worker.ts', import.meta.url), { type: 'module' }), { blob, algos: ALGOS }, [], signal)
      setHashes(out)
      const report = ALGOS.map((a) => `${a}  ${out[a]}`).join('\n') + '\n'
      return { blob: new Blob([report], { type: 'text/plain' }), name: outName(mode === 'file' ? file!.name : 'text', '-hashes', 'txt'), note: '5 fingerprints' }
    })

  return (
    <Room slug="hash" faq={FAQ}>
      <div className="workbench">
        <div className="file-area">
          <Segmented
            label="Fingerprint"
            value={mode}
            onChange={setMode}
            options={[
              ['file', 'A file'],
              ['text', 'Some text'],
            ]}
          />
          {mode === 'file' ? (
            <>
              <Dropzone accept="*/*" what="any file" onFiles={([f]) => setFile(f)} />
              <FileRows files={file ? [file] : []} onChange={() => setFile(null)} />
            </>
          ) : (
            <Field label="Text (hashed as UTF-8)">
              <textarea className="input mono" rows={6} value={text} onChange={(e) => setText(e.target.value)} />
            </Field>
          )}
          {shown && (
            <div className="kv">
              {ALGOS.map((a) => (
                <div key={a} style={{ display: 'contents' }}>
                  <b>{a}</b>
                  <code>
                    {shown[a]} {want && (shown[a] === want ? <span className="ok">✓ matches</span> : null)}
                  </code>
                  <CopyButton text={shown[a] ?? ''} />
                </div>
              ))}
            </div>
          )}
          {shown && want && !ALGOS.some((a) => shown[a] === want) && (
            <p className="feedback" role="alert">
              No match. The file may be incomplete or changed, or the expected hash is for a different file.
            </p>
          )}
        </div>
        <div className="options">
          <h3>The finishing touches</h3>
          <Field label="Compare with (optional)">
            <input className="input mono" value={expect} onChange={(e) => setExpect(e.target.value)} placeholder="Paste the expected hash" spellCheck={false} />
          </Field>
          <p>MD5, SHA-1, SHA-256, SHA-384 and SHA-512, all at once.</p>
          <RunPanel job={job} label="Calculate" disabled={mode === 'file' ? !file : !text} onRun={run} />
        </div>
      </div>
    </Room>
  )
}
