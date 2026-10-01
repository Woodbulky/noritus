import { useCallback, useState } from 'react'
import { Dropzone, Field, FileRows, Room, RunPanel, Segmented } from '../../components/Tool'
import { useJob } from '../../components/useJob'
import { buildIco, isSvg } from '../../lib/image'
import { pack, runImage, source } from '../../lib/runImage'

const FAQ: [string, string][] = [
  ['What’s in the ZIP?', 'favicon.ico (16, 32 and 48 px), PNG icons for phones and home screens, a web manifest, and the lines to paste into your page’s <head>. An SVG logo is included as favicon.svg too.'],
  ['Which image works best?', 'A square SVG, or a PNG of at least 512 × 512 with a simple shape. Fine detail disappears at 16 px.'],
  ['Why does the Apple icon get a background?', 'iPhones fill transparent areas with black, so that icon always uses your background colour (white if you chose transparent).'],
  ['Is my logo uploaded?', 'No. Every icon is drawn inside this browser tab and never leaves your device.'],
]

const ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml,image/gif,image/avif,.png,.jpg,.jpeg,.webp,.svg,.gif,.avif'

const snippet = (svg: boolean) =>
  [
    ...(svg ? ['<link rel="icon" href="/favicon.svg" type="image/svg+xml">'] : []),
    '<link rel="icon" href="/favicon.ico" sizes="48x48">',
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
    '<link rel="manifest" href="/site.webmanifest">',
  ].join('\n')

const manifest = (background: string) =>
  JSON.stringify(
    {
      name: 'Your site name',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
      background_color: background,
      display: 'standalone',
    },
    null,
    2,
  )

const SIZES = [16, 32, 48, 180, 192, 512]

export default function FaviconGenerator() {
  const [file, setFile] = useState<File | null>(null)
  const [fit, setFit] = useState<'cover' | 'contain'>('contain')
  const [clear, setClear] = useState(true)
  const [color, setColor] = useState('#ffffff')
  const job = useJob(file, fit, clear, color)
  const svg = !!file && isSvg(file)

  // One object URL for every preview size, revoked when the file changes.
  const previews = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el || !file) return
      const url = URL.createObjectURL(file)
      el.querySelectorAll('img').forEach((img) => (img.src = url))
      return () => URL.revokeObjectURL(url)
    },
    [file],
  )

  const run = () =>
    job.run(async (progress, signal, stage) => {
      const src = await source(file!, 512)
      const png: Record<number, Uint8Array> = {}
      for (const [i, size] of SIZES.entries()) {
        // The Apple icon is never transparent: iOS would fill it with black.
        const background = clear ? (size === 180 ? '#ffffff' : undefined) : color
        const out = await runImage({ ...src, type: 'image/png', fit: { kind: fit, w: size, h: size }, background }, signal)
        png[size] = new Uint8Array(await out.blob.arrayBuffer())
        progress((i + 1) / SIZES.length)
      }
      stage('save')
      const blob = (part: Uint8Array | string, type: string) => new Blob([part as BlobPart], { type })
      const items = [
        { name: 'favicon.ico', blob: blob(buildIco([16, 32, 48].map((size) => ({ size, bytes: png[size] }))), 'image/x-icon') },
        { name: 'apple-touch-icon.png', blob: blob(png[180], 'image/png') },
        { name: 'icon-192.png', blob: blob(png[192], 'image/png') },
        { name: 'icon-512.png', blob: blob(png[512], 'image/png') },
        { name: 'site.webmanifest', blob: blob(manifest(clear ? '#ffffff' : color), 'application/manifest+json') },
        { name: 'head-snippet.html', blob: blob(snippet(svg) + '\n', 'text/html') },
        ...(svg ? [{ name: 'favicon.svg', blob: file as Blob }] : []),
      ]
      return { ...(await pack(items, 'favicon.zip')), note: `${items.length} files` }
    })

  return (
    <Room slug="favicon-generator" faq={FAQ}>
      <div className="workbench">
        <div className="file-area">
          {file ? <FileRows files={[file]} onChange={() => setFile(null)} /> : <Dropzone accept={ACCEPT} what="a logo (SVG, PNG, JPG)" onFiles={([f]) => setFile(f)} />}
          {file && (
            <div className="favicon-preview" role="img" aria-label="Preview at icon sizes" ref={previews}>
              {[16, 32, 64, 128].map((s) => (
                <figure key={s}>
                  <img alt="" width={s} height={s} style={{ objectFit: fit, background: clear ? undefined : color }} />
                  <figcaption>{s} px</figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>
        <div className="options">
          <h3>The finishing touches</h3>
          <Segmented
            label="Shape"
            value={fit}
            onChange={setFit}
            options={[
              ['contain', 'Fit whole logo'],
              ['cover', 'Fill the square'],
            ]}
          />
          <label className="check">
            <input type="checkbox" checked={clear} onChange={(e) => setClear(e.target.checked)} /> Transparent background
          </label>
          {!clear && (
            <Field label="Background colour">
              <input className="input" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
            </Field>
          )}
          <Field label="Paste into your page’s <head>">
            <textarea className="input snippet" readOnly rows={svg ? 4 : 3} value={snippet(svg)} onFocus={(e) => e.currentTarget.select()} />
          </Field>
          <RunPanel job={job} label="Make favicons" disabled={!file} onRun={run} />
        </div>
      </div>
    </Room>
  )
}
