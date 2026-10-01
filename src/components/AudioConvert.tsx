import { useState } from 'react'
import { warmEngine, runMedia } from '../lib/ffmpeg'
import { stem } from '../lib/files'
import { AUDIO_FORMATS, audioArgs, isLossless, type AudioFormat } from '../lib/media'
import { sanitizeFilename, uniqueStems } from '../lib/sanitize'
import { buildZip } from '../lib/zip'
import { EngineNote } from './Media'
import { Dropzone, FileRows, Room, RunPanel, Segmented } from './Tool'
import { useJob } from './useJob'

/** Shared by MP4 to MP3 and the audio converter: many files in, one audio format out (ZIP for several). */
export default function AudioConvert({ slug, accept, what, faq }: { slug: string; accept: string; what: string; faq: [string, string][] }) {
  const [files, setFiles] = useState<File[]>([])
  const [format, setFormat] = useState<AudioFormat>('mp3')
  const [kbps, setKbps] = useState(192)
  const job = useJob(files, format, kbps)

  const run = () =>
    job.run(async (progress, signal) => {
      const out = `/out.${format}`
      const names = uniqueStems(files.map((f) => sanitizeFilename(stem(f.name), 'audio')))
      const entries = []
      for (const [i, f] of files.entries()) {
        const bytes = await runMedia(
          f,
          (input, info) => {
            if (!info.audio) throw new Error(`“${f.name}” has no sound to extract.`)
            return { output: out, attempts: [['-i', input, ...audioArgs(format, kbps), out]] }
          },
          (p) => progress((i + p) / files.length),
          signal,
        )
        entries.push({ name: `${names[i]}.${format}`, bytes })
      }
      if (entries.length === 1) return { blob: new Blob([entries[0].bytes as BlobPart]), name: entries[0].name }
      return { blob: await buildZip(entries), name: `audio-${format}.zip`, note: `${entries.length} files` }
    })

  return (
    <Room slug={slug} faq={faq}>
      <div className="workbench">
        <div className="file-area">
          <Dropzone
            accept={accept}
            multiple
            what={what}
            onFiles={(f) => {
              setFiles([...files, ...f])
              warmEngine().catch(() => {}) // EngineNote shows the error
            }}
          />
          <FileRows files={files} onChange={setFiles} />
        </div>
        <div className="options">
          <h3>The finishing touches</h3>
          <Segmented label="Format" value={format} onChange={setFormat} options={AUDIO_FORMATS} />
          {isLossless(format) ? (
            <p>{format.toUpperCase()} is lossless, so there is no quality to choose. Files will be larger.</p>
          ) : (
            <Segmented
              label="Quality"
              value={kbps}
              onChange={setKbps}
              options={[
                [128, '128 kbps'],
                [192, '192 kbps'],
                [320, '320 kbps'],
              ]}
            />
          )}
          <EngineNote files={files} />
          <RunPanel job={job} label="Convert" disabled={!files.length} onRun={run} />
        </div>
      </div>
    </Room>
  )
}
