import * as pdfjs from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc

export type PdfDoc = pdfjs.PDFDocumentProxy

/** Opens a PDF for previews and rasterising. Errors are plain words. */
export async function openPdf(file: File): Promise<PdfDoc> {
  const data = new Uint8Array(await file.arrayBuffer())
  // wasm decoders (JBIG2 / JPEG 2000 scans) are copied to /pdfjs by vite.config.ts.
  const task = pdfjs.getDocument({ data, wasmUrl: '/pdfjs/wasm/' })
  try {
    return await task.promise
  } catch (e) {
    if ((e as Error)?.name === 'PasswordException') throw new Error(`“${file.name}” is password-protected. Unlock it first, then try again.`)
    throw new Error(`“${file.name}” could not be opened. It may be damaged, or not a PDF.`)
  }
}

/** Renders page `n` (1-based) on a white canvas at `scale` (1 = 72 DPI), capped at ~16 MP so every browser can hold it. */
export async function renderPage(doc: PdfDoc, n: number, scale: number) {
  const page = await doc.getPage(n)
  const base = page.getViewport({ scale: 1 })
  const viewport = page.getViewport({ scale: Math.min(scale, Math.sqrt(16e6 / (base.width * base.height))) })
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(viewport.width))
  canvas.height = Math.max(1, Math.round(viewport.height))
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  // 'print' intent: the 'display' intent paces slices with requestAnimationFrame,
  // which stops in background tabs. ENABLE draws form fields and annotations
  // into the canvas (display mode leaves them to an HTML layer we don't have).
  const task = page.render({ canvas, canvasContext: ctx, viewport, intent: 'print', annotationMode: pdfjs.AnnotationMode.ENABLE })
  // Print slices run back to back as microtasks; a MessageChannel tick between them keeps the UI responsive.
  task.onContinue = (next: () => void) => {
    const ch = new MessageChannel()
    ch.port1.onmessage = () => next()
    ch.port2.postMessage(0)
  }
  await task.promise
  page.cleanup()
  return canvas
}

/** A small JPEG data URL of page `n`, about `width` px wide. */
export async function thumbnail(doc: PdfDoc, n: number, width = 180) {
  const page = await doc.getPage(n)
  const canvas = await renderPage(doc, n, width / page.getViewport({ scale: 1 }).width)
  return canvas.toDataURL('image/jpeg', 0.75)
}
