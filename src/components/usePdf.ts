import { useEffect, useState } from 'react'
import { openPdf, type PdfDoc } from '../lib/pdfjs'

/** Opens `file` with pdf.js for previews; destroys it when the file changes. */
export function usePdf(file: File | null) {
  const [doc, setDoc] = useState<PdfDoc | null>(null)
  const [error, setError] = useState('')
  const [seen, setSeen] = useState(file)
  if (seen !== file) {
    setSeen(file)
    setDoc(null)
    setError('')
  }
  useEffect(() => {
    if (!file) return
    let live = true
    const task = openPdf(file)
    task.then(
      (d) => (live ? setDoc(d) : void d.loadingTask.destroy()),
      (e: Error) => live && setError(e.message),
    )
    return () => {
      live = false
      void task.then((d) => d.loadingTask.destroy(), () => {})
    }
  }, [file])
  return { doc, error }
}
