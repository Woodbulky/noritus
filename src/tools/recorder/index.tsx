import { useEffect, useRef, useState } from 'react'
import Icon, { type IconName } from '../../components/Icon'
import { Room, Segmented } from '../../components/Tool'
import { download, formatBytes } from '../../lib/files'
import { formatTime } from '../../lib/media'

const FAQ: [string, string][] = [
  ['Where does the recording go?', 'Nowhere but this tab. It is recorded by your browser and saved straight to your device when you press Download.'],
  ['Can it record sound from my screen?', 'In Chrome and Edge, tick “Share audio” in the sharing window to include tab or system sound. Your microphone can be added on top.'],
  ['Which format do I get?', 'MP4 where your browser can record it (recent Chrome, Edge and Safari), otherwise WebM. Both play in modern browsers and players.'],
  ['Does it work on phones?', 'Camera and microphone recording do. Most phone browsers don’t allow screen recording from a web page.'],
]

type Source = 'screen' | 'camera' | 'mic'
const STAGE: Record<Source, [IconName, string, string]> = {
  screen: ['record', 'Your screen', 'screen, window or tab to share'],
  camera: ['video', 'Your camera', 'camera to use'],
  mic: ['music', 'Your voice', 'microphone to use'],
}
type Take = { blob: Blob; name: string; url: string }

const supported = typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices
const canScreen = supported && 'getDisplayMedia' in navigator.mediaDevices
const pick = (types: string[]) => types.find((t) => MediaRecorder.isTypeSupported(t)) ?? ''

function plainError(e: unknown, source: Source) {
  const name = (e as Error)?.name
  if (name === 'NotAllowedError') return source === 'screen' ? 'Screen sharing was cancelled or blocked.' : 'Access was blocked. Allow the camera or microphone in your browser’s address bar, then try again.'
  if (name === 'NotFoundError') return source === 'camera' ? 'No camera was found.' : 'No microphone was found.'
  if (name === 'NotReadableError') return 'Another app is using the camera or microphone. Close it and try again.'
  return 'Recording couldn’t start in this browser.'
}

/** Screen + its audio + mic → one stream. MediaRecorder only records the first audio track, so several are mixed into one. */
async function capture(source: Source, withMic: boolean) {
  const mic = withMic || source === 'mic' ? await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }) : null
  try {
    const main =
      source === 'screen' ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }) : source === 'camera' ? await navigator.mediaDevices.getUserMedia({ video: true }) : null
    const audio = [...(main?.getAudioTracks() ?? []), ...(mic?.getAudioTracks() ?? [])]
    const owned = [...(main?.getTracks() ?? []), ...(mic?.getTracks() ?? [])]
    let mixed: MediaStreamTrack[] = audio
    let ctx: AudioContext | null = null
    if (audio.length > 1) {
      ctx = new AudioContext()
      const out = ctx.createMediaStreamDestination()
      for (const t of audio) ctx.createMediaStreamSource(new MediaStream([t])).connect(out)
      mixed = out.stream.getAudioTracks()
    }
    const stream = new MediaStream([...(main?.getVideoTracks() ?? []), ...mixed])
    const stop = () => {
      owned.forEach((t) => t.stop())
      void ctx?.close()
    }
    return { stream, stop }
  } catch (e) {
    mic?.getTracks().forEach((t) => t.stop())
    throw e
  }
}

