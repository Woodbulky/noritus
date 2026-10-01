import { useEffect, useRef, useState } from 'react'
import { CopyButton, Dropzone, Room, Segmented } from '../../components/Tool'
import { IMAGE_ACCEPT } from '../../lib/image'

const FAQ: [string, string][] = [
  ['Which codes can it read?', 'QR codes and the common barcodes: EAN and UPC on products, Code 128, Code 39, Data Matrix, PDF417, Aztec and more, depending on your browser.'],
  ['Which browsers work?', 'Chrome and Edge on Android, Windows and Mac, and Samsung Internet. Firefox and Safari don’t have the built-in scanner yet.'],
  ['Does it open links by itself?', 'No. You see what the code says first, and choose whether to open a link.'],
  ['Is my camera or photo sent anywhere?', 'No. Codes are read inside this browser tab. The camera picture never leaves your device.'],
]

type Detected = { format: string; rawValue: string }
type Detector = { detect: (src: ImageBitmapSource) => Promise<Detected[]> }
declare const BarcodeDetector: { new (): Detector } | undefined

const supported = typeof BarcodeDetector !== 'undefined'
const nice = (f: string) => f.replace(/_/g, ' ').toUpperCase().replace('QR CODE', 'QR code')

export default function BarcodeScanner() {
  const [mode, setMode] = useState<'photo' | 'camera'>('photo')
  const [found, setFound] = useState<Detected[]>([])
  const [note, setNote] = useState('')
  const video = useRef<HTMLVideoElement>(null)

  const add = (codes: Detected[]) =>
    setFound((prev) => {
      const fresh = codes.filter((c) => !prev.some((p) => p.rawValue === c.rawValue && p.format === c.format))
      return fresh.length ? [...fresh, ...prev] : prev
    })

  const scanFiles = async (files: File[]) => {
    setNote('')
    const det = new BarcodeDetector!()
    let any = false
    for (const f of files) {
      try {
        const codes = await det.detect(await createImageBitmap(f))
        any ||= codes.length > 0
        add(codes)
      } catch {
        setNote(`“${f.name}” couldn’t be opened as an image.`)
      }
    }
    if (!any) setNote('No code found. Try a sharper, closer photo with the whole code in view.')
  }

  useEffect(() => {
    if (mode !== 'camera' || !supported) return
    let stream: MediaStream | null = null
    let timer = 0
    let live = true
    const det = new BarcodeDetector!()
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then(async (s) => {
        if (!live) return s.getTracks().forEach((t) => t.stop())
        stream = s
        video.current!.srcObject = s
        await video.current!.play()
        const tick = async () => {
          if (!live) return
          if (video.current!.readyState >= 2) add(await det.detect(video.current!).catch(() => []))
          timer = window.setTimeout(tick, 300)
        }
        void tick()
      })
      .catch(() => setNote('The camera couldn’t be opened. Allow camera access for this site, or scan a photo instead.'))
    return () => {
      live = false
      clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [mode])

  return (
    <Room slug="barcode-scanner" faq={FAQ}>
      <div className="workbench">
        <div className="file-area">
          {!supported ? (
            <p className="workspace-note">This browser doesn’t have a built-in code scanner yet. Open this page in Chrome or Edge to scan QR codes and barcodes.</p>
          ) : (
            <>
              <Segmented
                label="Scan from"
                value={mode}
                onChange={(m) => {
                  setMode(m)
                  setNote('')
                }}
                options={[
                  ['photo', 'A photo'],
                  ['camera', 'The camera'],
                ]}
              />
              {mode === 'photo' ? <Dropzone accept={IMAGE_ACCEPT} multiple what="photos or screenshots of codes" onFiles={scanFiles} /> : <video ref={video} className="scan-video" muted playsInline aria-label="Camera view. Hold a code in front of the camera." />}
            </>
          )}
          <div className="feedback" role="status">
            {note}
          </div>
        </div>
        <div className="options">
          <h3>What it says</h3>
          {found.length ? (
            <div className="kv" style={{ gridTemplateColumns: '1fr auto', marginTop: 0 }}>
              {found.map((c, i) => (
                <div key={i} style={{ display: 'contents' }}>
                  <div>
                    <b className="option-label">{nice(c.format)}</b>
                    <code>{c.rawValue}</code>
                    {/^https?:\/\//i.test(c.rawValue) && (
                      <div>
                        <a className="text-link" href={c.rawValue} target="_blank" rel="noopener noreferrer">
                          Open link ↗
                        </a>
                      </div>
                    )}
                  </div>
                  <CopyButton text={c.rawValue} />
                </div>
              ))}
            </div>
          ) : (
            <p>{mode === 'camera' ? 'Hold a code steady in front of the camera.' : 'Drop a photo or screenshot of a QR code or barcode.'}</p>
          )}
          {found.length > 0 && (
            <button className="text-link" onClick={() => setFound([])}>
              Clear the list
            </button>
          )}
          <p className="stay-note">Read in this tab. Nothing is sent anywhere.</p>
        </div>
      </div>
    </Room>
  )
}
