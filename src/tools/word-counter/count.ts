export type Counts = { words: number; characters: number; noSpaces: number; sentences: number; paragraphs: number; top: [string, number][] }

const words = new Intl.Segmenter(undefined, { granularity: 'word' })
const sentences = new Intl.Segmenter(undefined, { granularity: 'sentence' })
const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

/** Counts that work for any script: Intl.Segmenter finds words and sentences, graphemes count as one character each. */
export function count(text: string): Counts {
  const list = [...words.segment(text)].filter((s) => s.isWordLike).map((s) => s.segment.toLowerCase())
  const freq = new Map<string, number>()
  for (const w of list) if ([...w].length > 3) freq.set(w, (freq.get(w) ?? 0) + 1)
  return {
    words: list.length,
    characters: [...graphemes.segment(text)].length,
    noSpaces: [...graphemes.segment(text.replace(/\s/g, ''))].length,
    sentences: [...sentences.segment(text)].filter((s) => /[\p{L}\p{N}]/u.test(s.segment)).length,
    paragraphs: text.split(/\n\s*\n/).filter((p) => p.trim()).length,
    top: [...freq].sort((x, y) => y[1] - x[1]).slice(0, 8),
  }
}

/** "4 min", "under a minute", at `wpm` words per minute. */
export const minutes = (n: number, wpm: number) => (n / wpm < 1 ? 'under a minute' : `${Math.round(n / wpm)} min`)