export default function Recorder() {
  const [source, setSource] = useState<Source>(canScreen ? 'screen' : 'camera')
  const [withMic, setWithMic] = useState(true)
  const [live, setLive] = useState<{ stream: MediaStream; started: number } | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [size, setSize] = useState(0)
  const [take, setTake] = useState<Take | null>(null)
  const [error, setError] = useState('')
  const rec = useRef<{ recorder: MediaRecorder; stop: () => void } | null>(null)
  const preview = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (preview.current) preview.current.srcObject = live?.stream ?? null
    if (!live) return
    const id = setInterval(() => setElapsed((Date.now() - live.started) / 1000), 250)
    return () => clearInterval(id)
  }, [live])
  // Leaving the page stops the camera, mic and screen share.
  useEffect(() => () => rec.current?.stop(), [])
  useEffect(() => () => void (take && URL.revokeObjectURL(take.url)), [take])

  async function start() {
    setError('')
    setTake(null)
    let cap: Awaited<ReturnType<typeof capture>>
    try {
      cap = await capture(source, source !== 'mic' && withMic)
    } catch (e) {
      setError(plainError(e, source))
      return
    }
    const video = cap.stream.getVideoTracks().length > 0
    const mimeType = video ? pick(['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm']) : pick(['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'])
    const recorder = new MediaRecorder(cap.stream, mimeType ? { mimeType } : undefined)
    const chunks: Blob[] = []
    let bytes = 0
    recorder.ondataavailable = (e) => {
      if (!e.data.size) return
      chunks.push(e.data)
      setSize((bytes += e.data.size))
    }
    recorder.onstop = () => {
      cap.stop()
      rec.current = null
      setLive(null)
      const type = recorder.mimeType || mimeType || (video ? 'video/webm' : 'audio/webm')
      const blob = new Blob(chunks, { type })
      const ext = type.includes('mp4') ? (video ? 'mp4' : 'm4a') : 'webm'
      const stamp = new Date().toLocaleString('sv').slice(0, 16).replace(':', '.') // local time, e.g. 2026-10-01 17.05
      setTake({ blob, name: `${{ screen: 'Screen', camera: 'Camera', mic: 'Voice' }[source]} recording ${stamp}.${ext}`, url: URL.createObjectURL(blob) })
    }
    // The browser's own "Stop sharing" button ends the video track; finish the take when it does.
    cap.stream.getVideoTracks()[0]?.addEventListener('ended', () => recorder.state !== 'inactive' && recorder.stop())
    rec.current = { recorder, stop: () => (recorder.state !== 'inactive' ? recorder.stop() : cap.stop()) }
    recorder.start(1000)
    setSize(0)
    setElapsed(0)
    setLive({ stream: cap.stream, started: Date.now() })
  }

  return (
    <Room slug="recorder" faq={FAQ}>
      <div className="workbench">
        <div className="file-area">
          {live ? (
            <>
              {live.stream.getVideoTracks().length ? (
                <video ref={preview} className="media-preview" autoPlay muted playsInline />
              ) : (
                <div className="rec-stage">
                  <Icon name="music" />
                  <span>Recording your microphone…</span>
                </div>
              )}
              <p className="rec-status" role="status">
                <span className="rec-dot" aria-hidden="true" /> Recording · {formatTime(Math.floor(elapsed))} · {formatBytes(size)}
              </p>
            </>
          ) : take ? (
            take.blob.type.startsWith('audio/') ? <audio className="media-preview" src={take.url} controls /> : <video className="media-preview" src={take.url} controls playsInline />
          ) : (
            <div className="rec-stage">
              <Icon name={STAGE[source][0]} />
              <strong>{STAGE[source][1]} will show up here.</strong>
              <span>Press Start recording. Your browser will ask which {STAGE[source][2]}.</span>
            </div>
          )}
        </div>
        <div className="options">
          <h3>The finishing touches</h3>
          <Segmented
            label="Record"
            value={source}
            onChange={(s) => !live && setSource(s)}
            options={[
              ...(canScreen ? [['screen', 'Screen'] as [Source, string]] : []),
              ['camera', 'Camera'],
              ['mic', 'Microphone'],
            ]}
          />
          {source !== 'mic' && (
            <label className="check">
              <input type="checkbox" checked={withMic} disabled={!!live} onChange={(e) => setWithMic(e.target.checked)} /> Include my microphone
            </label>
          )}
          {!supported && <p role="alert">This browser can’t record. Try a recent Chrome, Edge, Firefox or Safari.</p>}
          {error && (
            <p className="feedback" role="alert">
              {error}
            </p>
          )}
          <div className="run">
            {take && !live && (
              <div className="result" role="status">
                <span className="tick">
                  <svg viewBox="0 0 24 24">
                    <path pathLength={100} d="m5 12 4 4L19 7" />
                  </svg>
                </span>
                <div style={{ minWidth: 0 }}>
                  <b className="result-name">{take.name}</b>
                  <p>{formatBytes(take.blob.size)}. Made on your device.</p>
                </div>
              </div>
            )}
            {live ? (
              <button className="btn btn-primary" onClick={() => rec.current?.stop()}>
                Stop recording <span className="arrow">■</span>
              </button>
            ) : take ? (
              <>
                <button className="btn btn-primary" data-magnet onClick={() => download(take.blob, take.name)}>
                  Download <span className="arrow">↓</span>
                </button>
                <button className="text-link" onClick={start}>
                  Record another
                </button>
              </>
            ) : (
              <button className="btn btn-primary" data-magnet disabled={!supported} onClick={start}>
                Start recording <span className="arrow">↗</span>
              </button>
            )}
            <p className="stay-note">Your recording stays with you.</p>
          </div>
        </div>
      </div>
    </Room>
  )
}
