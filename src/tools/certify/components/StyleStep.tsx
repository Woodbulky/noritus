import ColorPicker from './ColorPicker'
import FontPicker from './FontPicker'
import PresetMenu from './PresetMenu'
import { Redo, Undo } from './icons'
import { MIN_FIT_RATIO, type Align, type TextCase, type TextStyle } from '../lib/layoutName'
import { CORNERS } from '../lib/verify'
import { useApp, type Field } from '../store/appStore'

const CASES: { v: TextCase; label: string }[] = [
  { v: 'none', label: 'As typed' },
  { v: 'upper', label: 'UPPERCASE' },
  { v: 'title', label: 'Title Case' },
]

const ALIGNS: { v: Align; label: string }[] = [
  { v: 'left', label: 'Left' },
  { v: 'center', label: 'Center' },
  { v: 'right', label: 'Right' },
]

/** Size, spacing, case, align and colour for one field. */
function FieldControls({ field, style }: { field: Field; style: TextStyle }) {
  const patch = useApp((s) => s.patch)
  const snapshot = useApp((s) => s.snapshot)
  const id = (name: string) => `${field}-${name}`

  return (
    <>
      <div className="field">
        <span className="lbl">Font</span>
        <FontPicker field={field} value={style.fontId} />
      </div>

      <div className="field">
        <div className="row">
          <label htmlFor={id('size')}>Size</label>
          <span className="val">{Math.round(style.size)} pt</span>
        </div>
        <input
          id={id('size')}
          type="range"
          min={12}
          max={200}
          value={style.size}
          // One undo step per drag, not one per pixel of travel.
          onPointerDown={snapshot}
          onKeyDown={(e) => e.key.startsWith('Arrow') && snapshot()}
          onChange={(e) => patch(field, { size: +e.target.value }, false)}
        />
      </div>

      <div className="field">
        <div className="row">
          <label htmlFor={id('spacing')}>Letter spacing</label>
          <span className="val">{style.spacing}</span>
        </div>
        <input
          id={id('spacing')}
          type="range"
          min={0}
          max={20}
          value={style.spacing}
          onPointerDown={snapshot}
          onKeyDown={(e) => e.key.startsWith('Arrow') && snapshot()}
          onChange={(e) => patch(field, { spacing: +e.target.value }, false)}
        />
      </div>

      <div className="field">
        <span className="lbl">Case</span>
        <div className="seg">
          {CASES.map((c) => (
            <button
              key={c.v}
              type="button"
              aria-pressed={style.kase === c.v}
              onClick={() => patch(field, { kase: c.v })}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="lbl">Alignment</span>
        <div className="seg">
          {ALIGNS.map((a) => (
            <button
              key={a.v}
              type="button"
              aria-pressed={style.align === a.v}
              onClick={() => patch(field, { align: a.v })}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="lbl">Color</span>
        <ColorPicker field={field} value={style.color} />
      </div>

      <div className="toggle">
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>Shrink long names to fit</div>
          <div className="hint">Never below {Math.round(MIN_FIT_RATIO * 100)}% of the chosen size</div>
        </div>
        <button
          type="button"
          className="switch"
          role="switch"
          aria-checked={style.fit}
          aria-label="Shrink long names to fit"
          onClick={() => patch(field, { fit: !style.fit })}
        />
      </div>
    </>
  )
}

export default function StyleStep() {
  const style = useApp((s) => s.style)
  const second = useApp((s) => s.second)
  const secondOn = useApp((s) => s.secondOn)
  const toggleSecond = useApp((s) => s.toggleSecond)
  const resetLayout = useApp((s) => s.resetLayout)
  const setStep = useApp((s) => s.setStep)
  const undo = useApp((s) => s.undo)
  const redo = useApp((s) => s.redo)
  const canUndo = useApp((s) => s.history.past.length > 0)
  const canRedo = useApp((s) => s.history.future.length > 0)
  const setFont = useApp((s) => s.setFont)

  return (
    <section className="view">
      <div>
        <h1>Style the name</h1>
        <p className="lede">
          Drag the green box on the certificate to place the name. Pull a corner to resize.
        </p>
      </div>

      <div className="row">
        <PresetMenu />
        <span style={{ display: 'flex', gap: 2 }}>
          <button
            type="button"
            className="icon-btn"
            aria-label="Undo"
            title="Undo (Ctrl+Z)"
            disabled={!canUndo}
            onClick={undo}
          >
            <Undo />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Redo"
            title="Redo (Ctrl+Shift+Z)"
            disabled={!canRedo}
            onClick={redo}
          >
            <Redo />
          </button>
        </span>
      </div>

      <FieldControls field="name" style={style} />

      <div className="toggle">
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>Second line from column B</div>
          <div className="hint">A rank or team name, with its own box and style</div>
        </div>
        <button
          type="button"
          className="switch"
          role="switch"
          aria-checked={secondOn}
          aria-label="Second line from column B"
          onClick={() => {
            toggleSecond()
            if (!secondOn) void setFont('second', second.fontId)
          }}
        />
      </div>

      {secondOn && (
        <details open>
          <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            Second line style
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22, paddingTop: 16 }}>
            <FieldControls field="second" style={second} />
          </div>
        </details>
      )}

      <QrControls />

      <div className="panel-foot">
        <button type="button" className="btn btn-ghost" onClick={resetLayout}>
          Reset layout
        </button>
        <button type="button" className="btn btn-primary" onClick={() => setStep(3)}>
          Continue to download
        </button>
      </div>
    </section>
  )
}

/**
 * Verification QR. Corner and size rather than a draggable box: a code is
 * square, wants a margin, and belongs out of the way of the artwork.
 */
function QrControls() {
  const qr = useApp((s) => s.qr)
  const patchQr = useApp((s) => s.patchQr)
  const verifyLink = useApp((s) => s.verifyLink)
  const setVerifyLink = useApp((s) => s.setVerifyLink)
  const event = useApp((s) => s.event)
  const setEvent = useApp((s) => s.setEvent)

  return (
    <>
      <div className="toggle">
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>Verification QR</div>
          <div className="hint">A unique ID per certificate, plus a verify.csv to check it</div>
        </div>
        <button
          type="button"
          className="switch"
          role="switch"
          aria-checked={qr.on}
          aria-label="Verification QR"
          onClick={() => patchQr({ on: !qr.on })}
        />
      </div>

      {qr.on && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div className="field">
            <label htmlFor="qr-event">Event name</label>
            <input
              id="qr-event"
              className="input"
              placeholder="Design for Tomorrow 2026"
              value={event}
              onChange={(e) => setEvent(e.target.value)}
            />
            <span className="hint">
              IDs are derived from the name and the event, so re-running a batch reissues exactly
              the same codes.
            </span>
          </div>

          <div className="field">
            <label htmlFor="qr-link">Verify link</label>
            <input
              id="qr-link"
              className="input"
              placeholder="https://yourclub.org/verify?id={id}"
              spellCheck={false}
              value={verifyLink}
              onChange={(e) => setVerifyLink(e.target.value)}
            />
            <span className="hint">
              {verifyLink.trim()
                ? '{id} is replaced per certificate; without it the ID is appended.'
                : 'Optional. Left blank, the QR carries the bare ID for checking against verify.csv.'}
            </span>
          </div>

          <div className="field">
            <span className="lbl">Corner</span>
            <div className="seg" role="group" aria-label="QR corner">
              {CORNERS.map((c) => (
                <button
                  key={c.v}
                  type="button"
                  aria-label={c.v}
                  aria-pressed={qr.corner === c.v}
                  onClick={() => patchQr({ corner: c.v })}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <div className="row">
              <label htmlFor="qr-size">QR size</label>
              <span className="val">{Math.round(qr.size * 100)}% of width</span>
            </div>
            <input
              id="qr-size"
              type="range"
              min={6}
              max={20}
              value={Math.round(qr.size * 100)}
              onChange={(e) => patchQr({ size: +e.target.value / 100 })}
            />
          </div>

          <div className="field">
            <span className="lbl">Colours</span>
            <div className="swatches">
              <label className="hint" htmlFor="qr-dark">
                Code
              </label>
              <input
                id="qr-dark"
                className="hex"
                spellCheck={false}
                value={qr.dark}
                onChange={(e) => patchQr({ dark: e.target.value })}
              />
              <label className="hint" htmlFor="qr-light">
                Plate
              </label>
              <input
                id="qr-light"
                className="hex"
                spellCheck={false}
                value={qr.light}
                onChange={(e) => patchQr({ light: e.target.value })}
              />
            </div>
            <span className="hint">
              The plate sits behind the code so it stays scannable on dark artwork. Match it to the
              template&rsquo;s background.
            </span>
          </div>
        </div>
      )}
    </>
  )
}
