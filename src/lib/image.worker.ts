/// <reference lib="webworker" />
import { LABEL, plan, type ImageJob } from './image'

/** An error whose message is already plain words for the user. */
class Plain extends Error {}

/** Native decode first (EXIF rotation applied); HEIC falls back to libheif, loaded only when needed. */
async function decode(file: Blob, heic?: boolean): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch (e) {
    if (!heic) throw e
  }
  const { default: libheif } = await import('libheif-js/libheif-wasm/libheif-bundle.mjs')
  const [img] = new (libheif().HeifDecoder)().decode(new Uint8Array(await file.arrayBuffer()))
  if (!img) throw new Error('not HEIC')
  const data = new ImageData(img.get_width(), img.get_height())
  await new Promise((ok, fail) => img.display(data, (d) => (d ? ok(d) : fail(new Error('HEIC decode')))))
  return createImageBitmap(data)
}

self.onmessage = async ({ data: j }: MessageEvent<ImageJob>) => {
  try {
    let bmp = await decode(j.file, j.heic).catch(() => {
      throw new Plain(`“${j.name}” couldn’t be opened. It may be damaged, or in a format this browser can’t read.`)
    })
    if (j.crop) bmp = await createImageBitmap(bmp, j.crop.x, j.crop.y, j.crop.w, j.crop.h)
    const p = plan(bmp.width, bmp.height, j.fit)
    const canvas = new OffscreenCanvas(p.width, p.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Plain('This image is too large for your browser to work with. Try a smaller size.')
    const bg = j.background ?? (j.type === 'image/jpeg' ? '#ffffff' : '')
    if (bg) {
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, p.width, p.height)
    }
    // Let the browser do big reductions (smoother than one drawImage step); fall back to drawImage scaling.
    const { src, dst } = p
    const resized =
      src.w !== dst.w || src.h !== dst.h
        ? await createImageBitmap(bmp, src.x, src.y, src.w, src.h, { resizeWidth: dst.w, resizeHeight: dst.h, resizeQuality: 'high' }).catch(() => null)
        : null
    ctx.imageSmoothingQuality = 'high'
    if (resized && resized.width === dst.w && resized.height === dst.h) ctx.drawImage(resized, dst.x, dst.y)
    else ctx.drawImage(bmp, src.x, src.y, src.w, src.h, dst.x, dst.y, dst.w, dst.h)
    const blob = await canvas.convertToBlob({ type: j.type, quality: j.quality }).catch(() => {
      throw new Plain('This image is too large for your browser to work with. Try a smaller size.')
    })
    if (blob.type !== j.type) throw new Plain(`This browser can’t save ${LABEL[j.type]} images. Try another format.`)
    self.postMessage({ type: 'done', out: { blob, width: p.width, height: p.height } })
  } catch (e) {
    self.postMessage({ type: 'error', message: e instanceof Plain ? e.message : `Something went wrong while working on “${j.name}”. Try again, or a smaller image.` })
  }
}
