export type Line = { kind: 'same' | 'add' | 'del'; text: string }

/**
 * Line diff by longest common subsequence, after trimming the shared start and
 * end. `key` decides when two lines count as equal (e.g. ignoring case).
 * Returns null when the changed middle is too big to compare in memory.
 */
export function diffLines(a: string[], b: string[], key: (s: string) => string = (s) => s): Line[] | null {
  const ka = a.map(key)
  const kb = b.map(key)
  let start = 0
  while (start < a.length && start < b.length && ka[start] === kb[start]) start++
  let end = 0
  while (end < a.length - start && end < b.length - start && ka[a.length - 1 - end] === kb[b.length - 1 - end]) end++
  const n = a.length - start - end
  const m = b.length - start - end
  // ponytail: O(n·m) table, capped at ~16M cells (32 MB); switch to Myers' O(ND) diff if bigger texts matter.
  if (n * m > 16e6) return null
  const W = m + 1
  const t = new Uint16Array((n + 1) * W)
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) t[i * W + j] = ka[start + i] === kb[start + j] ? t[(i + 1) * W + j + 1] + 1 : Math.max(t[(i + 1) * W + j], t[i * W + j + 1])
  const out: Line[] = b.slice(0, start).map((text) => ({ kind: 'same', text }))
  let i = 0
  let j = 0
  while (i < n || j < m) {
    if (i < n && j < m && ka[start + i] === kb[start + j]) {
      out.push({ kind: 'same', text: b[start + j] })
      i++
      j++
    } else if (i < n && (j === m || t[(i + 1) * W + j] >= t[i * W + j + 1])) out.push({ kind: 'del', text: a[start + i++] })
    else out.push({ kind: 'add', text: b[start + j++] })
  }
  return out.concat(b.slice(b.length - end).map((text) => ({ kind: 'same' as const, text })))
}
