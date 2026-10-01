type Searchable = { name: string; blurb: string; category: string; keywords?: string }

// Everyday words for a category's tools that their names don't use.
const ALIAS: Record<string, string> = { photo: 'image', photos: 'image', picture: 'image', pic: 'image', clip: 'video', movie: 'video', sound: 'audio', song: 'audio' }

/** Tools in `category` ('all' for every one) whose name, blurb, keywords or category contain every word of `query` (its singular, or its alias). */
export function filterTools<T extends Searchable>(tools: T[], category: string, query: string): T[] {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
  return tools.filter((t) => {
    if (category !== 'all' && t.category !== category) return false
    const hay = `${t.name} ${t.blurb} ${t.keywords ?? ''} ${t.category}`.toLowerCase()
    return words.every((w) => hay.includes(w) || (w.length > 3 && w.endsWith('s') && hay.includes(w.slice(0, -1))) || (w in ALIAS && hay.includes(ALIAS[w])))
  })
}
