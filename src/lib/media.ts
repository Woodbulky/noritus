/** Pure ffmpeg argument builders and parsers for the media tools. No React, no ffmpeg: Node checks test these. */

export const VIDEO_ACCEPT = 'video/*,.mp4,.m4v,.mov,.mkv,.webm,.avi,.wmv,.flv,.3gp,.ts,.mts,.mpg,.mpeg,.ogv'
export const AUDIO_ACCEPT = 'audio/*,.mp3,.wav,.m4a,.aac,.ogg,.oga,.opus,.flac,.wma,.aiff,.aif,.amr'

/** What a probe (`ffmpeg -i file`) says about a file. Codec names are ffmpeg's (h264, aac, …); '' when that stream is missing. */
export type MediaInfo = { duration: number | null; video: string; audio: string }

/** Reads `Duration:` and the first video/audio stream codecs from ffmpeg's log. Cover art (attached pics) doesn't count as video. */
export function parseInfo(log: string): MediaInfo {
  const d = log.match(/Duration: (\d+):(\d\d):(\d\d(?:\.\d+)?)/)
  const stream = (kind: string) =>
    log
      .split('\n')
      .find((l) => new RegExp(`Stream #.*: ${kind}: `).test(l) && !l.includes('(attached pic)'))
      ?.match(new RegExp(`${kind}: (\\w+)`))?.[1] ?? ''
  return { duration: d ? +d[1] * 3600 + +d[2] * 60 + +d[3] : null, video: stream('Video'), audio: stream('Audio') }
}

/** Seconds from ffmpeg's progress line (`… time=00:01:02.50 …`), or null. */
export function logTime(line: string) {
  const m = line.match(/time=(-?)(\d+):(\d\d):(\d\d(?:\.\d+)?)/)
  return m && !m[1] ? +m[2] * 3600 + +m[3] * 60 + +m[4] : null
}

/** "90", "1:30", "1:30.5", "0:01:30" → seconds. Blank or nonsense → null. */
export function parseTime(text: string): number | null {
  const parts = text.trim().split(':')
  if (!text.trim() || parts.length > 3 || parts.some((p) => !/^\d+(\.\d+)?$/.test(p))) return null
  return parts.reduce((total, p) => total * 60 + +p, 0)
}

