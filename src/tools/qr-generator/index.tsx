import { useMemo, useState } from 'react'
import { encode } from 'uqr'
import { Field, Room, Segmented } from '../../components/Tool'
import { download } from '../../lib/files'
import { svgPath, wifiPayload } from './qr'

const FAQ: [string, string][] = [
  ['Do these QR codes expire?', 'No. The link or text is stored in the code itself, so it works for as long as the link does. Nothing passes through us.'],
  ['PNG or SVG?', 'PNG is ready for documents and chats. SVG stays perfectly sharp at any size, which suits posters and print.'],
  ['What is error correction?', 'Extra data that lets a scuffed or partly covered code still scan. Higher levels make the code denser.'],
  ['Is anything I type sent anywhere?', 'No. The code is drawn inside this browser tab. Your Wi-Fi password never leaves your device.'],
]

type Ecc = 'L' | 'M' | 'Q' | 'H'

export default function QrGenerator() {
  const [kind, setKind] = useState<'text' | 'wifi'>('text')
  const [text, setText] = useState('https://noritus.dpdns.org')
  const [ssid, setSsid] = useState('')
  const [pass, setPass] = useState('')
  const [ecc, setEcc] = useState<Ecc>('M')
  const [fg, setFg] = useState('#183e38')
  const [bg, setBg] = useState('#ffffff')
  const [px, setPx] = useState(1024)

  const payload = kind === 'wifi' ? (ssid ? wifiPayload(ssid, pass) : '') : text
  const qr = useMemo(() => {
    if (!payload) return null
    try {
      return encode(payload, { ecc, border: 2 })
    } catch {
      return 'That’s too much text for one QR code. Try a shorter link or message.'
    }
  }, [payload, ecc])
  const ok = qr && typeof qr === 'object' ? qr : null

  const svg = ok
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ok.size} ${ok.size}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="${bg}"/><path fill="${fg}" d="${svgPath(ok.data)}"/></svg>`
    : ''

  const savePng = () => {
    const c = document.createElement('canvas')
    c.width = c.height = px
    const ctx = c.getContext('2d')!
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, px, px)
    ctx.fillStyle = fg
    const m = px / ok!.size
    ok!.data.forEach((row, y) => row.forEach((on, x) => on && ctx.fillRect(Math.floor(x * m), Math.floor(y * m), Math.ceil(m), Math.ceil(m))))
    c.toBlob((b) => b && download(b, 'qr-code.png'), 'image/png')
  }

  return (
    <Room slug="qr-generator" faq={FAQ}>
      <div className="workbench">
        <div className="file-area">
          <div className="qr-preview" aria-live="polite">
            {ok ? (
              <div role="img" aria-label="QR code preview" dangerouslySetInnerHTML={{ __html: svg }} style={{ width: 'min(100%, 300px)' }} />
            ) : (
              <p className="file-empty">{typeof qr === 'string' ? qr : 'Type something to make a code.'}</p>
            )}
          </div>
        </div>
        <div className="options">
          <h3>The finishing touches</h3>
          <Segmented
            label="Code for"
            value={kind}
            onChange={setKind}
            options={[
              ['text', 'Link or text'],
              ['wifi', 'Wi-Fi'],
            ]}
          />
          {kind === 'text' ? (
            <Field label="Link or text">
              <textarea className="input" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
            </Field>
          ) : (
            <div className="side-by-side">
              <Field label="Network name">
                <input className="input" value={ssid} onChange={(e) => setSsid(e.target.value)} autoComplete="off" />
              </Field>
              <Field label="Password">
                <input className="input" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="off" />
              </Field>
            </div>
          )}
          <div className="side-by-side">
            <Field label="Colour">
              <input className="input" type="color" value={fg} onChange={(e) => setFg(e.target.value)} />
            </Field>
            <Field label="Background">
              <input className="input" type="color" value={bg} onChange={(e) => setBg(e.target.value)} />
            </Field>
          </div>
          <Segmented
            label="Error correction"
            value={ecc}
            onChange={setEcc}
            options={[
              ['L', 'Low'],
              ['M', 'Medium'],
              ['Q', 'High'],
              ['H', 'Highest'],
            ]}
          />
          <Segmented
            label="PNG size"
            value={px}
            onChange={setPx}
            options={[
              [512, '512 px'],
              [1024, '1024 px'],
              [2048, '2048 px'],
            ]}
          />
          <div className="run">
            <button className="btn btn-primary" data-magnet disabled={!ok} onClick={savePng}>
              Download PNG <span className="arrow">↓</span>
            </button>
            <button className="btn btn-outline" disabled={!ok} onClick={() => download(new Blob([svg], { type: 'image/svg+xml' }), 'qr-code.svg')}>
              Download SVG
            </button>
            <p className="stay-note">Made in this tab. Nothing is sent anywhere.</p>
          </div>
        </div>
      </div>
    </Room>
  )
}
