import { useEffect, useState } from 'react'
import { Dropzone, Field, FileRows, Room, RunPanel, Segmented } from '../../components/Tool'
import { useJob } from '../../components/useJob'
import { IMAGE_ACCEPT, LABEL, type OutType } from '../../lib/image'
import { canEncode, convertAll, pack } from '../../lib/runImage'

const FAQ: [string, string][] = [
  ['Can it open iPhone HEIC photos?', 'Yes. HEIC photos are decoded right here in the tab, then saved as JPG, PNG, WebP or AVIF.'],
  ['Which format should I pick?', 'JPG works everywhere. PNG keeps sharp edges and transparency. WebP and AVIF make much smaller files and work in all modern browsers.'],
  ['What happens to transparent areas?', 'PNG, WebP and AVIF keep them. JPG has no transparency, so those areas become white.'],
  ['Are animated GIFs kept moving?', 'No. Only the first frame is converted. Use Video to GIF for moving pictures.'],
  ['Are my images uploaded?', 'No. Every image is converted inside this browser tab and never leaves your device.'],
]

const LOSSY = (t: OutType) => t !== 'image/png'

export default function ImageConvert() {
  const [files, setFiles] = useState<File[]>([])
  const [type, setType] = useState<OutType>('image/jpeg')
  const [quality, setQuality] = useState(90)
  const [avif, setAvif] = useState(false)
  const job = useJob(files, type, quality)

  useEffect(() => void canEncode('image/avif').then(setAvif), [])

  const run = () =>
    job.run(async (progress, signal, stage) => {
      const done = await convertAll(files, () => ({ type, quality: quality / 100 }), '', progress, signal)
      stage('save')
      const out = await pack(done, `images-${LABEL[type].toLowerCase()}.zip`)
      return { ...out, note: done.length > 1 ? `${done.length} images` : `${done[0].width} × ${done[0].height}` }
    })

  const types: OutType[] = ['image/jpeg', 'image/png', 'image/webp', ...(avif ? ['image/avif' as const] : [])]
  return (
    <Room slug="image-convert" faq={FAQ}>
      <div className="workbench">
        <div className="file-area">
          <Dropzone accept={IMAGE_ACCEPT} multiple what="images (HEIC, JPG, PNG, WebP, SVG)" onFiles={(f) => setFiles([...files, ...f])} />
          <FileRows files={files} onChange={setFiles} />
        </div>
        <div className="options">
          <h3>The finishing touches</h3>
          <Segmented label="Convert to" value={type} onChange={setType} options={types.map((t) => [t, LABEL[t]])} />
          {LOSSY(type) && (
            <Field label={`Quality · ${quality}%`} hint="Lower makes smaller files.">
              <input type="range" min={40} max={100} step={5} value={quality} onChange={(e) => setQuality(+e.target.value)} />
            </Field>
          )}
          <p>{avif ? 'One image in, one image out.' : 'AVIF isn’t offered because this browser can’t save it.'}</p>
          <RunPanel job={job} label={`Convert to ${LABEL[type]}`} disabled={!files.length} onRun={run} />
        </div>
      </div>
    </Room>
  )
}
