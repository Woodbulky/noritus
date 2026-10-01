/** Every ArrayBuffer inside `x`, so postMessage can move them instead of copying. */
export function buffers(x: unknown, out = new Set<ArrayBuffer>()): ArrayBuffer[] {
  if (ArrayBuffer.isView(x)) out.add(x.buffer as ArrayBuffer)
  else if (Array.isArray(x)) x.forEach((v) => buffers(v, out))
  else if (x && typeof x === 'object') Object.values(x).forEach((v) => buffers(v, out))
  return [...out]
}
