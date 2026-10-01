/// <reference lib="webworker" />
import { CancelledError, createRenderer, type FieldSpec, type Row, type TemplateSpec } from '../lib/generatePdf'
import { buildZip, type ZipEntry } from '../../../lib/zip'
import type { QrStyle } from '../lib/verify'

export type GenerateRequest = {
  kind: 'generate'
  id: number
  mode: 'zip' | 'combined' | 'single'
  rows: Row[]
  /** Final file stems, already patterned and de-duplicated on the main thread. */
  stems: string[]
  template: TemplateSpec
  name: FieldSpec
  second?: FieldSpec
  qr?: QrStyle
  verifyLink?: string
  /** Rides along in the ZIP so the batch ships with its own verification list. */
  verifyCsv?: string
  /** Changes whenever the template, fonts or styles change — cache key. */
  cacheKey: string
}

export type CancelRequest = { kind: 'cancel'; id: number }

export type GenerateResponse =
  | { id: number; type: 'progress'; done: number; total: number }
  | { id: number; type: 'done'; blob: Blob; filename: string }
  | { id: number; type: 'cancelled' }
  | { id: number; type: 'error'; message: string }

/** Re-embedding the template costs more than every name put together. */
let cached: { key: string; renderer: ReturnType<typeof createRenderer> } | null = null
let cancelledId: number | null = null

function rendererFor(req: GenerateRequest) {
  if (cached?.key !== req.cacheKey) {
    cached = {
      key: req.cacheKey,
      renderer: createRenderer({
        template: req.template,
        name: req.name,
        second: req.second,
        qr: req.qr,
        verifyLink: req.verifyLink,
      }),
    }
  }
  return cached.renderer
}

const post = (r: GenerateResponse) => self.postMessage(r)

const pdfBlob = (bytes: Uint8Array) =>
  new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/pdf' })

self.onmessage = async (e: MessageEvent<GenerateRequest | CancelRequest>) => {
  if (e.data.kind === 'cancel') {
    cancelledId = e.data.id
    return
  }

  const req = e.data
  const cancelled = () => cancelledId === req.id
  try {
    const renderer = rendererFor(req)
    const total = req.rows.length

    if (req.mode === 'single') {
      const bytes = await renderer.renderOne(req.rows[0])
      post({ id: req.id, type: 'done', blob: pdfBlob(bytes), filename: `${req.stems[0]}.pdf` })
      return
    }

    if (req.mode === 'combined') {
      let last = 0
      // Throttle chatter; 1000 posts would cost more than the work itself.
      const stride = Math.max(1, Math.floor(total / 100))
      const bytes = await renderer.renderCombined(
        req.rows,
        (done) => {
          if (done === total || done - last >= stride) {
            last = done
            post({ id: req.id, type: 'progress', done, total })
          }
        },
        cancelled,
      )
      post({
        id: req.id,
        type: 'done',
        blob: pdfBlob(bytes),
        filename: 'certificates_all.pdf',
      })
      return
    }

    const entries: ZipEntry[] = []
    for (let i = 0; i < total; i++) {
      if (cancelled()) {
        post({ id: req.id, type: 'cancelled' })
        return
      }
      entries.push({ name: `${req.stems[i]}.pdf`, bytes: await renderer.renderOne(req.rows[i]) })
      post({ id: req.id, type: 'progress', done: i + 1, total })
    }
    if (req.verifyCsv) {
      entries.push({ name: 'verify.csv', bytes: new TextEncoder().encode(req.verifyCsv) })
    }
    post({
      id: req.id,
      type: 'done',
      blob: await buildZip(entries),
      filename: 'certificates.zip',
    })
  } catch (err) {
    if (err instanceof CancelledError || cancelled()) {
      post({ id: req.id, type: 'cancelled' })
      return
    }
    post({ id: req.id, type: 'error', message: err instanceof Error ? err.message : String(err) })
  }
}
