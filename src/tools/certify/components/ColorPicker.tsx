import { useState } from 'react'
import { Eyedropper } from './icons'
import { useApp, type Field } from '../store/appStore'

/** The mockup's four presets. Certificate ink is user content, not UI colour. */
const SWATCHES = [
  { c: '#111111', label: 'Black' },
  { c: '#2a1766', label: 'Template purple' },
  { c: '#4b2bb8', label: 'Bright purple' },
  { c: '#6b6b6b', label: 'Grey' },
]

const FULL_HEX = /^#[0-9a-f]{6}$/i

type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> }

export default function ColorPicker({ field, value }: { field: Field; value: string }) {
  const patch = useApp((s) => s.patch)
  const toast = useApp((s) => s.toast)
  const [draft, setDraft] = useState(value)
  const [lastValue, setLastValue] = useState(value)

  // Follow undo/redo and preset loads, which change the colour from outside
  // this component. Adjusting during render (rather than in an effect) avoids
  // painting one frame with the stale text.
  if (value !== lastValue) {
    setLastValue(value)
    setDraft(value)
  }

  const commit = (hex: string) => {
    const next = hex.startsWith('#') ? hex : `#${hex}`
    if (!FULL_HEX.test(next)) return
    patch(field, { color: next.toLowerCase() })
  }

  const pick = async () => {
    const Ctor = (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper
    if (!Ctor) {
      toast('This browser has no eyedropper. Type a hex value instead.', 'err')
      return
    }
    try {
      const { sRGBHex } = await new Ctor().open()
      setDraft(sRGBHex)
      commit(sRGBHex)
    } catch {
      // The user pressed Escape; nothing to report.
    }
  }

  return (
    <div className="swatches">
      {SWATCHES.map((s) => (
        <button
          key={s.c}
          type="button"
          className="sw"
          style={{ background: s.c }}
          aria-label={s.label}
          aria-pressed={value.toLowerCase() === s.c}
          onClick={() => {
            setDraft(s.c)
            commit(s.c)
          }}
        />
      ))}

      <input
        className="hex"
        aria-label="Hex colour"
        value={draft}
        spellCheck={false}
        onChange={(e) => {
          setDraft(e.target.value)
          commit(e.target.value)
        }}
        onBlur={() => setDraft(value)}
      />

      <button type="button" className="icon-btn" aria-label="Pick a colour from the template" onClick={pick}>
        <Eyedropper />
      </button>
    </div>
  )
}
