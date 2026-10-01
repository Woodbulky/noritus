import * as pdfjs from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url'
import { formatBytes } from '../../../lib/files'

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc

export type TemplateKind = 'png' | 'jpg' | 'pdf'

/** Templates above this are refused rather than freezing the tab. */
export const MAX_TEMPLATE_BYTES = 25 * 1024 * 1024

/** Cap the preview raster so a huge template does not eat memory. */
const PREVIEW_MAX_WIDTH = 2000

export type Template = {
  kind: TemplateKind
  /** Original file bytes — never re-encoded, so output keeps full resolution. */
  bytes: Uint8Array
  /** Native size in points. Image pixels map 1:1 at 72 DPI. */
  width: number
  height: number
  /** Raster used for the on-screen preview only. */
  bitmap: ImageBitmap
  /** Small data URL for the file chip. */
  thumb: string
  fileName: string
  fileSize: number
}

export { formatBytes }

function thumbOf(bitmap: ImageBitmap) {
  const w = 108
  const h = Math.max(1, Math.round((w * bitmap.height) / bitmap.width))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.drawImage(bitmap, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', 0.8)
}

export async function loadTemplate(file: File): Promise<Template> {
  const ext = file.name.toLowerCase().match(/\.(png|jpe?g|pdf)$/)?.[1]
  if (!ext) {
    throw new Error(`"${file.name}" is not a template. Choose a PNG, JPG or PDF file.`)
  }
  if (file.size > MAX_TEMPLATE_BYTES) {
    throw new Error(
      `That template is ${formatBytes(file.size)}. The limit is ${formatBytes(
        MAX_TEMPLATE_BYTES,
      )} — export it at a lower quality or resolution.`,
    )
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  if (ext === 'pdf') return loadPdf(bytes, file)

  const kind: TemplateKind = ext === 'png' ? 'png' : 'jpg'
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(
      new Blob([bytes.slice().buffer as ArrayBuffer], { type: file.type || `image/${kind}` }),
    )
  } catch {
    throw new Error(`"${file.name}" could not be decoded. Try re-exporting it as a PNG or JPG.`)
  }
  return {
    kind,
    bytes,
    width: bitmap.width,
    height: bitmap.height,
    bitmap,
    thumb: thumbOf(bitmap),
    fileName: file.name,
    fileSize: file.size,
  }
}

async function loadPdf(bytes: Uint8Array, file: File): Promise<Template> {
  const task = pdfjs.getDocument({ data: bytes.slice() })
  let doc
  try {
    doc = await task.promise
  } catch {
    throw new Error(`"${file.name}" could not be opened. It may be encrypted or corrupt.`)
  }
  if (doc.numPages < 1) throw new Error(`"${file.name}" has no pages.`)

  const page = await doc.getPage(1)
  const base = page.getViewport({ scale: 1 })
  const viewport = page.getViewport({ scale: Math.min(2, PREVIEW_MAX_WIDTH / base.width) })

  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({ canvas, canvasContext: ctx, viewport }).promise
  await task.destroy()

  const bitmap = await createImageBitmap(canvas)
  return {
    kind: 'pdf',
    bytes,
    width: base.width,
    height: base.height,
    bitmap,
    thumb: thumbOf(bitmap),
    fileName: file.name,
    fileSize: file.size,
  }
}
