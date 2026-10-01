import { useCallback, useSyncExternalStore } from 'react'
import { engineState, onEngine } from '../lib/ffmpeg'
import { formatTime, parseTime } from '../lib/media'

const BIG = 500 * 1024 * 1024

/** The engine download line ("Loading engine (~31 MB, once) 40%") and a memory warning for big inputs. */
export function EngineNote({ files }: { files: File[] }) {
  const s = useSyncExternalStore(onEngine, engineState)
  const big = files.reduce((n, f) => n + f.size, 0) > BIG
  return (
    <>
      {s.kind === 'loading' && (
        <p role="status">
          Loading engine (~31 MB, once) · {Math.round(s.progress * 100)}%
        </p>
      )}
      {s.kind === 'error' && <p role="alert">{s.message}</p>}
      {big && <p>This is a big file. Browsers cap memory at about 2 GB, so very long or high-resolution videos may not finish.</p>}
    </>
  )
}

/** A local preview of `file` (object URL, revoked on change). The browser may not play every format; that's fine. */
export function Preview({ file, onTime }: { file: File; onTime?: (el: HTMLMediaElement) => void }) {
  const attach = useCallback(
    (el: HTMLMediaElement | null) => {
      if (!el) return
      const url = URL.createObjectURL(file)
      el.src = url
      return () => URL.revokeObjectURL(url)
    },
    [file],
  )
  const props = { ref: attach, controls: true, className: 'media-preview', onLoadedMetadata: (e: { currentTarget: HTMLMediaElement }) => onTime?.(e.currentTarget), onTimeUpdate: (e: { currentTarget: HTMLMediaElement }) => onTime?.(e.currentTarget) }
  return file.type.startsWith('audio/') ? <audio {...props} /> : <video {...props} playsInline />
}

/** Start/end fields that accept "1:30" or "90", with a button that takes the player's current position. */
export function TimeRange({ start, end, onStart, onEnd, now }: { start: string; end: string; onStart: (v: string) => void; onEnd: (v: string) => void; now: number | null }) {
  const field = (label: string, value: string, set: (v: string) => void, placeholder: string) => (
    <label className="field">
      <span className="option-label">{label}</span>
      <input className="input" value={value} placeholder={placeholder} aria-invalid={value.trim() !== '' && parseTime(value) === null} onChange={(e) => set(e.target.value)} />
      {now !== null && (
        <button type="button" className="text-link" style={{ alignSelf: 'start', fontSize: 11 }} onClick={() => set(formatTime(now))}>
          Use player position ({formatTime(now)})
        </button>
      )}
    </label>
  )
  return (
    <div className="side-by-side">
      {field('Start', start, onStart, '0:00')}
      {field('End', end, onEnd, 'the end')}
    </div>
  )
}
