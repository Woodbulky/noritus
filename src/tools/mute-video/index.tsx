import { useState } from 'react'
import { EngineNote } from '../../components/Media'
import { Dropzone, FileRows, Room, RunPanel } from '../../components/Tool'
import { useJob } from '../../components/useJob'
import { runMedia, warmEngine } from '../../lib/ffmpeg'
import { outName } from '../../lib/files'
import { keepExt, muteArgs, VIDEO_ACCEPT } from '../../lib/media'

const FAQ: [string, string][] = [
  ['Does it change the picture?', 'No. The video is copied as it is, so quality is untouched and it finishes in seconds.'],
  ['What gets removed?', 'Every sound track. Subtitles and the video itself stay.'],
  ['Which videos work?', 'MP4, MOV, MKV, WebM and most other common formats. You get the same format back.'],
  ['Is my video uploaded?', 'No. The engine runs inside this tab and your video never leaves your device.'],
]

export default function MuteVideo() {
  const [file, setFile] = useState<File | null>(null)
  const job = useJob(file)

  const run = () =>
    job.run(async (progress, signal) => {
      let ext = ''
      const bytes = await runMedia(
        file!,
        (input, info) => {
          if (!info.video) throw new Error(`“${file!.name}” has no video to keep.`)
          ext = keepExt(file!.name, true)
          return { output: `/out.${ext}`, attempts: muteArgs(input, `/out.${ext}`) }
        },
        progress,
        signal,
      )
      return { blob: new Blob([bytes as BlobPart]), name: outName(file!.name, '-muted', ext) }
    })

  return (
    <Room slug="mute-video" faq={FAQ}>
      <div className="workbench">
        <div className="file-area">
          <Dropzone accept={VIDEO_ACCEPT} what="a video" onFiles={([f]) => (setFile(f), warmEngine().catch(() => {}))} />
          <FileRows files={file ? [file] : []} onChange={() => setFile(null)} />
        </div>
        <div className="options">
          <h3>The finishing touches</h3>
          <p>Removes the sound and keeps the picture exactly as it is. Nothing to set.</p>
          <EngineNote files={file ? [file] : []} />
          <RunPanel job={job} label="Remove sound" disabled={!file} onRun={run} />
        </div>
      </div>
    </Room>
  )
}
