/// <reference lib="webworker" />
import * as ops from './pdfOps'
import { buffers } from './transfer'

self.onmessage = async ({ data }: MessageEvent<{ op: keyof typeof ops; arg: never }>) => {
  try {
    const out = await ops[data.op](data.arg, (done, total) => self.postMessage({ type: 'progress', done, total }))
    self.postMessage({ type: 'done', out }, buffers(out))
  } catch (e) {
    self.postMessage({ type: 'error', message: e instanceof Error ? e.message : 'Something went wrong while working on your file.' })
  }
}
