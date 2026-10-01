import { useState } from 'react'
import { Dropzone, Field, FileRows, Room, RunPanel, Segmented } from '../../components/Tool'
import { useJob } from '../../components/useJob'
import { outName, pdfBlob } from '../../lib/files'
import { readInput, runPdf } from '../../lib/runPdf'

const FAQ: [string, string][] = [
  ['Can I use my logo?', 'Yes. Switch to “Image” and choose a PNG or JPG. A PNG with a transparent background looks best.'],
  ['Does the watermark go on every page?', 'Yes, centred on each page, and it stays upright on pages that are rotated.'],
  ['Can someone remove the watermark?', 'It is drawn into the page, so it can’t simply be switched off, but someone with a PDF editor could still delete it.'],
  ['Is my PDF uploaded?', 'No. The watermark is added inside this browser tab and the file never leaves your device.'],
]

export default function PdfWatermark() {
  const [file, setFile] = useState<File | null>(null)
  const [kind, setKind] = useState<'text' | 'image'>('text')
  const [text, setText] = useState('CONFIDENTIAL')
  const [image, setImage] = useState<File | null>(null)
  const [textSize, setTextSize] = useState(60)
  const [imageSize, setImageSize] = useState(0.5)
  const [opacity, setOpacity] = useState(0.25)
  const [angle, setAngle] = useState(45)
  const [color, setColor] = useState('#ce4b2c')
  const job = useJob(file, kind, text, image, textSize, imageSize, opacity, angle, color)

  const run = () =>
    job.run(async (progress, signal) => {
      const bytes = await runPdf(
        'watermark',
        {
          file: await readInput(file!),
          text,
          image: kind === 'image' ? await readInput(image!) : undefined,
          size: kind === 'image' ? imageSize : textSize,
          opacity,
          angle,
          color,
        },
        progress,
        signal,
      )
      return { blob: pdfBlob(bytes), name: outName(file!.name, '-watermarked', 'pdf') }
    })

  return (
    <Room slug="pdf-watermark" faq={FAQ}>
      <div className="workbench">
        <div className="file-area">
          <Dropzone accept=".pdf,application/pdf" what="a PDF" onFiles={([f]) => setFile(f)} />
          <FileRows files={file ? [file] : []} onChange={() => setFile(null)} />
        </div>
        <div className="options">
          <h3>The finishing touches</h3>
          <Segmented
            label="Watermark"
            value={kind}
            onChange={setKind}
            options={[
              ['text', 'Text'],
              ['image', 'Image'],
            ]}
          />
          {kind === 'text' ? (
            <>
              <Field label="Text">
                <input className="input" value={text} onChange={(e) => setText(e.target.value)} maxLength={80} />
              </Field>
              <div className="side-by-side">
                <Field label={`Size · ${textSize} pt`}>
                  <input type="range" min={12} max={140} value={textSize} onChange={(e) => setTextSize(+e.target.value)} />
                </Field>
                <Field label="Colour">
                  <input className="input" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
                </Field>
              </div>
            </>
          ) : (
            <>
              <Field label="Image (PNG or JPG)">
                <input className="input" type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
              </Field>
              <Field label={`Width · ${Math.round(imageSize * 100)}% of the page`}>
                <input type="range" min={0.1} max={1} step={0.05} value={imageSize} onChange={(e) => setImageSize(+e.target.value)} />
              </Field>
            </>
          )}
          <Field label={`Opacity · ${Math.round(opacity * 100)}%`}>
            <input type="range" min={0.05} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(+e.target.value)} />
          </Field>
          <Segmented
            label="Angle"
            value={angle}
            onChange={setAngle}
            options={[
              [0, 'Flat'],
              [45, 'Diagonal'],
              [90, 'Upright'],
            ]}
          />
          <RunPanel job={job} label="Add watermark" disabled={!file || (kind === 'text' ? !text.trim() : !image)} onRun={run} />
        </div>
      </div>
    </Room>
  )
}
