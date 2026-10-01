import type * as Ops from './pdfOps'
import { buffers } from './transfer'

type OpName = keyof typeof Ops
type Arg<K extends OpName> = Parameters<(typeof Ops)[K]>[0]
type Out<K extends OpName> = Awaited<ReturnType<(typeof Ops)[K]>>

/**
 * Runs one pdfOps function in a fresh module worker. Input buffers are
 * transferred (so re-read files for the next run). Aborting terminates the
 * worker and rejects with an AbortError.
 */
export function runPdf<K extends OpName>(op: K, arg: Arg<K>, onProgress?: (fraction: number | null) => void, signal?: AbortSignal) {
  return new Promise<Out<K>>((resolve, reject) => {
    const worker = new Worker(new URL('./pdf.worker.ts', import.meta.url), { type: 'module' })
    const end = () => {
      worker.terminate()
      signal?.removeEventListener('abort', abort)
    }
    const abort = () => {
      end()
      reject(new DOMException('Cancelled', 'AbortError'))
    }
    if (signal?.aborted) return abort()
    signal?.addEventListener('abort', abort)
    worker.onmessage = ({ data: m }) => {
      if (m.type === 'progress') return onProgress?.(m.done / m.total)
      end()
      if (m.type === 'done') resolve(m.out)
      else reject(new Error(m.message))
    }
    worker.onerror = () => {
      end()
      reject(new Error('Something went wrong while working on your file. Try again, or reload the page.'))
    }
    worker.postMessage({ op, arg }, buffers(arg))
    onProgress?.(null) // the input is read; the work has started
  })
}

/** Reads files into the `{ name, bytes }` shape the ops take. */
export const readInput = async (file: File) => ({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) })
