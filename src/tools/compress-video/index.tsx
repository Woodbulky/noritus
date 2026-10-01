import { useState } from 'react'
import { EngineNote } from '../../components/Media'
import { Dropzone, Field, FileRows, Room, RunPanel, Segmented } from '../../components/Tool'
import { useJob } from '../../components/useJob'
import { runMedia, warmEngine } from '../../lib/ffmpeg'
import { outName } from '../../lib/files'
import { compressArgs, VIDEO_ACCEPT } from '../../lib/media'

const FAQ: [string, string][] = [
  ['How long will it take?', 'Compressing happens on your own computer, inside the browser. HD video often takes about as long as the video itself, sometimes longer. Shorter clips and lower resolutions are much quicker.'],
  ['Which setting should I use?', 'Balanced keeps things looking good. Smaller file squeezes harder. Pick a target size when you need to fit an email or upload limit.'],
  ['Does lowering the resolution help?', 'A lot. 720p is plenty for phones and most sharing, and makes files far smaller than 1080p or 4K.'],
  ['Is my video uploaded?', 'No. The engine runs inside this tab and your video never leaves your device.'],
]

type Aim = 'balanced' | 'small' | 'size'

export default function CompressVideo() {
  const [file, setFile] = useState<File | null>(null)
  const [height, setHeight] = useState(720)
  const [aim, setAim] = useState<Aim>('balanced')
  const [mb, setMb] = useState('25')
  const job = useJob(file, height, aim, mb)
  const target = Number(mb)

  const run = () =>
    job.run(async (progress, signal) => {
      const bytes = await runMedia(
        file!,
        (input, info) => {
          if (!info.video) throw new Error(`“${file!.name}” has no video to compress.`)
          if (aim === 'size' && !info.duration) throw new Error('The length of this video can’t be read, so a target size isn’t possible. Try Balanced instead.')
          const squeeze = aim === 'size' ? { height, targetMB: target, duration: info.duration! } : { height, crf: aim === 'small' ? 30 : 26 }
          return { output: '/out.mp4', attempts: [compressArgs(input, '/out.mp4', squeeze)] }
        },
        progress,
        signal,
      )
      const saved = Math.round((1 - bytes.length / file!.size) * 100)
      return { blob: new Blob([bytes as BlobPart]), name: outName(file!.name, '-compressed', 'mp4'), note: saved > 0 ? `${saved}% smaller` : 'Already compact; this isn’t smaller' }
    })

  return (
    <Room slug="compress-video" faq={FAQ}>
      <div className="workbench">
        <div className="file-area">
          <Dropzone accept={VIDEO_ACCEPT} what="a video" onFiles={([f]) => (setFile(f), warmEngine().catch(() => {}))} />
          <FileRows files={file ? [file] : []} onChange={() => setFile(null)} />
        </div>
        <div className="options">
          <h3>The finishing touches</h3>
          <Segmented
            label="Resolution"
            value={height}
            onChange={setHeight}
            options={[
              [0, 'Keep'],
              [1080, '1080p'],
              [720, '720p'],
              [480, '480p'],
            ]}
          />
          <Segmented
            label="Aim for"
            value={aim}
            onChange={setAim}
            options={[
              ['balanced', 'Balanced'],
              ['small', 'Smaller file'],
              ['size', 'Target size'],
            ]}
          />
          {aim === 'size' && (
            <Field label="Target size (MB)" hint="Lands close to this, usually a little under.">
              <input className="input" type="number" min={1} step={1} value={mb} onChange={(e) => setMb(e.target.value)} />
            </Field>
          )}
          <p>Saves as MP4. This is slow work for a browser, so long videos can take a while. You can cancel at any time.</p>
          <EngineNote files={file ? [file] : []} />
          <RunPanel job={job} label="Compress" disabled={!file || (aim === 'size' && !(target > 0))} onRun={run} />
        </div>
      </div>
    </Room>
  )
}
