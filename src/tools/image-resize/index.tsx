import { useState } from 'react'
import { Dropzone, Field, FileRows, Room, RunPanel, Segmented } from '../../components/Tool'
import { useJob } from '../../components/useJob'
import { IMAGE_ACCEPT, keepType, type Fit } from '../../lib/image'
import { convertAll, pack } from '../../lib/runImage'

const FAQ: [string, string][] = [
  ['Will my images be stretched?', 'No. The shape is always kept. “Fit inside” shrinks each image until it fits the box you set.'],
  ['Can I resize lots of images at once?', 'Yes. Drop as many as you like. They come back together in one ZIP.'],
  ['Which format do I get?', 'The same one you put in. HEIC photos come back as JPG, and other formats as PNG.'],
  ['Are my images uploaded?', 'No. Every image is resized inside this browser tab and never leaves your device.'],
]

export default function ImageResize() {
  const [files, setFiles] = useState<File[]>([])
  const [mode, setMode] = useState<'scale' | 'within'>('within')
  const [percent, setPercent] = useState(50)
  const [width, setWidth] = useState(1920)
  const [height, setHeight] = useState(1080)
  const fit: Fit = mode === 'scale' ? { kind: 'scale', scale: percent / 100 } : { kind: 'within', w: width, h: height }
  const valid = mode === 'scale' || width > 0 || height > 0
  const job = useJob(files, mode, percent, width, height)

  const run = () =>
    job.run(async (progress, signal, stage) => {
      const done = await convertAll(files, (f) => ({ type: keepType(f), quality: 0.92, fit }), '-resized', progress, signal)
      stage('save')
      const out = await pack(done, 'resized-images.zip')
      return { ...out, note: done.length > 1 ? `${done.length} images` : `${done[0].width} × ${done[0].height}` }
    })

  const px = (v: number, set: (n: number) => void, label: string) => (
    <Field label={label}>
      <input className="input" type="number" min={0} max={20000} inputMode="numeric" value={v || ''} placeholder="any" onChange={(e) => set(Math.max(0, Math.round(+e.target.value)))} />
    </Field>
  )

  return (
    <Room slug="image-resize" faq={FAQ}>
      <div className="workbench">
        <div className="file-area">
          <Dropzone accept={IMAGE_ACCEPT} multiple what="images (JPG, PNG, WebP, HEIC)" onFiles={(f) => setFiles([...files, ...f])} />
          <FileRows files={files} onChange={setFiles} />
        </div>
        <div className="options">
          <h3>The finishing touches</h3>
          <Segmented
            label="Resize by"
            value={mode}
            onChange={setMode}
            options={[
              ['within', 'Fit inside'],
              ['scale', 'Percentage'],
            ]}
          />
          {mode === 'within' ? (
            <>
              <div className="side-by-side">
                {px(width, setWidth, 'Max width (px)')}
                {px(height, setHeight, 'Max height (px)')}
              </div>
              <p>Smaller images are left at their size. Leave a side blank for no limit.</p>
            </>
          ) : (
            <Field label={`Scale · ${percent}%`}>
              <input type="range" min={5} max={200} step={5} value={percent} onChange={(e) => setPercent(+e.target.value)} />
            </Field>
          )}
          <RunPanel job={job} label="Resize" disabled={!files.length || !valid} onRun={run} />
        </div>
      </div>
    </Room>
  )
}
