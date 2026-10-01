import { useState } from 'react'
import { EngineNote, Preview, TimeRange } from '../../components/Media'
import { Dropzone, FileRows, Room, RunPanel, Segmented } from '../../components/Tool'
import { useJob } from '../../components/useJob'
import { runMedia, warmEngine } from '../../lib/ffmpeg'
import { outName } from '../../lib/files'
import { gifArgs, readRange, VIDEO_ACCEPT } from '../../lib/media'

const FAQ: [string, string][] = [
  ['Why is my GIF so big?', 'GIF is an old format that stores every frame as a full picture. Keep clips short (a few seconds), and lower the width or frame rate to shrink it.'],
  ['How do I pick the part I want?', 'Play the video, pause where you want to start, and press “Use player position”. Leave the end blank to go to the end.'],
  ['Does it loop?', 'Yes. GIFs made here loop forever, the way GIFs should.'],
  ['Is my video uploaded?', 'No. The engine runs inside this tab and your video never leaves your device.'],
]

export default function VideoToGif() {
  const [file, setFile] = useState<File | null>(null)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [fps, setFps] = useState(12)
  const [width, setWidth] = useState(480)
  const [now, setNow] = useState<number | null>(null)
  const job = useJob(file, start, end, fps, width)
  const range = readRange(start, end, null)

  const run = () =>
    job.run(async (progress, signal) => {
      const bytes = await runMedia(
        file!,
        (input, info) => {
          if (!info.video) throw new Error(`“${file!.name}” has no video to turn into a GIF.`)
          const r = readRange(start, end, info.duration)
          if (typeof r === 'string') throw new Error(r)
          return { output: '/out.gif', attempts: [gifArgs(input, '/out.gif', r.start, r.end, fps, width)], seconds: (r.end ?? info.duration ?? 0) - r.start || null }
        },
        progress,
        signal,
      )
      return { blob: new Blob([bytes as BlobPart], { type: 'image/gif' }), name: outName(file!.name, '', 'gif') }
    })

  return (
    <Room slug="video-to-gif" faq={FAQ}>
      <div className="workbench">
        <div className="file-area">
          <Dropzone
            accept={VIDEO_ACCEPT}
            what="a video"
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
            label="Width"
            value={width}
            onChange={setWidth}
            options={[
              [320, '320 px'],
              [480, '480 px'],
              [640, '640 px'],
              [0, 'Keep'],
            ]}
          />
          <Segmented
            label="Frames per second"
            value={fps}
            onChange={setFps}
            options={[
              [8, '8'],
              [12, '12'],
              [20, '20'],
            ]}
          />
          <p>Short clips make the best GIFs. A few seconds is plenty.</p>
          {typeof range === 'string' && <p role="alert">{range}</p>}
          <EngineNote files={file ? [file] : []} />
          <RunPanel job={job} label="Make GIF" disabled={!file || typeof range === 'string'} onRun={run} />
        </div>
      </div>
    </Room>
  )
}
