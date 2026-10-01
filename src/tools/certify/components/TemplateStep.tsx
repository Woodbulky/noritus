import Dropzone from './Dropzone'
import { BUILTINS, builtinUrl } from '../lib/builtins'
import { formatBytes } from '../lib/loadTemplate'
import { useApp } from '../store/appStore'
import { useKind } from '../kind'

export default function TemplateStep() {
  const template = useApp((s) => s.template)
  const busy = useApp((s) => s.templateBusy)
  const pickTemplate = useApp((s) => s.pickTemplate)
  const pickBuiltin = useApp((s) => s.pickBuiltin)
  const setStep = useApp((s) => s.setStep)
  const kind = useKind()

  return (
    <section className="view">
      <div>
        <h1>Upload your template</h1>
        <p className="lede">Use your {kind.one} design with the name area left blank.</p>
      </div>

      {template && (
        <div className="file">
          <div
            className="thumb"
            style={{ backgroundImage: `url(${template.thumb})` }}
            role="img"
            aria-label="Template preview"
          />
          <div className="meta">
            <div className="nm" title={template.fileName}>
              {template.fileName}
            </div>
            <div className="sub">
              {template.width} × {template.height} px, {formatBytes(template.fileSize)}
            </div>
          </div>
        </div>
      )}

      <Dropzone
        accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
        label={template ? 'Replace the template' : 'Drop a PNG, JPG or PDF'}
        hint={busy ? 'Reading…' : 'or click to browse'}
        disabled={busy}
        onFile={pickTemplate}
      />

      {!template && (
        <p className="hint">
          The PDF page takes the template&rsquo;s own size — pixels map to points at 72 DPI, so
          nothing is resampled. Up to 25 MB.
        </p>
      )}

      {kind.builtins && (
      <div className="field">
        <span className="lbl">Or start from one of ours</span>
        <div className="tpl-grid">
          {BUILTINS.map((b) => (
            <button
              key={b.id}
              type="button"
              className="tpl"
              disabled={busy}
              title={`${b.name} — ${b.blurb}`}
              onClick={() => pickBuiltin(b.id)}
            >
              <img src={builtinUrl(b.id)} alt="" loading="lazy" />
              <span>
                <b>{b.name}</b>
                {b.blurb}
              </span>
            </button>
          ))}
        </div>
        <span className="hint">
          Each one lands with its name area already positioned, ready to restyle.
        </span>
      </div>
      )}

      <div className="panel-foot">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!template}
          onClick={() => setStep(1)}
        >
          Continue to names
        </button>
      </div>
    </section>
  )
}
