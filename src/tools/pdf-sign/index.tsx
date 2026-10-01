import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { Dropzone, Field, FileRows, Room, RunPanel, Segmented } from '../../components/Tool'
import { useJob } from '../../components/useJob'
import { outName, pdfBlob } from '../../lib/files'
import { openPdf, thumbnail, type PdfDoc } from '../../lib/pdfjs'
import { readInput, runPdf } from '../../lib/runPdf'

const FAQ: [string, string][] = [
  ['Is this a legally binding signature?', 'It places a picture of your signature on the page, like signing a printout. It is not a certificate-based digital signature.'],
  ['Can I sign every page?', 'Yes. Choose “Every page” and the signature goes in the same spot on each page.'],
  ['What makes a good uploaded signature?', 'A photo or scan of your signature on white paper, cropped close. A PNG with a transparent background looks best.'],
  ['Is my signature uploaded?', 'No. Your signature and your PDF stay in this browser tab and are never sent anywhere.'],
]

type Sig = { url: string; bytes: Uint8Array; ratio: number }
type Rect = { l: number; t: number; w: number; h: number }
type Pos = Omit<Rect, 'h'>

const FONTS: [string, string][] = [
  ['Great Vibes', '/fonts/great-vibes.ttf'],
  ['Alex Brush', '/fonts/alex-brush.ttf'],
]

/** Crops a canvas to its non-transparent pixels, or null if it is empty. */
function trim(c: HTMLCanvasElement) {
  const { width: w, height: h } = c
  const px = c.getContext('2d')!.getImageData(0, 0, w, h).data
  let x0 = w,
    y0 = h,
    x1 = -1,
    y1 = -1
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (px[(y * w + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
  if (x1 < 0) return null
  const out = document.createElement('canvas')
  out.width = x1 - x0 + 1
  out.height = y1 - y0 + 1
  out.getContext('2d')!.drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height)
  return out
}

async function toSig(c: HTMLCanvasElement | null): Promise<Sig | null> {
  if (!c) return null
  const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/png'))
  if (!blob) return null
  return { url: c.toDataURL('image/png'), bytes: new Uint8Array(await blob.arrayBuffer()), ratio: c.width / c.height }
}

function DrawPad({ ink, onSig }: { ink: string; onSig: (s: Sig | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const last = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const c = ref.current!
    const dpr = devicePixelRatio || 1
    c.width = c.clientWidth * dpr
    c.height = c.clientHeight * dpr
    c.getContext('2d')!.scale(dpr, dpr)
  }, [])

  const pos = (e: RPointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const line = (to: { x: number; y: number }) => {
    const ctx = ref.current!.getContext('2d')!
    const from = last.current ?? to
    ctx.strokeStyle = ink
    ctx.lineWidth = 2.6
    ctx.lineCap = ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x + 0.01, to.y)
    ctx.stroke()
    last.current = to
  }

  return (
    <div>
      <canvas
        ref={ref}
        className="sig-pad"
        aria-label="Signature drawing area. Draw with a mouse, finger or pen, or use Type or Upload instead."
        role="img"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          last.current = null
          line(pos(e))
        }}
        onPointerMove={(e) => last.current && line(pos(e))}
        onPointerUp={() => {
          last.current = null
          void toSig(trim(ref.current!)).then(onSig)
        }}
      />
      <button
        className="text-link"
        style={{ marginTop: 8, fontSize: 11 }}
        onClick={() => {
          const c = ref.current!
          c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
          onSig(null)
        }}
      >
        Clear
      </button>
    </div>
  )
}

async function typedSig(text: string, font: string, ink: string) {
  const [family, url] = FONTS.find(([f]) => f === font)!
  if (![...document.fonts].some((f) => f.family === family)) document.fonts.add(await new FontFace(family, `url(${url})`).load())
  const c = document.createElement('canvas')
  const ctx = c.getContext('2d')!
  const css = `96px "${family}"`
  ctx.font = css
  c.width = Math.ceil(ctx.measureText(text).width) + 60
  c.height = 180
  ctx.font = css
  ctx.fillStyle = ink
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 30, 90)
  return toSig(trim(c))
}

