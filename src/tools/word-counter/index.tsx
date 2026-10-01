import { useDeferredValue, useMemo, useState } from 'react'
import { Field, Room } from '../../components/Tool'
import { count, minutes } from './count'

const FAQ: [string, string][] = [
  ['How are words counted?', 'With your browser’s built-in language rules, so Hindi, Chinese, Japanese and other scripts are counted properly, not just English.'],
  ['How is reading time worked out?', 'At about 238 words a minute for reading and 150 for speaking aloud, the usual averages for adults.'],
  ['Does an emoji count as one character?', 'Yes. Characters are counted the way you see them, so 👍🏽 is one, not four.'],
  ['Is my text sent anywhere?', 'No. It is counted inside this browser tab, so drafts and essays stay private.'],
]

export default function WordCounter() {
  const [text, setText] = useState('')
  const deferred = useDeferredValue(text)
  const c = useMemo(() => count(deferred), [deferred])
  const STATS: [string, string | number][] = [
    ['Words', c.words.toLocaleString()],
    ['Characters', c.characters.toLocaleString()],
    ['Without spaces', c.noSpaces.toLocaleString()],
    ['Sentences', c.sentences.toLocaleString()],
    ['Paragraphs', c.paragraphs.toLocaleString()],
    ['Reading time', c.words ? minutes(c.words, 238) : '—'],
    ['Speaking time', c.words ? minutes(c.words, 150) : '—'],
  ]

  return (
    <Room slug="word-counter" faq={FAQ}>
      <div className="workbench">
        <div className="file-area">
          <Field label="Your text">
            <textarea className="input" rows={14} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type or paste here…" />
          </Field>
          <Field label="…or open a text file">
            <input className="input" type="file" accept=".txt,.md,.csv,text/*" onChange={async (e) => (e.target.files?.[0] && setText(await e.target.files[0].text()), (e.target.value = ''))} />
          </Field>
        </div>
        <div className="options">
          <h3>The count</h3>
          <div className="stats" aria-live="polite">
            {STATS.map(([label, v]) => (
              <div key={label}>
                <b>{v}</b>
                <span>{label}</span>
              </div>
            ))}
          </div>
          {c.top.length > 0 && (
            <>
              <span className="option-label">Most used words</span>
              <p>{c.top.map(([w, n]) => `${w} (${n})`).join(', ')}</p>
            </>
          )}
          <p className="stay-note">Counted in this tab. Nothing is sent anywhere.</p>
        </div>
      </div>
    </Room>
  )
}
