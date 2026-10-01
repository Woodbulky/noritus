import { useState } from 'react'
import { EngineNote } from '../../components/Media'
import { Dropzone, FileRows, Room, RunPanel, Segmented } from '../../components/Tool'
import { useJob } from '../../components/useJob'
import { runMedia, warmEngine } from '../../lib/ffmpeg'
import { outName } from '../../lib/files'
import { convertArgs, VIDEO_ACCEPT, type Container } from '../../lib/media'

const FAQ: [string, string][] = [
  ['Which format should I pick?', 'MP4 plays almost everywhere. WebM suits websites. MOV is handy for Apple editing apps, and MKV holds nearly anything.'],
  ['Why was it so fast?', 'When the video inside already fits the new format, Noritus just repackages it without re-encoding. Same quality, in seconds.'],
  ['Why is it slow sometimes?', 'If the video has to be re-encoded, your computer does all the work in the browser. Expect roughly real time for HD video.'],
  ['Is my video uploaded?', 'No. The engine runs inside this tab and your video never leaves your device.'],
]

export default function VideoConverter() {
  const [file, setFile] = useState<File | null>(null)
  const [to, setTo] = useState<Container>('mp4')
  const job = useJob(file, to)

  const run = () =>
    job.run(async (progress, signal) => {
      const out = `/out.${to}`
      const bytes = await runMedia(
        file!,
        (input, info) => {
          if (!info.video) throw new Error(`“${file!.name}” has no video. Try the audio converter instead.`)
          return { output: out, attempts: convertArgs(input, out, to, info) }
        },
        progress,
        signal,
      )
      return { blob: new Blob([bytes as BlobPart]), name: outName(file!.name, '', to) }
    })

  return (
    <Room slug="video-converter" faq={FAQ}>
      <div className="workbench">
        <div className="file-area">
          <Dropzone accept={VIDEO_ACCEPT} what="a video" onFiles={([f]) => (setFile(f), warmEngine().catch(() => {}))} />
          <FileRows files={file ? [file] : []} onChange={() => setFile(null)} />
        </div>
        <div className="options">
          <h3>The finishing touches</h3>
          <Segmented
            label="Convert to"
            value={to}
            onChange={setTo}
            options={[
              ['mp4', 'MP4'],
              ['webm', 'WebM'],
              ['mov', 'MOV'],
              ['mkv', 'MKV'],
            ]}
          />
          <p>Keeps the main video and sound track. Repackaged without re-encoding whenever it can be.</p>
          <EngineNote files={file ? [file] : []} />
          <RunPanel job={job} label="Convert" disabled={!file} onRun={run} />
        </div>
      </div>
    </Room>
  )
}
