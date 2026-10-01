import { useId, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { CAT_LABEL, TOOLS } from '../tools'
import { download, formatBytes } from '../lib/files'
import Icon from './Icon'
import type { Job, JobResult, Stage } from './useJob'
import { keyOf, useFlip } from './useFlip'

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

function accepts(file: { name: string; type: string }, accept: string) {
  const name = file.name.toLowerCase()
  return accept.split(',').some((raw) => {
    const a = raw.trim().toLowerCase()
    if (a.startsWith('.')) return name.endsWith(a)
    if (a.endsWith('/*')) return file.type.startsWith(a.slice(0, -1))
    return file.type === a
  })
}

type Hover = { total: number; fit: number }

/**
 * What a drag over the zone carries. Browsers hide file names until the drop,
 * so this goes by MIME type; a file with no type might still fit, so it counts.
 */
function hover(e: DragEvent, accept: string, multiple?: boolean): Hover {
  const items = [...e.dataTransfer.items].filter((i) => i.kind === 'file')
  const fit = items.filter((i) => !i.type || accepts({ name: '', type: i.type }, accept)).length
  return { total: items.length, fit: multiple ? fit : Math.min(fit, 1) }
}

/** A drop zone that is also a native file input. While dragging it says what will be added; files not matching `accept` are skipped with a note. */
export function Dropzone({ accept, multiple, what, onFiles }: { accept: string; multiple?: boolean; what: string; onFiles: (files: File[]) => void }) {
  const [over, setOver] = useState<Hover | null>(null)
  const [note, setNote] = useState('')
  const take = (list: FileList | null) => {
    const all = [...(list ?? [])]
    const ok = all.filter((f) => accepts(f, accept)).slice(0, multiple ? undefined : 1)
    setNote(ok.length < all.length ? (multiple ? `Some files were skipped. Please choose ${what}.` : ok.length ? 'Only the first file was used.' : `Please choose one of: ${what}.`) : '')
    if (ok.length) onFiles(ok)
  }

  let head = 'A little drop goes a long way.'
  let sub = `Drag ${multiple ? 'files' : 'a file'} here, or click to browse`
  if (over && !over.fit) [head, sub] = ['That won’t fit here.', `This tool takes ${what}.`]
  else if (over && over.fit < over.total) [head, sub] = multiple ? [`Drop to add ${over.fit} of ${over.total} files.`, 'The others aren’t the right kind and will be skipped.'] : ['Drop to add the first file.', 'This tool takes one at a time.']
  else if (over) [head, sub] = [`Drop to add ${over.fit > 1 ? `${over.fit} files` : 'it'}.`, 'Let go anywhere in this box.']

  return (
    <>
      <label
        className={over ? `drop-zone dragover${over.fit ? '' : ' reject'}` : 'drop-zone'}
        onDragEnter={(e) => setOver(hover(e, accept, multiple))}
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = over?.fit === 0 ? 'none' : 'copy'
        }}
        onDragLeave={(e) => e.currentTarget.contains(e.relatedTarget as Node) || setOver(null)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(null)
          take(e.dataTransfer.files)
        }}
      >
        <span className="upload-icon">
          <Icon name="upload" />
        </span>
        <strong>{head}</strong>
        <p>{sub}</p>
        <p style={{ marginTop: 10 }}>{what} · Kept in this tab</p>
        <input type="file" accept={accept} multiple={multiple} aria-label={`Choose ${what}`} onChange={(e) => (take(e.target.files), (e.target.value = ''))} />
      </label>
      <div className="feedback" role="status">
        {note}
      </div>
    </>
  )
}

/** File list with sizes, remove, and (optionally) move up/down. Moved rows glide to their new place. */
export function FileRows({ files, onChange, reorder, detail }: { files: File[]; onChange: (files: File[]) => void; reorder?: boolean; detail?: (f: File) => string }) {
  const list = useRef<HTMLDivElement>(null)
  useFlip(list)
  const move = (i: number, d: number) => {
    const next = [...files]
    ;[next[i], next[i + d]] = [next[i + d], next[i]]
    onChange(next)
  }
  return (
    <div className="file-list" aria-live="polite" ref={list}>
      {files.length ? (
        files.map((f, i) => (
          <div className="file-row" key={keyOf(f)} data-flip={keyOf(f)}>
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

const STAGES: [Stage, string][] = [
  ['read', 'Reading'],
  ['work', 'Processing'],
  ['save', 'Preparing download'],
]

/** Progress (honest stages, Cancel), errors, the result card, and the primary button, which becomes Download once done. */
export function RunPanel({ job, label, disabled, onRun }: { job: Job; label: string; disabled?: boolean; onRun: () => void }) {
  const [saved, setSaved] = useState<JobResult | null>(null)
  const s = job.state
  const pct = s.kind === 'running' && s.progress !== null ? Math.round(s.progress * 100) : null
  const at = s.kind === 'running' ? STAGES.findIndex(([k]) => k === s.stage) : -1
  return (
    <div className="run">
      {s.kind === 'running' && (
        <>
          <ol className="stages" aria-label="Steps">
            {STAGES.map(([k, text], i) => (
              <li key={k} className={i < at ? 'done' : i === at ? 'now' : undefined} aria-current={i === at ? 'step' : undefined}>
                {text}
              </li>
            ))}
          </ol>
          <div className="run-progress">
            <div className="progress" role="progressbar" aria-label={STAGES[at][1]} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct ?? undefined}>
              <span style={{ width: `${pct ?? 100}%` }} />
            </div>
            <span className="muted">{pct === null ? 'Working…' : `${pct}%`}</span>
            <button className="text-link" onClick={job.cancel}>
              Cancel
            </button>
          </div>
        </>
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
              <b>{formatBytes(s.result.blob.size)}</b>
              {s.result.note ? ` · ${s.result.note}` : ''}. {saved === s.result ? 'Saved to your downloads.' : 'Made on your device, ready to download.'}
            </p>
          </div>
        </div>
      )}
      {s.kind === 'done' ? (
        <button
          className="btn btn-primary"
          data-magnet
          onClick={() => {
            download(s.result.blob, s.result.name)
            setSaved(s.result)
          }}
        >
          {saved === s.result ? 'Download again' : 'Download'} <span className="arrow">↓</span>
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