async function uploadedSig(file: File) {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, 1200 / bmp.width)
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * scale)
  c.height = Math.round(bmp.height * scale)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  return toSig(c)
}

export default function PdfSign() {
  const [file, setFile] = useState<File | null>(null)
  const [doc, setDoc] = useState<PdfDoc | null>(null)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [preview, setPreview] = useState<{ url: string; aspect: number } | null>(null)
  const [mode, setMode] = useState<'draw' | 'type' | 'upload'>('draw')
  const [ink, setInk] = useState('#1b2a5c')
  const [typed, setTyped] = useState('')
  const [font, setFont] = useState(FONTS[0][0])
  const [sig, setSig] = useState<Sig | null>(null)
  const [pos, setPos] = useState<Pos>({ l: 0.58, t: 0.8, w: 0.3 })
  const [scope, setScope] = useState<'this' | 'all'>('this')
  const stage = useRef<HTMLDivElement>(null)
  const job = useJob(file, sig, pos, scope, page)

  const choose = (f: File | null) => {
    setFile(f)
    setDoc(null)
    setError('')
    setPage(1)
    setPreview(null)
  }

  useEffect(() => {
    if (!file) return
    let live = true
    const task = openPdf(file)
    task.then(
      (d) => (live ? setDoc(d) : void d.loadingTask.destroy()),
      (e: Error) => live && setError(e.message),
    )
    return () => {
      live = false
      void task.then((d) => d.loadingTask.destroy(), () => {})
    }
  }, [file])

  useEffect(() => {
    if (!doc) return
    let live = true
    thumbnail(doc, page, 900).then((url) => {
      const img = new Image()
      img.onload = () => live && setPreview({ url, aspect: img.width / img.height })
      img.src = url
    })
    return () => {
      live = false
    }
  }, [doc, page])

  useEffect(() => {
    if (mode !== 'type') return
    let live = true
    const id = setTimeout(() => (typed.trim() ? typedSig(typed.trim(), font, ink) : Promise.resolve(null)).then((s) => live && setSig(s)), 200)
    return () => {
      live = false
      clearTimeout(id)
    }
  }, [mode, typed, font, ink])

  // The box keeps the signature's shape: height follows width, and it stays on the page.
  const fit = (p: Pos): Rect => {
    const w = Math.min(Math.max(p.w, 0.04), 1)
    const h = Math.min(sig && preview ? (w * preview.aspect) / sig.ratio : 0.08, 1)
    return { w, h, l: Math.min(Math.max(p.l, 0), 1 - w), t: Math.min(Math.max(p.t, 0), 1 - h) }
  }
  const rect = fit(pos)

  const drag = (e: RPointerEvent, resize: boolean) => {
    e.preventDefault()
    e.stopPropagation()
    const box = stage.current!.getBoundingClientRect()
    const from = { x: e.clientX, y: e.clientY, r: rect }
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - from.x) / box.width
      const dy = (ev.clientY - from.y) / box.height
      setPos(fit(resize ? { ...from.r, w: from.r.w + dx } : { ...from.r, l: from.r.l + dx, t: from.r.t + dy }))
    }
    const up = () => {
      removeEventListener('pointermove', move)
      removeEventListener('pointerup', up)
    }
    addEventListener('pointermove', move)
    addEventListener('pointerup', up)
  }

  const nudge = (e: React.KeyboardEvent) => {
    const d = e.shiftKey ? 0.05 : 0.01
    const k: Record<string, [number, number]> = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }
    if (!k[e.key]) return
    e.preventDefault()
    setPos(fit({ ...rect, l: rect.l + k[e.key][0], t: rect.t + k[e.key][1] }))
  }

  const run = () =>
    job.run(async (progress, signal) => {
      const pages = scope === 'this' ? [page - 1] : Array.from({ length: doc!.numPages }, (_, i) => i)
      const bytes = await runPdf('sign', { file: await readInput(file!), signature: { name: 'signature.png', bytes: sig!.bytes.slice() }, pages, rect }, progress, signal)
      return { blob: pdfBlob(bytes), name: outName(file!.name, '-signed', 'pdf') }
    })

  return (
    <Room slug="pdf-sign" faq={FAQ}>
      <div className="workbench">
        <div className="file-area">
          {file ? (
            <FileRows files={[file]} onChange={() => choose(null)} detail={() => (doc ? `${doc.numPages} pages` : 'Opening…')} />
          ) : (
            <Dropzone accept=".pdf,application/pdf" what="a PDF" onFiles={([f]) => choose(f)} />
          )}
          {error && (
            <p className="feedback" role="alert">
              {error}
            </p>
          )}
          {doc && preview && (
            <>
              <div className="sign-stage" ref={stage}>
                <img src={preview.url} alt={`Page ${page} of ${file?.name}`} draggable={false} />
                {sig && (
                  <div
                    className="sign-box"
                    role="group"
                    tabIndex={0}
                    aria-label="Signature position. Drag, or use the arrow keys to move it."
                    onKeyDown={nudge}
                    onPointerDown={(e) => drag(e, false)}
                    style={{ left: `${rect.l * 100}%`, top: `${rect.t * 100}%`, width: `${rect.w * 100}%`, height: `${rect.h * 100}%` }}
                  >
                    <img src={sig.url} alt="" draggable={false} />
                    <span className="sign-handle" aria-hidden="true" onPointerDown={(e) => drag(e, true)} />
                  </div>
                )}
              </div>
              <div className="pager-row">
                <button className="btn btn-outline" style={{ minHeight: 36, padding: '6px 14px' }} disabled={page === 1} onClick={() => setPage(page - 1)}>
                  ← Previous
                </button>
                <span className="muted">
                  Page {page} of {doc.numPages}
                </span>
                <button className="btn btn-outline" style={{ minHeight: 36, padding: '6px 14px' }} disabled={page === doc.numPages} onClick={() => setPage(page + 1)}>
                  Next →
                </button>
              </div>
            </>
          )}
        </div>
        <div className="options">
          <h3>Your signature</h3>
          <Segmented
            label="Make it"
            value={mode}
            onChange={(m) => {
              setMode(m)
              setSig(null)
            }}
            options={[
              ['draw', 'Draw'],
              ['type', 'Type'],
              ['upload', 'Upload'],
            ]}
          />
          {mode === 'draw' && <DrawPad ink={ink} onSig={setSig} />}
          {mode === 'type' && (
            <>
              <Field label="Your name">
                <input className="input" value={typed} onChange={(e) => setTyped(e.target.value)} maxLength={60} />
              </Field>
              <Segmented label="Style" value={font} onChange={setFont} options={FONTS.map(([f]) => [f, f])} />
            </>
          )}
          {mode === 'upload' && (
            <Field label="Signature image (PNG or JPG)">
              <input
                className="input"
                type="file"
                accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) uploadedSig(f).then(setSig, () => setSig(null))
                }}
              />
            </Field>
          )}
          {mode !== 'upload' && (
            <Segmented
              label="Ink"
              value={ink}
              onChange={setInk}
              options={[
                ['#1b2a5c', 'Blue'],
                ['#111111', 'Black'],
              ]}
            />
          )}
          <Segmented
            label="Sign"
            value={scope}
            onChange={setScope}
            options={[
              ['this', 'This page'],
              ['all', 'Every page'],
            ]}
          />
          <p>{sig ? 'Drag the signature into place. Pull the corner to resize it.' : 'Make your signature, then place it on the page.'}</p>
          <RunPanel job={job} label="Sign PDF" disabled={!doc || !sig} onRun={run} />
        </div>
      </div>
    </Room>
  )
}
