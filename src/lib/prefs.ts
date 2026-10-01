/** Recent and favourite tools: slugs only, kept in this browser's localStorage. Never synced. */

function read(key: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? '[]')
    return Array.isArray(v) ? v.filter((s) => typeof s === 'string') : []
  } catch {
    return []
  }
}

function write(key: string, slugs: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(slugs))
  } catch {
    // Storage blocked (private mode, site data off): favourites just don't stick.
  }
}

export const recents = () => read('noritus:recent')
export const favourites = () => read('noritus:favourites')

export const visit = (slug: string) => write('noritus:recent', [slug, ...recents().filter((s) => s !== slug)].slice(0, 6))

/** Flips a favourite and returns whether it is one now. */
export function toggleFavourite(slug: string) {
  const f = favourites()
  const on = !f.includes(slug)
  write('noritus:favourites', on ? [slug, ...f] : f.filter((s) => s !== slug))
  return on
}
