import { useRef, useState } from 'react'

type Props = {
  accept: string
  /** Bold first line, e.g. "Drop a PNG, JPG or PDF". */
  label: string
  hint?: string
  onFile: (file: File) => void
  disabled?: boolean
}

/** The mockup's dashed `.drop` panel, wired to a real file input + drag/drop. */
export default function Dropzone({
  accept,
  label,
  hint = 'or click to browse',
  onFile,
  disabled,
}: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        className={`drop${over ? ' over' : ''}`}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          const file = e.dataTransfer.files[0]
          if (file) onFile(file)
        }}
      >
        <strong>{label}</strong>
        <br />
        {hint}
      </button>
      <input
        ref={input}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
          // Allow re-picking the same file.
          e.target.value = ''
        }}
      />
    </>
  )
}
