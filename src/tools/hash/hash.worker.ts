/// <reference lib="webworker" />
import { md5 } from './md5'

export type Algo = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')

self.onmessage = async ({ data }: MessageEvent<{ blob: Blob; algos: Algo[] }>) => {
  try {
    const bytes = new Uint8Array(await data.blob.arrayBuffer())
    const out: Partial<Record<Algo, string>> = {}
    for (const a of data.algos) out[a] = a === 'MD5' ? md5(bytes) : hex(await crypto.subtle.digest(a, bytes))
    self.postMessage({ type: 'done', out })
  } catch {
    self.postMessage({ type: 'error', message: 'This file couldn’t be read. It may be too large for this browser’s memory.' })
  }
}
