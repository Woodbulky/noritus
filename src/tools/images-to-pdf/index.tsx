import { useState } from 'react'
import { Dropzone, FileRows, Room, RunPanel, Segmented } from '../../components/Tool'
import { useJob } from '../../components/useJob'
import { outName, pages, pdfBlob } from '../../lib/files'
import type { PageSize } from '../../lib/pdfOps'
import { readInput, runPdf } from '../../lib/runPdf'

const FAQ: [string, string][] = [
  ['Which images work?', 'JPG and PNG go in untouched, at full quality. WebP, GIF and other formats your browser can open are converted to PNG first.'],
  ['Will my phone photos be sideways?', 'No. The rotation your camera saved is respected, so photos come out the right way up.'],
  ['What does “Fit image” do?', 'Each page takes the exact size of its image, with no margins. A4 and Letter scale each image to fit the page, which turns to match the photo.'],
  ['Are my photos uploaded?', 'No. The PDF is built inside this browser tab. Your photos never leave your device.'],
]

export default function ImagesToPdf() {
  const [files, setFiles] = useState<File[]>([])
  const [size, setSize] = useState<PageSize>('a4')
  const [margin, setMargin] = useState(24)
  const job = useJob(files, size, margin)

  const run = () =>
    job.run(async (progress, signal) => {
      const images = await Promise.all(files.map(readInput))
      const bytes = await runPdf('imagesToPdf', { images, size, margin }, progress, signal)
      return { blob: pdfBlob(bytes), name: files.length === 1 ? outName(files[0].name, '', 'pdf') : 'images.pdf', note: pages(files.length) }
    })

  return (
    <Room slug="images-to-pdf" faq={FAQ}>
      <div className="workbench">
        <div className="file-area">
          <Dropzone accept="image/*,.jpg,.jpeg,.png,.webp,.gif" multiple what="images (JPG, PNG, WebP)" onFiles={(f) => setFiles([...files, ...f])} />
          <FileRows files={files} onChange={setFiles} reorder />
        </div>
        <div className="options">
          <h3>The finishing touches</h3>
          <Segmented
            label="Page size"
            value={size}
            onChange={setSize}
            options={[
              ['a4', 'A4'],
              ['letter', 'Letter'],
              ['fit', 'Fit image'],
            ]}
          />
          {size !== 'fit' && (
            <Segmented
              label="Margin"
              value={margin}
              onChange={setMargin}
              options={[
                [0, 'None'],
                [24, 'Small'],
                [56, 'Large'],
              ]}
            />
          )}
          <p>One image per page, in the order shown.</p>
          <RunPanel job={job} label="Make PDF" disabled={!files.length} onRun={run} />
        </div>
      </div>
    </Room>
  )
}
