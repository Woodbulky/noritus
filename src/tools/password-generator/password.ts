export type Sets = { lower: boolean; upper: boolean; digits: boolean; symbols: boolean; similar: boolean }

const CHARS = { lower: 'abcdefghijklmnopqrstuvwxyz', upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', digits: '0123456789', symbols: '!@#$%^&*()-_=+[]{};:,.?/' }
const LOOKALIKE = /[Il1O0o]/g

/** The character groups in use, look-alikes removed if asked. */
export function groups(s: Sets) {
  return (Object.keys(CHARS) as (keyof typeof CHARS)[]).filter((k) => s[k]).map((k) => (s.similar ? CHARS[k].replace(LOOKALIKE, '') : CHARS[k]))
}

/** Uniform index below `n` from 32-bit random values, by rejection, so no character is favoured. */
function pick(n: number, rand: () => number) {
  const limit = 2 ** 32 - (2 ** 32 % n)
  for (;;) {
    const r = rand()
    if (r < limit) return r % n
  }
}

const cryptoRand = () => crypto.getRandomValues(new Uint32Array(1))[0]

/** A password with at least one character from every chosen group. */
export function generate(length: number, s: Sets, rand = cryptoRand) {
  const gs = groups(s)
  if (!gs.length) return ''
  const pool = gs.join('')
  for (;;) {
    const p = Array.from({ length }, () => pool[pick(pool.length, rand)]).join('')
    if (length < gs.length || gs.every((g) => [...p].some((c) => g.includes(c)))) return p
  }
}

/** Bits of entropy for a random password over this pool. */
export const entropy = (length: number, s: Sets) => Math.round(length * Math.log2(Math.max(1, groups(s).join('').length)))
