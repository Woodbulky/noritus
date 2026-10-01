import { useEffect, useRef, useState } from 'react'
import { Bookmark, Close } from './icons'
import { useApp } from '../store/appStore'

/** Save / load named layouts, kept in localStorage. */
export default function PresetMenu() {
  const presets = useApp((s) => s.presets)
  const storePreset = useApp((s) => s.storePreset)
  const applyPreset = useApp((s) => s.applyPreset)
  const dropPreset = useApp((s) => s.dropPreset)

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const menu = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!menu.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const save = () => {
    storePreset(name)
    setName('')
    setOpen(false)
  }

  return (
    <div className="menu" ref={menu}>
      <button
        type="button"
        className="btn btn-ghost"
        style={{ padding: '7px 12px', fontSize: 13 }}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
      >
        <Bookmark />
        Presets
      </button>

      {open && (
        <div className="menu-pop" role="menu">
          <div className="add" style={{ padding: 0, border: 0 }}>
            <input
              className="input"
              placeholder="Preset name"
              aria-label="Preset name"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
            />
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: '8px 12px', fontSize: 13 }}
              onClick={save}
            >
              Save
            </button>
          </div>

          <div className="sep" />

          {presets.length === 0 ? (
            <div className="none">No presets yet. Save the current layout above.</div>
          ) : (
            presets.map((p) => (
              <div className="mi-row" key={p.name}>
                <button
                  type="button"
                  className="mi"
                  role="menuitem"
                  onClick={() => {
                    applyPreset(p.name)
                    setOpen(false)
                  }}
                >
                  {p.name}
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Delete preset ${p.name}`}
                  onClick={() => dropPreset(p.name)}
                >
                  <Close size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
