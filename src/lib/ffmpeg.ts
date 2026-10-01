import { FFFSType, FFmpeg } from '@ffmpeg/ffmpeg'
import { logTime, parseInfo, type MediaInfo } from './media'

/**
 * ffmpeg.wasm, single-thread core. The ~31 MB wasm is over Cloudflare's 25 MiB
 * asset limit, so the engine (never the user's files) comes from jsDelivr at
 * an exact pinned version. Keep this version in sync with PRIVACY.md.
 */
const CORE = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core'
const WASM_BYTES = 32_129_114 // fallback when the CDN sends no Content-Length

export type EngineState = { kind: 'idle' } | { kind: 'loading'; progress: number } | { kind: 'ready' } | { kind: 'error'; message: string }

let state: EngineState = { kind: 'idle' }
const listeners = new Set<() => void>()
const setState = (s: EngineState) => {
  state = s
  listeners.forEach((l) => l())
}
export const engineState = () => state
export const onEngine = (l: () => void) => (listeners.add(l), () => void listeners.delete(l))

async function blobURL(url: string, type: string, onBytes?: (got: number, total: number) => void) {
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
  const total = +(res.headers.get('content-length') ?? 0) || WASM_BYTES
  const chunks: Uint8Array[] = []
  let got = 0
  for (const reader = res.body.getReader(); ; ) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    onBytes?.((got += value.length), total)
  }
  return URL.createObjectURL(new Blob(chunks as BlobPart[], { type }))
}

let urls: Promise<{ coreURL: string; wasmURL: string }> | null = null

/** Starts the one-time engine download (the HTTP cache makes later visits instant). Safe to call often; call it when a file is dropped. */
export function warmEngine() {
  urls ??= (async () => {
    setState({ kind: 'loading', progress: 0 })
    const [coreURL, wasmURL] = await Promise.all([
      blobURL(`${CORE}.js`, 'text/javascript'),
      blobURL(`${CORE}.wasm`, 'application/wasm', (got, total) => setState({ kind: 'loading', progress: Math.min(got / total, 1) })),
    ])
    setState({ kind: 'ready' })
    return { coreURL, wasmURL }
  })().catch(() => {
    urls = null
    const message = navigator.onLine ? 'The media engine could not be downloaded. Check your connection and try again.' : 'You’re offline. The media engine needs to download once before it works offline.'
    setState({ kind: 'error', message })
    throw new Error(message)
  })
  return urls
}

let instance: Promise<FFmpeg> | null = null

/** An error whose message is already plain words for the user. */
class Plain extends Error {}

function engine() {
  instance ??= (async () => {
    const ff = new FFmpeg()
    await ff.load(await warmEngine())
    return ff
  })().catch((e) => {
    instance = null
    throw e
  })
  return instance
}

const TOO_BIG = 'The engine ran out of memory. Try a shorter clip or a smaller file.'

export type Plan = {
  /** Output path inside ffmpeg's memory, e.g. '/out.mp4'. */
  output: string
  /** Argument lists tried in order until one succeeds (e.g. a fast stream copy, then a re-encode). */
  attempts: string[][]
  /** Expected output length in seconds, for the progress bar. Defaults to the input's duration. */
  seconds?: number | null
}

/**
 * Probes `file`, asks `plan` for the ffmpeg arguments, runs them, and returns
 * the output bytes. The file is mounted read-only (WORKERFS), not copied into
 * wasm memory. Aborting kills the engine; the next run restarts it.
 */
export async function runMedia(file: File, plan: (input: string, info: MediaInfo) => Plan, progress: (fraction: number) => void, signal: AbortSignal): Promise<Uint8Array> {
  const ff = await engine()
  const kill = () => {
    ff.terminate()
    instance = null
  }
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError')
  signal.addEventListener('abort', kill)

  let log = ''
  const onLog = ({ message }: { message: string }) => {
    log += message + '\n'
    const t = logTime(message)
    if (t !== null && seconds) progress(Math.min(t / seconds, 1))
  }
  let seconds: number | null | undefined = null
  ff.on('log', onLog)
  const ext = file.name.toLowerCase().match(/\.[a-z0-9]{1,5}$/)?.[0] ?? ''
  const input = `/in/input${ext}`
  let output = ''
  try {
    await ff.createDir('/in')
    await ff.mount(FFFSType.WORKERFS, { blobs: [{ name: `input${ext}`, data: file }] }, '/in')
    await ff.exec(['-hide_banner', '-i', input]) // no output given: ffmpeg just prints what it found
    const info = parseInfo(log)
    if (!info.video && !info.audio) throw new Plain(`“${file.name}” doesn’t look like audio or video, or it may be damaged.`)
    let p: Plan
    try {
      p = plan(input, info)
    } catch (e) {
      throw new Plain((e as Error).message)
    }
    output = p.output
    seconds = p.seconds === undefined ? info.duration : p.seconds
    for (const args of p.attempts) {
      log = ''
      if ((await ff.exec(['-hide_banner', '-y', ...args])) === 0) return (await ff.readFile(output)) as Uint8Array
      await ff.deleteFile(output).catch(() => {})
    }
    if (/Cannot allocate memory|Out of memory/i.test(log)) throw new Plain(TOO_BIG)
    throw new Plain(`“${file.name}” could not be processed. It may be damaged, or use a format the engine doesn’t support.`)
  } catch (e) {
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError')
    if (e instanceof Plain) throw e
    kill() // the wasm crashed (usually out of memory); start fresh next time
    throw new Error(TOO_BIG)
  } finally {
    signal.removeEventListener('abort', kill)
    if (instance) {
      ff.off('log', onLog)
      await ff.deleteFile(output).catch(() => {})
      await ff.unmount('/in').catch(() => {})
      await ff.deleteDir('/in').catch(() => {})
    }
  }
}
