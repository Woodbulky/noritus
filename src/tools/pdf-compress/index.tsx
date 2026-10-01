import { useState } from 'react'
import { Dropzone, FileRows, Room, RunPanel, Segmented } from '../../components/Tool'
import { useJob } from '../../components/useJob'
import { formatBytes, outName, pdfBlob } from '../../lib/files'
import type { CompressLevel } from '../../lib/pdfOps'
import { readInput, runPdf } from '../../lib/runPdf'

const FAQ: [string, string][] = [
  ['How much smaller will it get?', 'It depends on what is inside. PDFs full of photos or scans shrink the most. A PDF that is mostly text is often already small and may barely change.'],
  ['Does it lower the quality?', '“Lossless” changes nothing you can see. “Balanced” and “Strong” re-save photos at a lower resolution and quality; text and drawings stay sharp.'],
  ['Why did my file not shrink?', 'Some PDFs are already well packed, or keep their images in a form this tool leaves alone. In that case you get the original size back, never a bigger file.'],
  ['Is my PDF uploaded?', 'No. It is compressed inside this browser tab and never leaves your device.'],
]

export default function PdfCompress() {
  const [file, setFile] = useState<File | null>(null)
  const [level, setLevel] = useState<CompressLevel>('balanced')
  const job = useJob(file, level)

  const run = () =>
    job.run(async (progress, signal) => {
      const bytes = await runPdf('compress', { file: await readInput(file!), level }, progress, signal)
      const smaller = bytes.length < file!.size
      const saved = Math.round((1 - bytes.length / file!.size) * 100)
      return {
        blob: smaller ? pdfBlob(bytes) : file!,
        name: outName(file!.name, '-compressed', 'pdf'),
        note: smaller ? `${saved}% smaller than ${formatBytes(file!.size)}` : 'already as small as it gets here',
      }
    })

  return (
    <Room slug="pdf-compress" faq={FAQ}>
      <div className="workbench">
        <div className="file-area">
          <Dropzone accept=".pdf,application/pdf" what="a PDF" onFiles={([f]) => setFile(f)} />
          <FileRows files={file ? [file] : []} onChange={() => setFile(null)} />
        </div>
        <div className="options">
          <h3>The finishing touches</h3>
          <Segmented
            label="Compression"
            value={level}
            onChange={setLevel}
            options={[
              ['lossless', 'Lossless'],
              ['balanced', 'Balanced'],
              ['strong', 'Strong'],
            ]}
          />
          <p>
            {level === 'lossless'
              ? 'Packs the file’s structure. Nothing you can see changes.'
              : level === 'balanced'
                ? 'Photos are re-saved at up to 2000 px. Good for sharing and printing.'
                : 'Photos are re-saved at up to 1400 px with more compression. Best for email.'}
          </p>
          <RunPanel job={job} label="Compress PDF" disabled={!file} onRun={run} />
        </div>
      </div>
    </Room>
  )
}
