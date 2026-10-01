import { useMemo, useState } from 'react'
import { CopyButton, Field, Room, Segmented } from '../../components/Tool'
import { download, formatBytes } from '../../lib/files'
import { fromBase64, toBase64 } from './b64'

const FAQ: [string, string][] = [
  ['What is Base64?', 'A way to write any data, even a picture, using only letters, numbers, + and /. It is used in emails, data URLs and APIs. It is not encryption.'],
  ['What is URL-safe Base64?', 'The same thing with - and _ instead of + and /, and no = padding, so it can go in a web address. Decoding accepts both.'],
  ['Can I decode to a file?', 'Yes. If the result isn’t readable text, or you paste a data: URL, you get a Download button for the file instead.'],
  ['Is anything sent anywhere?', 'No. Encoding and decoding happen inside this browser tab.'],
]

const EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg', 'application/pdf': 'pdf', 'text/plain': 'txt', 'application/json': 'json' }

export default function Base64() {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode')
  const [input, setInput] = useState('')
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array; type: string } | null>(null)
  const [urlSafe, setUrlSafe] = useState(false)
  const [dataUrl, setDataUrl] = useState(false)

  const out = useMemo(() => {
    try {
      if (mode === 'encode') {
        const b64 = toBase64(file ? file.bytes : new TextEncoder().encode(input), urlSafe)
        return { text: dataUrl && file && !urlSafe ? `data:${file.type || 'application/octet-stream'};base64,${b64}` : b64 }
      }
      if (!input.trim()) return { text: '' }
      const { bytes, type } = fromBase64(input)
      try {
        if (type && !type.startsWith('text/')) throw 0
        return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), bytes, type }
      } catch {
        return { text: '', bytes, type }
      }
    } catch (e) {
      return { text: '', error: (e as Error).message }
    }
  }, [mode, input, file, urlSafe, dataUrl])

  return (
    <Room slug="base64" faq={FAQ}>
      <div className="workbench">
        <div className="file-area">
          <Segmented
            label="Direction"
            value={mode}
            onChange={(m) => {
              setMode(m)
              setFile(null)
              setInput(out.text && !out.error ? out.text : '')
            }}
            options={[
              ['encode', 'Encode'],
              ['decode', 'Decode'],
            ]}
          />
          {file ? (
            <p className="workspace-note">
              Encoding “{file.name}” ({formatBytes(file.bytes.length)}).{' '}
              <button className="text-link" onClick={() => setFile(null)}>
                Use text instead
              </button>
            </p>
          ) : (
            <Field label={mode === 'encode' ? 'Text to encode' : 'Base64 to decode'}>
              <textarea className="input mono" rows={8} value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} />
            </Field>
          )}
          {mode === 'encode' && !file && (
            <Field label="…or encode a file">
              <input
                className="input"
                type="file"
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  if (f) setFile({ name: f.name, type: f.type, bytes: new Uint8Array(await f.arrayBuffer()) })
                  e.target.value = ''
                }}
              />
            </Field>
          )}
          {out.error && (
            <p className="feedback" role="alert">
              {out.error}
            </p>
          )}
          <Field label="Result">
            <textarea className="input mono" rows={8} value={out.bytes && !out.text ? `${formatBytes(out.bytes.length)} of binary data${out.type ? ` (${out.type})` : ''}. Use Download to save it.` : out.text} readOnly />
          </Field>
        </div>
        <div className="options">
          <h3>The finishing touches</h3>
          {mode === 'encode' && (
            <>
              <label className="check">
                <input type="checkbox" checked={urlSafe} onChange={(e) => setUrlSafe(e.target.checked)} /> URL-safe (- and _, no padding)
              </label>
              {file && (
                <label className="check">
                  <input type="checkbox" checked={dataUrl} disabled={urlSafe} onChange={(e) => setDataUrl(e.target.checked)} /> As a data: URL
                </label>
              )}
            </>
          )}
          <div className="run">
            <CopyButton text={out.text} label="Copy result" className="btn btn-primary" />
            {mode === 'decode' && out.bytes && (
              <button className="btn btn-outline" onClick={() => download(new Blob([out.bytes as BlobPart], { type: out.type }), `decoded.${EXT[out.type ?? ''] ?? 'bin'}`)}>
                Download as a file
              </button>
            )}
            <p className="stay-note">Worked out in this tab. Nothing is sent anywhere.</p>
          </div>
        </div>
      </div>
    </Room>
  )
}
