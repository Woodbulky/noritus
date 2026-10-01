import { useDeferredValue, useMemo, useState } from 'react'
import { Field, Room } from '../../components/Tool'
import { diffLines } from './diff'

const FAQ: [string, string][] = [
  ['How do I read the result?', 'Lines only in the original are red with a minus; lines only in the changed text are green with a plus. Everything else is the same in both.'],
  ['Can it ignore small differences?', 'Yes. Ignore capital letters, or ignore spaces at the ends of lines and repeated spaces, so only real changes show.'],
  ['Can I compare files?', 'Yes. Open a text file on either side; any plain-text format works, including code, CSV and Markdown.'],
  ['Is my text sent anywhere?', 'No. Both texts are compared inside this browser tab.'],
]

function Side({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Field label={label}>
        <textarea className="input mono" rows={10} value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} />
      </Field>
      <input className="input" type="file" aria-label={`Open a text file as the ${label.toLowerCase()}`} onChange={async (e) => (e.target.files?.[0] && onChange(await e.target.files[0].text()), (e.target.value = ''))} />
    </div>
  )
}

export default function TextDiff() {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [noCase, setNoCase] = useState(false)
  const [noSpace, setNoSpace] = useState(false)
  const da = useDeferredValue(a)
  const db = useDeferredValue(b)

  const lines = useMemo(() => {
    if (!da && !db) return []
    const key = (s: string) => {
      const t = noSpace ? s.trim().replace(/\s+/g, ' ') : s
      return noCase ? t.toLowerCase() : t
    }
    return diffLines(da.split(/\r?\n/), db.split(/\r?\n/), key)
  }, [da, db, noCase, noSpace])

  const added = lines?.filter((l) => l.kind === 'add').length ?? 0
  const removed = lines?.filter((l) => l.kind === 'del').length ?? 0

  return (
    <Room slug="text-diff" faq={FAQ}>
      <div className="workbench">
        <div className="file-area">
          <div className="side-by-side">
            <Side label="Original" value={a} onChange={setA} />
            <Side label="Changed" value={b} onChange={setB} />
          </div>
          {lines === null ? (
            <p className="feedback" role="alert">
              These texts are too long and too different to compare line by line here. Try comparing smaller parts.
            </p>
          ) : (
            lines.length > 0 && (
              <div className="diff" aria-label="Differences">
                {lines.map((l, i) => (
                  <div key={i} className={l.kind === 'same' ? undefined : l.kind}>
                    {l.text || ' '}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
        <div className="options">
          <h3>The finishing touches</h3>
          <label className="check">
            <input type="checkbox" checked={noCase} onChange={(e) => setNoCase(e.target.checked)} /> Ignore capital letters
          </label>
          <label className="check">
            <input type="checkbox" checked={noSpace} onChange={(e) => setNoSpace(e.target.checked)} /> Ignore extra spaces
          </label>
          <p aria-live="polite">{lines?.length ? (added || removed ? `${added} added, ${removed} removed.` : 'No differences. The texts match.') : 'Paste or open two texts to compare them.'}</p>
          <p className="stay-note">Compared in this tab. Nothing is sent anywhere.</p>
        </div>
      </div>
    </Room>
  )
}
