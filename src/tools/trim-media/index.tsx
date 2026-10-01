import { useState } from 'react'
import { EngineNote, Preview, TimeRange } from '../../components/Media'
import { Dropzone, FileRows, Room, RunPanel, Segmented } from '../../components/Tool'
import { useJob } from '../../components/useJob'
import { runMedia, warmEngine } from '../../lib/ffmpeg'
import { outName } from '../../lib/files'
import { AUDIO_ACCEPT, keepExt, readRange, trimArgs, VIDEO_ACCEPT } from '../../lib/media'

const FAQ: [string, string][] = [
  ['Fast or exact?', 'Fast copies the clip without re-encoding, so it is instant and loses no quality, but a video cut may start a moment early, at the nearest keyframe. Exact re-encodes for a cut on the precise frame.'],
  ['How do I pick the times?', 'Play the file, pause where you want to start, and press “Use player position”. Or type a time like 1:30 or 90.'],
  ['Which files work?', 'Most video and audio: MP4, MOV, MKV, WebM, MP3, M4A, WAV, FLAC and more. You get the same format back.'],
  ['Is my file uploaded?', 'No. The engine runs inside this tab and your file never leaves your device.'],
]

export default function TrimMedia() {
  const [file, setFile] = useState<File | null>(null)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [cut, setCut] = useState<'fast' | 'exact'>('fast')
  const [now, setNow] = useState<number | null>(null)
  const job = useJob(file, start, end, cut)
  const range = readRange(start, end, null)

  const run = () =>
    job.run(async (progress, signal) => {
      let ext = ''
      const bytes = await runMedia(
        file!,
        (input, info) => {
          const r = readRange(start, end, info.duration)
          if (typeof r === 'string') throw new Error(r)
          ext = keepExt(file!.name, !!info.video)
          const out = `/out.${ext}`
          return { output: out, attempts: trimArgs(input, out, r.start, r.end, cut === 'exact', !!info.video), seconds: (r.end ?? info.duration ?? 0) - r.start || null }
        },
        progress,
        signal,
      )
      return { blob: new Blob([bytes as BlobPart]), name: outName(file!.name, '-trimmed', ext) }
    })

  return (
    <Room slug="trim-media" faq={FAQ}>
      <div className="workbench">
        <div className="file-area">
          <Dropzone
            accept={`${VIDEO_ACCEPT},${AUDIO_ACCEPT}`}
            what="a video or audio file"
            onFiles={([f]) => {
              setFile(f)
              setNow(null)
              warmEngine().catch(() => {})
            }}
          />
          <FileRows files={file ? [file] : []} onChange={() => setFile(null)} />
          {file && <Preview file={file} onTime={(el) => setNow(el.currentTime)} />}
        </div>
        <div className="options">
          <h3>The finishing touches</h3>
          <TimeRange start={start} end={end} onStart={setStart} onEnd={setEnd} now={now} />
          <Segmented
            label="Cut"
            value={cut}
            onChange={setCut}
            options={[
              ['fast', 'Fast'],
              ['exact', 'Exact'],
            ]}
          />
          <p>{cut === 'exact' ? 'Re-encodes for a frame-exact cut. Slower on long videos.' : 'Instant and lossless. Video cuts snap to the nearest keyframe.'}</p>
          {typeof range === 'string' && <p role="alert">{range}</p>}
          <EngineNote files={file ? [file] : []} />
          <RunPanel job={job} label="Trim" disabled={!file || typeof range === 'string'} onRun={run} />
        </div>
      </div>
    </Room>
  )
}
