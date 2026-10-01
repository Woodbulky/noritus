import { formatBytes } from '../lib/loadTemplate'
import { FILENAME_PATTERNS, type FilenamePattern } from '../../../lib/sanitize'
import { useApp } from '../store/appStore'
import type { RowIssue } from './NamesList'
import { Check } from './icons'

type Props = { issues: RowIssue[]; duplicates: Set<number> }

/** Past this the ZIP is worth warning about; the combined PDF is far smaller. */
const HUGE_ZIP = 400 * 1024 * 1024

/** A row of clickable chips that jump the preview to the offending name. */
function Chips({ label, indices }: { label: (n: number) => string; indices: number[] }) {
  const names = useApp((s) => s.names)
  const setIdx = useApp((s) => s.setIdx)
  const setStep = useApp((s) => s.setStep)
  if (indices.length === 0) return null
  return (
    <div className="chips">
      <span className="hint" style={{ alignSelf: 'center' }}>
        {label(indices.length)}
      </span>
      {indices.slice(0, 6).map((i) => (
        <button
          key={i}
          type="button"
          className="tag warn"
          title="Show this name in the preview"
          onClick={() => {
            setIdx(i)
            setStep(2)
          }}
        >
          {names[i]}
        </button>
      ))}
      {indices.length > 6 && <span className="hint">+{indices.length - 6} more</span>}
    </div>
  )
}

export default function DownloadStep({ issues, duplicates }: Props) {
  const names = useApp((s) => s.names)
  const template = useApp((s) => s.template)
  const progress = useApp((s) => s.progress)
  const generate = useApp((s) => s.generate)
  const cancel = useApp((s) => s.cancel)
  const pattern = useApp((s) => s.pattern)
  const setPattern = useApp((s) => s.setPattern)
  const event = useApp((s) => s.event)
  const setEvent = useApp((s) => s.setEvent)
  const setStep = useApp((s) => s.setStep)
  const stems = useApp((s) => s.stems)
  const qr = useApp((s) => s.qr)
  const downloadVerifyCsv = useApp((s) => s.downloadVerifyCsv)

  const busy = progress !== null
  const missing = issues.flatMap((it, i) => (it.missing.length > 0 ? [i] : []))
  const tight = issues.flatMap((it, i) => (it.atMin ? [i] : []))
  // Each certificate carries its own copy of the artwork.
  const zipEstimate = (template?.fileSize ?? 0) * 1.05 * names.length
  const example = names.length > 0 ? stems()[0] : 'certificate'

  return (
    <section className="view">
      <div>
        <h1>Download certificates</h1>
        <p className="lede">
          {names.length} certificate{names.length === 1 ? '' : 's'} ready to generate.
        </p>
      </div>

      <div className="summary">
        <h4>Before you generate</h4>
        <Chips label={(n) => `${n} duplicate name${n > 1 ? 's' : ''}:`} indices={[...duplicates]} />
        <Chips label={(n) => `${n} at the minimum size:`} indices={tight} />
        <Chips label={(n) => `${n} with missing glyphs:`} indices={missing} />
        {duplicates.size === 0 && tight.length === 0 && missing.length === 0 && (
          <p className="hint" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Check size={14} /> No duplicates, no clipping, every glyph available.
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor="pattern">File names</label>
        <select
          id="pattern"
          className="input"
          value={pattern}
          onChange={(e) => setPattern(e.target.value as FilenamePattern)}
        >
          {FILENAME_PATTERNS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        {(pattern === '{name}_{event}' || qr.on) && (
          <input
            className="input"
            placeholder="Event name"
            aria-label="Event name"
            value={event}
            onChange={(e) => setEvent(e.target.value)}
          />
        )}
        <span className="hint">First file: {example}.pdf</span>
      </div>

      <div className="dl-card">
        <h3>Separate files</h3>
        <p>
          A ZIP with one PDF per person, named after them. About {formatBytes(zipEstimate)} in
          total.
        </p>
        {zipEstimate > HUGE_ZIP && (
          <p className="hint" style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
            <span className="tag warn">Large</span>
            Every PDF carries its own copy of the artwork, so this ZIP is big and slow to build.
            The combined PDF below holds the same {names.length} certificates in a fraction of the
            space.
          </p>
        )}
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={busy || names.length === 0}
          onClick={() => generate('zip', 'Generating PDFs')}
        >
          Download ZIP
        </button>
      </div>

      {qr.on && (
        <div className="dl-card">
          <h3>Verification list</h3>
          <p>
            Every certificate ID against its name and event. The ZIP already contains this file;
            publish it, or keep it to answer &ldquo;is this real?&rdquo; later.
          </p>
          <button
            type="button"
            className="btn btn-ghost btn-block"
            disabled={names.length === 0}
            onClick={downloadVerifyCsv}
          >
            Download verify.csv
          </button>
        </div>
      )}

      <div className="dl-card">
        <h3>One combined PDF</h3>
        <p>Every certificate as a page in a single file. Good for printing.</p>
        <button
          type="button"
          className="btn btn-ghost btn-block"
          disabled={busy || names.length === 0}
          onClick={() => generate('combined', 'Building combined PDF')}
        >
          Download combined PDF
        </button>
      </div>

      {progress && (
        <div className="prog-wrap">
          <div className="row">
            <span style={{ fontSize: 13, fontWeight: 600 }}>{progress.label}</span>
            <span className="val">
              {progress.done} / {progress.total}
            </span>
          </div>
          <div className="progress">
            <i style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: '8px 14px', fontSize: 13 }}
            onClick={cancel}
          >
            Cancel
          </button>
        </div>
      )}

      <div className="panel-foot">
        <button type="button" className="btn btn-ghost" onClick={() => setStep(2)}>
          Back to style
        </button>
      </div>
    </section>
  )
}
