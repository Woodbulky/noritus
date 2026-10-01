import { useState } from 'react'
import { CopyButton, Field, Room } from '../../components/Tool'
import { entropy, generate, type Sets } from './password'

const FAQ: [string, string][] = [
  ['How random are these?', 'They come from your browser’s cryptographic random generator, the same source used for encryption keys, and every character is equally likely.'],
  ['How long should a password be?', '16 characters or more for anything important. Length matters more than symbols: each extra character multiplies the guesses needed.'],
  ['What are look-alike characters?', 'Characters easy to confuse when reading or typing, such as l, 1, I, O and 0. Leaving them out helps when you must type the password by hand.'],
  ['Are my passwords saved or sent anywhere?', 'No. They are made in this tab and forgotten when you close it. Store them in a password manager.'],
]

const strength = (bits: number) => (bits < 50 ? 'Weak' : bits < 80 ? 'Fair' : bits < 110 ? 'Strong' : 'Very strong')
const fresh = (length: number, s: Sets) => Array.from({ length: 5 }, () => generate(length, s))

export default function PasswordGenerator() {
  const [length, setLength] = useState(20)
  const [sets, setSets] = useState<Sets>({ lower: true, upper: true, digits: true, symbols: true, similar: false })
  const [list, setList] = useState(() => fresh(20, sets))
  const bits = entropy(length, sets)

  const update = (l: number, s: Sets) => {
    setLength(l)
    setSets(s)
    setList(fresh(l, s))
  }
  const toggle = (k: keyof Sets) => {
    const next = { ...sets, [k]: !sets[k] }
    if (k === 'similar' || next.lower || next.upper || next.digits || next.symbols) update(length, next)
  }
  const CHECKS: [keyof Sets, string][] = [
    ['lower', 'Lowercase (a–z)'],
    ['upper', 'Uppercase (A–Z)'],
    ['digits', 'Numbers (0–9)'],
    ['symbols', 'Symbols (!@#…)'],
    ['similar', 'Leave out look-alikes (l 1 I O 0)'],
  ]

  return (
    <Room slug="password-generator" faq={FAQ}>
      <div className="workbench">
        <div className="file-area">
          <div className="kv" aria-live="polite">
            {list.map((p, i) => (
              <div key={i} style={{ display: 'contents' }}>
                <b>{i + 1}</b>
                <code style={{ fontSize: 15 }}>{p}</code>
                <CopyButton text={p} />
              </div>
            ))}
          </div>
          <div className="pager-row">
            <span className="muted">
              {bits} bits of entropy · {strength(bits)}
            </span>
            <button className="btn btn-outline btn-small" onClick={() => setList(fresh(length, sets))}>
              Make new ones ↻
            </button>
          </div>
        </div>
        <div className="options">
          <h3>The finishing touches</h3>
          <Field label={`Length · ${length} characters`}>
            <input type="range" min={6} max={64} value={length} onChange={(e) => update(+e.target.value, sets)} />
          </Field>
          {CHECKS.map(([k, label]) => (
            <label key={k} className="check">
              <input type="checkbox" checked={sets[k]} onChange={() => toggle(k)} /> {label}
            </label>
          ))}
          <p className="stay-note">Made in this tab. Nothing is saved or sent anywhere.</p>
        </div>
      </div>
    </Room>
  )
}
