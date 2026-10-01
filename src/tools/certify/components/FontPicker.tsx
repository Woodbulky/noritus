import { useEffect, useMemo, useRef, useState } from 'react'
import { CUSTOM_FONT_ID, FONTS, loadCssFont, type FontOption } from '../lib/fonts'
import { useApp, type Field } from '../store/appStore'

type Props = { field: Field; value: string }

export default function FontPicker({ field, value }: Props) {
  const setFont = useApp((s) => s.setFont)
  const uploadFont = useApp((s) => s.uploadFont)
  const custom = useApp((s) => s.customFont)
  const toast = useApp((s) => s.toast)
  const input = useRef<HTMLInputElement>(null)

  /** Families that finished loading, so a sample never renders in a fallback. */
  const [families, setFamilies] = useState<Record<string, string>>({})

  // Memoised: this array is an effect dependency below.
  const options: FontOption[] = useMemo(() => (custom ? [...FONTS, custom] : FONTS), [custom])

  useEffect(() => {
    let live = true
    for (const font of options) {
      loadCssFont(font.id)
        .then((family) => {
          if (live) setFamilies((f) => (f[font.id] ? f : { ...f, [font.id]: family }))
        })
        .catch(() => toast(`Could not preview "${font.name}".`, 'err'))
    }
    return () => {
      live = false
    }
    // `custom` is what can add a new option; ids are otherwise static.
  }, [custom, options, toast])

  return (
    <div className="fonts">
      {options.map((font) => (
        <button
          key={font.id}
          type="button"
          className="font-opt"
          aria-pressed={font.id === value}
          onClick={() => void setFont(field, font.id)}
        >
          <span
            className="s"
            style={{ fontFamily: families[font.id] ? `'${families[font.id]}'` : 'serif' }}
          >
            {font.dev ? 'हर्ष Harsh' : 'Aarav'}
          </span>
          <span className="f" title={font.name}>
            {font.name}
          </span>
        </button>
      ))}

      <button type="button" className="font-opt upload" onClick={() => input.current?.click()}>
        {custom && value === CUSTOM_FONT_ID ? 'Replace .ttf / .otf' : 'Upload .ttf / .otf'}
      </button>
      <input
        ref={input}
        type="file"
        accept=".ttf,.otf,font/ttf,font/otf"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void uploadFont(field, file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
