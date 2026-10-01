import { useId, useState, type ReactNode } from 'react'
import { CAT_LABEL, TOOLS } from '../tools'
import { download, formatBytes } from '../lib/files'
import Icon from './Icon'
import type { Job } from './useJob'

/** The tool page contract: heading, the workbench, then a few FAQ lines. */
export function Room({ slug, faq, children }: { slug: string; faq: [string, string][]; children: ReactNode }) {
  const tool = TOOLS.find((t) => t.slug === slug)!
  return (
    <div className="container room">
      <a className="back-button" href="/#tools">
        ← Back to the toolbox
      </a>
      <div className="room-head">
        <div>
          <div className="eyebrow">{CAT_LABEL[tool.category]} / On your device</div>
          <h1>{tool.name}.</h1>
          <p>{tool.blurb}</p>
        </div>
        <span className="pill">
          <Icon name="lock" /> Stays on your device
        </span>
      </div>
      {children}
      <section className="faq-layout tool-faq" aria-label="Questions">
        <div>
          <div className="eyebrow">A few good questions</div>
          <h2>Glad you asked.</h2>
        </div>
        <div className="faq">
          {faq.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}

function accepts(file: File, accept: string) {
  const name = file.name.toLowerCase()
  return accept.split(',').some((raw) => {
    const a = raw.trim().toLowerCase()
    if (a.startsWith('.')) return name.endsWith(a)
    if (a.endsWith('/*')) return file.type.startsWith(a.slice(0, -1))
    return file.type === a
  })
}

/** A drop zone that is also a native file input. Files not matching `accept` are skipped with a note. */
export function Dropzone({ accept, multiple, what, onFiles }: { accept: string; multiple?: boolean; what: string; onFiles: (files: File[]) => void }) {
  const [over, setOver] = useState(false)
  const [note, setNote] = useState('')
  const take = (list: FileList | null) => {
    const all = [...(list ?? [])]
    const ok = all.filter((f) => accepts(f, accept)).slice(0, multiple ? undefined : 1)
    setNote(ok.length < all.length ? (multiple ? `Some files were skipped. Please choose ${what}.` : `Please choose one of: ${what}.`) : '')
    if (ok.length) onFiles(ok)
  }
  return (
    <>
      <label
        className={over ? 'drop-zone dragover' : 'drop-zone'}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          take(e.dataTransfer.files)
        }}
      >
        <span className="upload-icon">
          <Icon name="upload" />
        </span>
        <strong>A little drop goes a long way.</strong>
        <p>Drag {multiple ? 'files' : 'a file'} here, or click to browse</p>
        <p style={{ marginTop: 10 }}>{what} · Kept in this tab</p>
        <input type="file" accept={accept} multiple={multiple} aria-label={`Choose ${what}`} onChange={(e) => (take(e.target.files), (e.target.value = ''))} />
      </label>
      <div className="feedback" role="status">
        {note}
      </div>
    </>
  )
}

/** File list with sizes, remove, and (optionally) move up/down. */
export function FileRows({ files, onChange, reorder, detail }: { files: File[]; onChange: (files: File[]) => void; reorder?: boolean; detail?: (f: File) => string }) {
  const move = (i: number, d: number) => {
    const next = [...files]
    ;[next[i], next[i + d]] = [next[i + d], next[i]]
    onChange(next)
  }
  return (
    <div className="file-list" aria-live="polite">
      {files.length ? (
        files.map((f, i) => (
          <div className="file-row" key={`${f.name}:${f.size}:${f.lastModified}:${i}`}>
            <Icon name="file" />
            <div className="file-info">
              <strong>{f.name}</strong>
              <span>
                {formatBytes(f.size)}
                {detail ? ` · ${detail(f)}` : ''}
              </span>
            </div>
            {reorder && (
              <>
                <button className="row-btn" aria-label={`Move ${f.name} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                  ↑
                </button>
                <button className="row-btn" aria-label={`Move ${f.name} down`} disabled={i === files.length - 1} onClick={() => move(i, 1)}>
                  ↓
                </button>
              </>
            )}
            <button className="remove-file" aria-label={`Remove ${f.name}`} onClick={() => onChange(files.filter((_, j) => j !== i))}>
              ×
            </button>
          </div>
        ))
      ) : (
        <div className="file-empty">A clean slate. Add a file to get started.</div>
      )}
    </div>
  )
}

export function Segmented<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  const id = useId()
  return (
    <div>
      <span className="option-label" id={id}>
        {label}
      </span>
      <div className="segmented" role="group" aria-labelledby={id}>
        {options.map(([v, text]) => (
          <button key={String(v)} aria-pressed={v === value} onClick={() => onChange(v)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

/** A labelled control: `<Field label="Text"><input …/></Field>`. */
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span className="option-label">{label}</span>
      {children}
      {hint && <small className="muted">{hint}</small>}
    </label>
  )
}

/** Progress (with Cancel), errors, the result card, and the primary button, which becomes Download once done. */
export function RunPanel({ job, label, disabled, onRun }: { job: Job; label: string; disabled?: boolean; onRun: () => void }) {
  const s = job.state
  const pct = s.kind === 'running' && s.progress !== null ? Math.round(s.progress * 100) : null
  return (
    <div className="run">
      {s.kind === 'running' && (
        <div className="run-progress">
          <div className="progress" role="progressbar" aria-label="Working" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct ?? undefined}>
            <span style={{ width: `${pct ?? 100}%` }} />
          </div>
          <span className="muted">{pct === null ? 'Working…' : `${pct}%`}</span>
          <button className="text-link" onClick={job.cancel}>
            Cancel
          </button>
        </div>
      )}
      {s.kind === 'error' && (
        <p className="feedback" role="alert">
          {s.message}
        </p>
      )}
      {s.kind === 'done' && (
        <div className="result" role="status">
          <span className="tick">
            <svg viewBox="0 0 24 24">
              <path pathLength={100} d="m5 12 4 4L19 7" />
            </svg>
          </span>
          <div style={{ minWidth: 0 }}>
            <b className="result-name">{s.result.name}</b>
            <p>
              {formatBytes(s.result.blob.size)}
              {s.result.note ? ` · ${s.result.note}` : ''}. Made on your device.
            </p>
          </div>
        </div>
      )}
      {s.kind === 'done' ? (
        <button className="btn btn-primary" data-magnet onClick={() => download(s.result.blob, s.result.name)}>
          Download <span className="arrow">↓</span>
        </button>
      ) : (
        <button className="btn btn-primary" data-magnet disabled={disabled || s.kind === 'running'} onClick={onRun}>
          {label} <span className="arrow">↗</span>
        </button>
      )}
      <p className="stay-note">Your files stay with you.</p>
    </div>
  )
}