/** Seconds → "1:02.5" or "1:02:03" (tenths only when present). */
export function formatTime(seconds: number) {
  const t = Math.round(seconds * 10) / 10
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = (t % 60).toFixed(t % 1 ? 1 : 0).padStart(t % 1 ? 4 : 2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

/** Reads start/end fields: { start, end } in seconds, or an error message in plain words. */
export function readRange(start: string, end: string, duration: number | null): { start: number; end: number | null } | string {
  const a = start.trim() ? parseTime(start) : 0
  const b = end.trim() ? parseTime(end) : null
  if (a === null) return 'Start should look like 1:30 or 90.'
  if (end.trim() && b === null) return 'End should look like 1:30 or 90.'
  if (b !== null && b <= a) return 'End should come after the start.'
  if (duration && a >= duration) return `Start is past the end of the clip (${formatTime(duration)}).`
  return { start: a, end: b !== null && duration && b >= duration ? null : b }
}

// --- encoders (picked for speed: the engine is single-threaded wasm) ---

const H264 = ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2']
const VP8 = ['-c:v', 'libvpx', '-deadline', 'realtime', '-cpu-used', '8', '-crf', '10', '-b:v', '2M']
const AAC = (kbps = 160) => ['-c:a', 'aac', '-b:a', `${kbps}k`]
const OPUS = ['-c:a', 'libopus', '-b:a', '128k']

export type AudioFormat = 'mp3' | 'm4a' | 'ogg' | 'wav' | 'flac'
export const AUDIO_FORMATS: [AudioFormat, string][] = [
  ['mp3', 'MP3'],
  ['m4a', 'AAC'],
  ['ogg', 'OGG'],
  ['wav', 'WAV'],
  ['flac', 'FLAC'],
]
export const isLossless = (f: AudioFormat) => f === 'wav' || f === 'flac'

/** Audio-only output in `format`. `kbps` applies to the lossy formats. */
export function audioArgs(format: AudioFormat, kbps = 192): string[] {
  const codec = {
    mp3: ['-c:a', 'libmp3lame', '-b:a', `${kbps}k`],
    m4a: AAC(kbps),
    ogg: ['-c:a', 'libvorbis', '-b:a', `${kbps}k`],
    wav: ['-c:a', 'pcm_s16le'],
    flac: ['-c:a', 'flac'],
  }[format]
  return ['-vn', '-sn', '-dn', ...codec]
}

export type Container = 'mp4' | 'webm' | 'mov' | 'mkv'

/** Copying streams (no re-encode) is only offered when the target container and common players accept the codecs. */
export function canCopy(container: Container, info: MediaInfo) {
  const ok = { mp4: [/^(h264|hevc)$/, /^(aac|mp3)?$/], mov: [/^(h264|hevc)$/, /^(aac|mp3)?$/], webm: [/^(vp8|vp9|av1)$/, /^(opus|vorbis)?$/], mkv: [/./, /^/] }[container]
  return ok[0].test(info.video) && ok[1].test(info.audio)
}

const FASTSTART = (ext: string) => (ext === 'mp4' || ext === 'm4v' || ext === 'mov' || ext === 'm4a' ? ['-movflags', '+faststart'] : [])

/** Re-encode arguments for an output extension, or null when we don't write that format. */
export function encodeFor(ext: string, hasVideo: boolean): string[] | null {
  if (hasVideo) {
    if (ext === 'webm') return [...VP8, ...OPUS]
    if (['mp4', 'm4v', 'mov', 'mkv'].includes(ext)) return [...H264, ...AAC(), ...FASTSTART(ext)]
    return null
  }
  const audio: Record<string, string[]> = {
    mp3: audioArgs('mp3'),
    m4a: [...audioArgs('m4a'), ...FASTSTART('m4a')],
    aac: audioArgs('m4a'),
    ogg: audioArgs('ogg'),
    oga: audioArgs('ogg'),
    opus: ['-vn', ...OPUS],
    wav: audioArgs('wav'),
    flac: audioArgs('flac'),
  }
  return audio[ext] ?? null
}

/** The extension a trimmed or muted copy keeps: the input's when we can write it, else MKV (video) or M4A (audio). */
export function keepExt(name: string, hasVideo: boolean) {
  const ext = name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? ''
  return encodeFor(ext, hasVideo) ? ext : hasVideo ? 'mkv' : 'm4a'
}

/** Video → `container`: a stream copy first when the codecs fit, then a re-encode. One video and one audio stream, no subtitles. */
export function convertArgs(input: string, output: string, container: Container, info: MediaInfo): string[][] {
  const head = ['-i', input, '-map', '0:v:0', '-map', '0:a:0?', '-sn', '-dn']
  const encode = [...head, ...encodeFor(container, true)!, output]
  return canCopy(container, info) ? [[...head, '-c', 'copy', ...FASTSTART(container), output], encode] : [encode]
}

/**
 * Cut `start`–`end` (seconds; end null = to the end). `exact` re-encodes for a frame-accurate cut;
 * otherwise streams are copied (instant, but video cuts land on the nearest keyframe), with a re-encode as fallback.
 */
export function trimArgs(input: string, output: string, start: number, end: number | null, exact: boolean, hasVideo: boolean): string[][] {
  const ext = output.split('.').pop()!
  const head = [...(start > 0 ? ['-ss', String(start)] : []), ...(end !== null ? ['-to', String(end)] : []), '-i', input, '-map', '0:v:0?', '-map', '0:a:0?', '-sn', '-dn']
  const encode = [...head, ...encodeFor(ext, hasVideo)!, output]
  return exact ? [encode] : [[...head, '-c', 'copy', '-avoid_negative_ts', 'make_zero', ...FASTSTART(ext), output], encode]
}

/** Drop every audio track and copy the rest; the fallback keeps only the main video stream. */
export function muteArgs(input: string, output: string): string[][] {
  const ext = output.split('.').pop()!
  return [
    ['-i', input, '-map', '0', '-map', '-0:a', '-c', 'copy', ...FASTSTART(ext), output],
    ['-i', input, '-map', '0:v:0', '-c', 'copy', ...FASTSTART(ext), output],
  ]
}

/** A looping GIF with a per-clip palette (much better colour than the default). `width` 0 keeps the size. */
export function gifArgs(input: string, output: string, start: number, end: number | null, fps: number, width: number): string[] {
  const scale = width ? `scale='min(${width},iw)':-1:flags=lanczos,` : ''
  const vf = `fps=${fps},${scale}split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5`
  return [...(start > 0 ? ['-ss', String(start)] : []), ...(end !== null ? ['-to', String(end)] : []), '-i', input, '-vf', vf, '-loop', '0', output]
}

export type Squeeze = { height: number; crf: number } | { height: number; targetMB: number; duration: number }

const AUDIO_KBPS = 96

/** Video bitrate (kbps) that lands near `targetMB` for `duration` seconds, or null when the target is too small to look like anything. */
export function targetKbps(targetMB: number, duration: number) {
  const kbps = Math.floor((targetMB * 8 * 1024) / duration) - AUDIO_KBPS
  return kbps >= 100 ? kbps : null
}

/** H.264 + AAC MP4, with the shorter side capped at `height` (0 keeps it), at a quality (CRF) or aimed at a size. */
export function compressArgs(input: string, output: string, s: Squeeze): string[] {
  const short = (side: string) => `trunc(min(${s.height},${side})/2)*2`
  const cap = s.height ? `'if(gt(iw,ih),-2,${short('iw')})':'if(gt(iw,ih),${short('ih')},-2)'` : 'trunc(iw/2)*2:trunc(ih/2)*2'
  let rate: string[]
  if ('crf' in s) rate = ['-crf', String(s.crf)]
  else {
    const k = targetKbps(s.targetMB, s.duration)
    if (k === null) throw new Error(`That size is too small for a video this long. Try at least ${Math.ceil(((100 + AUDIO_KBPS) * s.duration) / 8192)} MB.`)
    rate = ['-b:v', `${k}k`, '-maxrate', `${Math.round(k * 1.5)}k`, '-bufsize', `${k * 2}k`]
  }
  return ['-i', input, '-map', '0:v:0', '-map', '0:a:0?', '-sn', '-dn', '-vf', `scale=${cap}`, '-c:v', 'libx264', '-preset', 'veryfast', ...rate, '-pix_fmt', 'yuv420p', ...AAC(AUDIO_KBPS), ...FASTSTART('mp4'), output]
}
