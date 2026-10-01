/** MD5, which Web Crypto leaves out. Still the most-quoted download checksum, so it's here for comparing, not for security. */

const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21]
const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) | 0)

export function md5(bytes: Uint8Array): string {
  const h = [0x67452301, 0xefcdab89 | 0, 0x98badcfe | 0, 0x10325476]
  const M = new Int32Array(16)
  const block = (buf: Uint8Array, off: number) => {
    for (let i = 0; i < 16; i++) M[i] = buf[off + i * 4] | (buf[off + i * 4 + 1] << 8) | (buf[off + i * 4 + 2] << 16) | (buf[off + i * 4 + 3] << 24)
    let [a, b, c, d] = h
    for (let i = 0; i < 64; i++) {
      const r = i >> 4
      const f = r === 0 ? (b & c) | (~b & d) : r === 1 ? (d & b) | (~d & c) : r === 2 ? b ^ c ^ d : c ^ (b | ~d)
      const g = r === 0 ? i : r === 1 ? (5 * i + 1) & 15 : r === 2 ? (3 * i + 5) & 15 : (7 * i) & 15
      const s = S[r * 4 + (i & 3)]
      const x = (a + f + K[i] + M[g]) | 0
      a = d
      d = c
      c = b
      b = (b + ((x << s) | (x >>> (32 - s)))) | 0
    }
    h[0] = (h[0] + a) | 0
    h[1] = (h[1] + b) | 0
    h[2] = (h[2] + c) | 0
    h[3] = (h[3] + d) | 0
  }
  const n = bytes.length
  const full = n - (n % 64)
  for (let off = 0; off < full; off += 64) block(bytes, off)
  const tail = new Uint8Array(n % 64 < 56 ? 64 : 128)
  tail.set(bytes.subarray(full))
  tail[n % 64] = 0x80
  const dv = new DataView(tail.buffer)
  dv.setUint32(tail.length - 8, (n * 8) >>> 0, true)
  dv.setUint32(tail.length - 4, Math.floor((n * 8) / 2 ** 32), true)
  for (let off = 0; off < tail.length; off += 64) block(tail, off)
  return h.map((v) => [0, 8, 16, 24].map((s) => ((v >>> s) & 255).toString(16).padStart(2, '0')).join('')).join('')
}
