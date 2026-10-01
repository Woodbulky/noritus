/// <reference lib="webworker" />
import { buffers } from '../../lib/transfer'
import { convert, type Target } from './convert'

self.onmessage = ({ data }: MessageEvent<{ bytes: Uint8Array; name: string; to: Target; base: string }>) => {
  try {
    const out = convert(data.bytes, data.name, data.to, data.base)
    self.postMessage({ type: 'done', out }, buffers(out))
  } catch (e) {
    self.postMessage({ type: 'error', message: e instanceof Error ? e.message : 'This file couldn’t be converted.' })
  }
}
