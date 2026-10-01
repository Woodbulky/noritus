import { useState } from 'react'
import { Dropzone, FileRows, Room, RunPanel } from '../../components/Tool'
import { useJob } from '../../components/useJob'
import { outName, pdfBlob } from '../../lib/files'
import { readInput, runPdf } from '../../lib/runPdf'

const FAQ: [string, string][] = [
  ['Are my PDFs uploaded?', 'No. They are merged inside this browser tab. Open your Network tab while you merge and you will see nothing go out.'],
  ['Can I change the order?', 'Yes. Use the arrows on each file. Pages are joined top to bottom.'],
  ['Is there a size or file limit?', 'Only your device’s memory. Hundreds of pages are fine on most computers.'],
  ['What about password-protected PDFs?', 'They can’t be merged until they are unlocked. Noritus will tell you which file is locked.'],
]

export default function PdfMerge() {
  const [files, setFiles] = useState<File[]>([])
  const job = useJob(files)

  const run = () =>
    job.run(async (progress, signal) => {
      const bytes = await runPdf('merge', { files: await Promise.all(files.map(readInput)) }, progress, signal)
      return { blob: pdfBlob(bytes), name: outName(files[0].name, '-merged', 'pdf'), note: `${files.length} files joined` }
    })

  return (
    <Room slug="pdf-merge" faq={FAQ}>
      <div className="workbench">
        <div className="file-area">
          <Dropzone accept=".pdf,application/pdf" multiple what="PDF files" onFiles={(f) => setFiles([...files, ...f])} />
          <FileRows files={files} onChange={setFiles} reorder />
        </div>
        <div className="options">
          <h3>The finishing touches</h3>
          <div>
            <span className="option-label">File order</span>
            <p>Pages are joined in the order shown. Use the arrows to move a file up or down.</p>
          </div>
          <RunPanel job={job} label="Merge PDFs" disabled={files.length < 2} onRun={run} />
        </div>
      </div>
    </Room>
  )
}
