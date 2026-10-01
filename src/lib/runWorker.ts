/**
 * Posts one message to a fresh module worker and resolves with its
 * `{ type: 'done', out }` reply. Aborting terminates the worker and rejects
 * with an AbortError; `{ type: 'error', message }` rejects with that message.
 */
export function runWorker<T>(worker: Worker, message: unknown, transfer: Transferable[] = [], signal?: AbortSignal) {
  return new Promise<T>((resolve, reject) => {
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
      end()
      if (m.type === 'done') resolve(m.out)
      else reject(new Error(m.message))
    }
    worker.onerror = () => {
      end()
      reject(new Error('Something went wrong while working on your file. Try again, or reload the page.'))
    }
    worker.postMessage(message, transfer)
  })
}
