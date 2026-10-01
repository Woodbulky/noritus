/**
 * Undo/redo over whole snapshots. Style state is a handful of numbers, so
 * storing copies is cheaper (and far less code) than diffing or patches.
 */
export type History<T> = { past: T[]; future: T[] }

const LIMIT = 60

export const emptyHistory = <T>(): History<T> => ({ past: [], future: [] })

/** Record `previous` as an undo step; anything redoable is now stale. */
export function push<T>(h: History<T>, previous: T): History<T> {
  return { past: [...h.past, previous].slice(-LIMIT), future: [] }
}

/** Returns the state to apply plus the new history, or null when at the end. */
export function undo<T>(h: History<T>, current: T): { state: T; history: History<T> } | null {
  if (h.past.length === 0) return null
  const state = h.past[h.past.length - 1]
  return {
    state,
    history: { past: h.past.slice(0, -1), future: [current, ...h.future].slice(0, LIMIT) },
  }
}

export function redo<T>(h: History<T>, current: T): { state: T; history: History<T> } | null {
  if (h.future.length === 0) return null
  const [state, ...rest] = h.future
  return { state, history: { past: [...h.past, current].slice(-LIMIT), future: rest } }
}
