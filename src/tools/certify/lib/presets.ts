import { DEFAULT_STYLE, type TextStyle } from './layoutName'

/** A named layout the user saved: everything on the Style step. */
export type Preset = { name: string; style: TextStyle }

const PRESETS_KEY = 'certify:presets'
const LAST_KEY = 'certify:last-style'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Private-mode quota failures are not worth interrupting the user over.
  }
}

/** Fills in anything a stored style is missing, so old entries stay loadable. */
export function hydrateStyle(partial: Partial<TextStyle> | null | undefined): TextStyle {
  return {
    ...DEFAULT_STYLE,
    ...partial,
    box: { ...DEFAULT_STYLE.box, ...partial?.box },
  }
}

export function loadPresets(): Preset[] {
  return read<Preset[]>(PRESETS_KEY, []).map((p) => ({
    name: String(p?.name ?? 'Preset'),
    style: hydrateStyle(p?.style),
  }))
}

/** Saves under `name`, replacing any preset that already had it. */
export function savePreset(name: string, style: TextStyle): Preset[] {
  const trimmed = name.trim() || 'Preset'
  const next = [...loadPresets().filter((p) => p.name !== trimmed), { name: trimmed, style }]
  write(PRESETS_KEY, next)
  return next
}

export function deletePreset(name: string): Preset[] {
  const next = loadPresets().filter((p) => p.name !== name)
  write(PRESETS_KEY, next)
  return next
}

/** Last-used settings, restored on reload. */
export const loadLastStyle = () => {
  const stored = read<Partial<TextStyle> | null>(LAST_KEY, null)
  return stored ? hydrateStyle(stored) : null
}

export const saveLastStyle = (style: TextStyle) => write(LAST_KEY, style)
