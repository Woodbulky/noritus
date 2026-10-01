import { stem } from './files'
import { EXT, isHeic, isSvg, type ImageJob, type ImageOut, type OutType } from './image'
import { sanitizeFilename, uniqueStems } from './sanitize'
import { buildZip } from './zip'

/** Runs one image job in a fresh module worker. Aborting terminates it and rejects with an AbortError. */
export function runImage(job: ImageJob, signal?: AbortSignal) {
  return new Promise<ImageOut>((resolve, reject) => {
    const worker = new Worker(new URL('./image.worker.ts', import.meta.url), { type: 'module' })
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
      reject(new Error('Something went wrong while working on your image. Try again, or reload the page.'))
    }
    worker.postMessage(job)
  })
}

/**
 * The source as the worker wants it. Workers can't decode SVG, so SVG is drawn
 * here first, with its long side at least `min` px.
 */
export async function source(file: File, min = 1024): Promise<Pick<ImageJob, 'file' | 'name' | 'heic'>> {
  if (!isSvg(file)) return { file, name: file.name, heic: isHeic(file) }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode().catch(() => {
      throw new Error(`“${file.name}” couldn’t be opened. It may be damaged.`)
    })
    const w = img.naturalWidth || 512
    const h = img.naturalHeight || 512
    // ponytail: SVGs are rasterised once at ≥1024 px (max 4096); a per-output render would be sharper for huge exports.
    const k = Math.min(4096 / Math.max(w, h), Math.max(1, min / Math.max(w, h)))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(w * k)
    canvas.height = Math.round(h * k)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    const png = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/png'))
    if (!png) throw new Error(`“${file.name}” is too large to draw.`)
    return { file: png, name: file.name }
  } finally {
    URL.revokeObjectURL(url)
  }
}

const probes = new Map<OutType, Promise<boolean>>()
/** Whether this browser can write `type` (AVIF is the one that varies). */
export function canEncode(type: OutType) {
  let p = probes.get(type)
  if (!p) {
    p = new OffscreenCanvas(1, 1)
      .convertToBlob({ type })
      .then((b) => b.type === type)
      .catch(() => false)
    probes.set(type, p)
  }
  return p
}

export type Converted = { name: string; blob: Blob; width: number; height: number; from: File }

/**
 * Runs every file through the worker, one at a time. Output names keep the
 * input's name (sanitised, made unique) plus `suffix`.
 */
export async function convertAll(files: File[], jobFor: (f: File) => Omit<ImageJob, 'file' | 'name' | 'heic'>, suffix: string, progress: (fraction: number) => void, signal: AbortSignal) {
  const jobs = files.map(jobFor)
  const stems = uniqueStems(files.map((f) => sanitizeFilename(stem(f.name), 'image') + suffix))
  const out: Converted[] = []
  for (const [i, f] of files.entries()) {
    const r = await runImage({ ...(await source(f)), ...jobs[i] }, signal)
    out.push({ ...r, name: `${stems[i]}.${EXT[jobs[i].type]}`, from: f })
    progress((i + 1) / files.length)
  }
  return out
}

/** One output → itself; many → a ZIP named `zipName`. */
export async function pack(items: { name: string; blob: Blob }[], zipName: string) {
  if (items.length === 1) return items[0]
  const entries = await Promise.all(items.map(async (i) => ({ name: i.name, bytes: new Uint8Array(await i.blob.arrayBuffer()) })))
  return { name: zipName, blob: await buildZip(entries) }
}
