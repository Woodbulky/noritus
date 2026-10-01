import { useState } from 'react'
import { Dropzone, FileRows, Room, RunPanel } from '../../components/Tool'
import { useJob } from '../../components/useJob'
import { stem } from '../../lib/files'
import { IMAGE_ACCEPT } from '../../lib/image'
import { pack, runImage, source } from '../../lib/runImage'
import { sanitizeFilename, uniqueStems } from '../../lib/sanitize'
import { strip } from './strip'

const FAQ: [string, string][] = [
  ['What gets removed?', 'GPS location, camera make and model, the date taken, camera settings, captions, comments, editing history and hidden preview images.'],
  ['Does it lower the quality?', 'Not for JPG, PNG and WebP: only the metadata is cut out and the picture itself is copied exactly. Other formats, like iPhone HEIC photos, are saved as a fresh high-quality JPG, which carries no metadata.'],
  ['Will my photo turn sideways?', 'No. The one setting that keeps it the right way up is kept.'],
  ['Is my photo uploaded?', 'No. The cleaning happens inside this browser tab. Your photo, and its location, never leave your device.'],
]

const TYPES: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }

export default function ExifRemove() {
  const [files, setFiles] = useState<File[]>([])
  const job = useJob(files)

  const run = () =>
    job.run(async (progress, signal, stage) => {
      const names = uniqueStems(files.map((f) => sanitizeFilename(stem(f.name), 'photo') + '-clean'))
      const found = new Set<string>()
      const items = []
      for (const [i, f] of files.entries()) {
        let cleaned: ReturnType<typeof strip>
        try {
          cleaned = strip(new Uint8Array(await f.arrayBuffer()))
        } catch {
          throw new Error(`“${f.name}” looks damaged, so it couldn’t be cleaned safely.`)
        }
        if (cleaned) {
          cleaned.removed.forEach((r) => found.add(r))
          items.push({ name: `${names[i]}.${cleaned.format}`, blob: new Blob([cleaned.bytes as BlobPart], { type: TYPES[cleaned.format] }) })
        } else {
          // Formats we can't edit in place get a fresh JPG, which carries no metadata.
          const r = await runImage({ ...(await source(f)), type: 'image/jpeg', quality: 0.95 }, signal)
          found.add('all metadata (saved as a new JPG)')
          items.push({ name: `${names[i]}.jpg`, blob: r.blob })
        }
        progress((i + 1) / files.length)
      }
      stage('save')
      const out = await pack(items, 'clean-photos.zip')
      return { ...out, note: found.size ? `removed ${[...found].join(', ')}` : 'there was no metadata to remove' }
    })

  return (
    <Room slug="exif-remove" faq={FAQ}>
      <div className="workbench">
        <div className="file-area">
          <Dropzone accept={IMAGE_ACCEPT} multiple what="photos (JPG, PNG, WebP, HEIC)" onFiles={(f) => setFiles([...files, ...f])} />
          <FileRows files={files} onChange={setFiles} />
        </div>
        <div className="options">
          <h3>The finishing touches</h3>
          <p>Nothing to set. Location, camera details and dates come out; the picture stays exactly as it is.</p>
          <RunPanel job={job} label="Remove photo data" disabled={!files.length} onRun={run} />
        </div>
      </div>
    </Room>
  )
}
