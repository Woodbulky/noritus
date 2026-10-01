import { useMemo, useState } from 'react'
import { CopyButton, Field, Room, Segmented } from '../../components/Tool'
import { download } from '../../lib/files'

const FAQ: [string, string][] = [
  ['What does it check?', 'That your text is valid JSON. If it isn’t, it tells you where the first problem is, with the line and column.'],
  ['What does “Sort keys” do?', 'Puts the keys of every object in A–Z order, which makes two JSON files much easier to compare.'],
  ['Can it handle big files?', 'Yes, files of several megabytes format in a moment. Very large ones may take a second or two.'],
  ['Is my JSON sent anywhere?', 'No. It is checked and formatted inside this browser tab, so API keys and private data stay with you.'],
]

type Indent = '2' | '4' | 'tab' | 'min'

const sortKeys = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(sortKeys) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys((v as Record<string, unknown>)[k])])) : v

/** Line and column for a parse error, from the position engines put in the message. */
function where(text: string, msg: string) {
  const lc = msg.match(/line (\d+) column (\d+)/)
  if (lc) return ` (line ${lc[1]}, column ${lc[2]})`
  const pos = msg.match(/position (\d+)/)
  if (!pos) return ''
  const before = text.slice(0, +pos[1]).split('\n')
  return ` (line ${before.length}, column ${before[before.length - 1].length + 1})`
}

export default function JsonFormatter() {
  const [input, setInput] = useState('')
  const [indent, setIndent] = useState<Indent>('2')
  const [sort, setSort] = useState(false)

  const out = useMemo(() => {
    if (!input.trim()) return { text: '' }
    try {
      const v = sort ? sortKeys(JSON.parse(input)) : JSON.parse(input)
      return { text: JSON.stringify(v, null, indent === 'min' ? undefined : indent === 'tab' ? '\t' : +indent) }
    } catch (e) {
      const msg = (e as Error).message
      return { text: '', error: `That isn’t valid JSON${where(input, msg)}: ${msg.replace(/^JSON\.parse: /, '')}` }
    }
  }, [input, indent, sort])

  return (
    <Room slug="json-formatter" faq={FAQ}>
      <div className="workbench">
        <div className="file-area">
          <Field label="Your JSON">
            <textarea className="input mono" rows={12} value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} placeholder='{"paste": "here"}' />
          </Field>
          <Field label="…or open a .json file">
            <input className="input" type="file" accept=".json,application/json,.txt" onChange={async (e) => (e.target.files?.[0] && setInput(await e.target.files[0].text()), (e.target.value = ''))} />
          </Field>
          {out.error ? (
            <p className="feedback" role="alert">
              {out.error}
            </p>
          ) : (
            out.text && (
              <Field label="Formatted · valid JSON ✓">
                <textarea className="input mono" rows={14} value={out.text} readOnly />
              </Field>
            )
          )}
        </div>
        <div className="options">
          <h3>The finishing touches</h3>
          <Segmented
            label="Indent"
            value={indent}
            onChange={setIndent}
            options={[
              ['2', '2 spaces'],
              ['4', '4 spaces'],
              ['tab', 'Tab'],
              ['min', 'Minify'],
            ]}
          />
          <label className="check">
            <input type="checkbox" checked={sort} onChange={(e) => setSort(e.target.checked)} /> Sort keys A–Z
          </label>
          <div className="run">
            <CopyButton text={out.text} label="Copy result" className="btn btn-primary" />
            <button className="btn btn-outline" disabled={!out.text} onClick={() => download(new Blob([out.text], { type: 'application/json' }), 'formatted.json')}>
              Download .json
            </button>
            <p className="stay-note">Checked in this tab. Nothing is sent anywhere.</p>
          </div>
        </div>
      </div>
    </Room>
  )
}
