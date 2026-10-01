import { useState } from 'react'
import { Dropzone, FileRows, Room, RunPanel, Segmented } from '../../components/Tool'
import { useJob } from '../../components/useJob'
import { formatBytes } from '../../lib/files'
import { change, IMAGE_ACCEPT, keepType, type OutType } from '../../lib/image'
import { convertAll, pack } from '../../lib/runImage'

const FAQ: [string, string][] = [
  ['How much smaller will it get?', 'Phone photos usually shrink by half or more. Choose “Smaller” or a lower size cap for bigger savings. If a file can’t get smaller, you get the original back.'],
  ['Why didn’t my PNG shrink?', 'PNG is lossless, so saving it again doesn’t help. Cap the size, or choose WebP, which keeps transparency and is much smaller.'],
  ['Is the location from my photo kept?', 'No. Compressed images are drawn afresh, so camera details and GPS location are left behind.'],
  ['Are my photos uploaded?', 'No. Every image is compressed inside this browser tab and never leaves your device.'],
]

export default function ImageCompress() {
  const [files, setFiles] = useState<File[]>([])
  const [quality, setQuality] = useState(0.75)
  const [cap, setCap] = useState(0)
  const [format, setFormat] = useState<'keep' | OutType>('keep')
  const job = useJob(files, quality, cap, format)
  const pngs = format === 'keep' && files.some((f) => keepType(f) === 'image/png')

  const run = () =>
    job.run(async (progress, signal, stage) => {
      const done = await convertAll(files, (f) => ({ type: format === 'keep' ? keepType(f) : format, quality, fit: { kind: 'within', w: cap, h: cap } }), '-small', progress, signal)
      // A file that didn't get smaller in the same format is returned as it was.
      const items = done.map((d) => (d.blob.size >= d.from.size && d.blob.type === d.from.type ? { name: d.name, blob: d.from as Blob } : d))
      const before = files.reduce((n, f) => n + f.size, 0)
      const after = items.reduce((n, i) => n + i.blob.size, 0)
      stage('save')
      const out = await pack(items, 'compressed-images.zip')
      return { ...out, note: `${files.length > 1 ? `${files.length} images, ` : ''}was ${formatBytes(before)} (${change(before, after)})` }
    })

  return (
    <Room slug="image-compress" faq={FAQ}>
      <div className="workbench">
        <div className="file-area">
          <Dropzone accept={IMAGE_ACCEPT} multiple what="images (JPG, PNG, WebP, HEIC)" onFiles={(f) => setFiles([...files, ...f])} />
          <FileRows files={files} onChange={setFiles} />
        </div>
        <div className="options">
          <h3>The finishing touches</h3>
          <Segmented
            label="Compression"
            value={quality}
            onChange={setQuality}
            options={[
              [0.88, 'Gentle'],
              [0.75, 'Balanced'],
              [0.55, 'Smaller'],
            ]}
          />
          <Segmented
            label="Longest side"
            value={cap}
            onChange={setCap}
            options={[
              [0, 'Keep'],
              [2560, '2560 px'],
              [1920, '1920 px'],
              [1280, '1280 px'],
            ]}
          />
          <Segmented
            label="Format"
            value={format}
            onChange={setFormat}
            options={[
              ['keep', 'Same'],
              ['image/jpeg', 'JPG'],
              ['image/webp', 'WebP'],
            ]}
          />
          <p>{pngs ? 'PNGs only get smaller with a size cap or as WebP.' : 'If an image can’t get smaller, you get the original back.'}</p>
          <RunPanel job={job} label="Compress" disabled={!files.length} onRun={run} />
        </div>
      </div>
    </Room>
  )
}
