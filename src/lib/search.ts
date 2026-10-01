type Searchable = { name: string; blurb: string; category: string }

// Everyday words for a category's tools that their names don't use.
const ALIAS: Record<string, string> = { photo: 'image', photos: 'image', picture: 'image', pic: 'image', clip: 'video', movie: 'video', sound: 'audio', song: 'audio' }

/** Tools in `category` ('all' for every one) whose name, blurb or category contain every word of `query` (or its alias). */
export function filterTools<T extends Searchable>(tools: T[], category: string, query: string): T[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  return tools.filter((t) => {
    if (category !== 'all' && t.category !== category) return false
    const hay = `${t.name} ${t.blurb} ${t.category}`.toLowerCase()
    return words.every((w) => hay.includes(w) || (w in ALIAS && hay.includes(ALIAS[w])))
  })
}
