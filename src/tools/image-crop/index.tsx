import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as RPointerEvent } from 'react'
import { Dropzone, FileRows, Room, RunPanel, Segmented } from '../../components/Tool'
import { useJob } from '../../components/useJob'
import { outName } from '../../lib/files'
import { EXT, IMAGE_ACCEPT, keepType } from '../../lib/image'
import { runImage, source } from '../../lib/runImage'
import { centred, drag, pixels, type Box, type Handle } from './crop'

const FAQ: [string, string][] = [
  ['How do I crop?', 'Drag the box to move it and its corners to resize it. With the keyboard, arrows move the box and Alt with arrows resizes it; hold Shift for bigger steps.'],
  ['Does cropping lower the quality?', 'The kept area stays at full resolution. JPG and WebP are saved at high quality; PNG is lossless.'],
  ['Can I crop iPhone HEIC photos?', 'Yes. They open right here in the tab and are saved as JPG.'],
  ['Is my image uploaded?', 'No. The crop happens inside this browser tab and your image never leaves your device.'],
]

type Picture = { url: string; blob: Blob; w: number; h: number }

const RATIOS: [number, string][] = [
  [0, 'Free'],
  [1, '1:1'],
  [4 / 3, '4:3'],
  [3 / 2, '3:2'],
  [16 / 9, '16:9'],
]

export default function ImageCrop() {
  const [file, setFile] = useState<File | null>(null)
  const [pic, setPic] = useState<Picture | null>(null)
  const [error, setError] = useState('')
  const [ratio, setRatio] = useState(0)
  const [portrait, setPortrait] = useState(false)
  const [box, setBox] = useState<Box | null>(null)
  const [moving, setMoving] = useState(false)
  const stage = useRef<HTMLDivElement>(null)
  const job = useJob(file, box)
  const r = ratio && (portrait ? 1 / ratio : ratio)

  // Open the image for the preview. HEIC and SVG are turned into something an <img> can show.
  useEffect(() => {
    if (!file) return
    let live = true
    let url = ''
    ;(async () => {
      const s = await source(file)
      const blob = s.heic ? (await runImage({ ...s, type: 'image/png' })).blob : s.file
      url = URL.createObjectURL(blob)
      const img = new Image()
      img.src = url
      await img.decode()
      if (!live) return URL.revokeObjectURL(url)
      setPic({ url, blob, w: img.naturalWidth, h: img.naturalHeight })
      setBox(centred(img.naturalWidth, img.naturalHeight, null))
    })().catch((e) => live && setError(e instanceof Error && e.message.startsWith('“') ? e.message : `“${file.name}” couldn’t be opened. It may be damaged, or in a format this browser can’t read.`))
    return () => {
      live = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [file])

  const choose = (f: File | null) => {
    setFile(f)
    setPic(null)
    setBox(null)
    setError('')
  }
  const shape = (nextRatio: number, nextPortrait: boolean) => {
    setRatio(nextRatio)
    setPortrait(nextPortrait)
    if (pic) setBox(centred(pic.w, pic.h, nextRatio && (nextPortrait ? 1 / nextRatio : nextRatio)))
  }

  /** Image pixels per screen pixel. */
  const scale = () => pic!.w / stage.current!.getBoundingClientRect().width

  const start = (handle: Handle) => (e: RPointerEvent) => {
    if (e.button !== 0 || !box || !pic) return
    e.preventDefault()
    e.stopPropagation()
    const k = scale()
    const [x0, y0, b0] = [e.clientX, e.clientY, box]
    setMoving(true)
    const move = (ev: PointerEvent) => setBox(drag(b0, handle, (ev.clientX - x0) * k, (ev.clientY - y0) * k, pic.w, pic.h, r || null))
    const up = () => {
      removeEventListener('pointermove', move)
      removeEventListener('pointerup', up)
      removeEventListener('pointercancel', up)
      setMoving(false)
    }
    addEventListener('pointermove', move)
    addEventListener('pointerup', up)
    addEventListener('pointercancel', up)
  }

  /** Arrows move by one screen pixel (Shift: ten); Alt+arrows resize from the bottom-right corner. */
  const key = (e: KeyboardEvent) => {
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]
    if (!d || !box || !pic) return
    e.preventDefault()
    const k = scale() * (e.shiftKey ? 10 : 1)
    setBox(drag(box, e.altKey ? 'se' : 'move', d[0] * k, d[1] * k, pic.w, pic.h, r || null))
  }

  const run = () =>
    job.run(async (progress, signal) => {
      const type = keepType(file!)
      progress(null)
      const out = await runImage({ file: pic!.blob, name: file!.name, crop: pixels(box!, pic!.w, pic!.h), type, quality: 0.92 }, signal)
      return { blob: out.blob, name: outName(file!.name, '-cropped', EXT[type]), note: `${out.width} × ${out.height}` }
    })

  const px = box && pic && pixels(box, pic.w, pic.h)
  const pct = (v: number, of: number) => `${(v / of) * 100}%`
  return (
    <Room slug="image-crop" faq={FAQ}>
      <div className="workbench">
        <div className="file-area">
          {file ? <FileRows files={[file]} onChange={() => choose(null)} detail={() => (pic ? `${pic.w} × ${pic.h}` : 'Opening…')} /> : <Dropzone accept={IMAGE_ACCEPT} what="an image (JPG, PNG, WebP, HEIC)" onFiles={([f]) => choose(f)} />}
          {error && (
            <p className="feedback" role="alert">
              {error}
            </p>
          )}
          {pic && box && (
            <div className={moving ? 'crop-stage moving' : 'crop-stage'} ref={stage}>
              <img src={pic.url} alt={`Preview of ${file!.name}`} draggable={false} />
              <div
                className="crop-box"
                style={{ left: pct(box.x, pic.w), top: pct(box.y, pic.h), width: pct(box.w, pic.w), height: pct(box.h, pic.h) }}
                tabIndex={0}
                role="application"
                aria-label="Crop area. Drag to move, arrow keys nudge, Shift for bigger steps, Alt with arrows to resize."
                onPointerDown={start('move')}
                onKeyDown={key}
              >
                {(['nw', 'ne', 'sw', 'se'] as const).map((h) => (
                  <span key={h} className={`crop-handle ${h}`} aria-hidden="true" onPointerDown={start(h)} />
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="options">
          <h3>The finishing touches</h3>
          <Segmented label="Shape" value={ratio} onChange={(v) => shape(v, portrait)} options={RATIOS} />
          {ratio !== 0 && ratio !== 1 && (
            <label className="check">
              <input type="checkbox" checked={portrait} onChange={(e) => shape(ratio, e.target.checked)} /> Portrait (taller than wide)
            </label>
          )}
          <p>{px ? `The crop is ${px.w} × ${px.h} px.` : 'Add an image, then drag the box over the part you want to keep.'}</p>
          <RunPanel job={job} label="Crop" disabled={!px} onRun={run} />
        </div>
      </div>
    </Room>
  )
}
