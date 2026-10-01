/** Base64 for any bytes, chunked so big files don't overflow the call stack. */
export function toBase64(bytes: Uint8Array, urlSafe = false) {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  const b64 = btoa(bin)
  return urlSafe ? b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : b64
}

/** Reads standard or URL-safe Base64, with or without padding, spaces or a data: URL prefix. */
export function fromBase64(text: string): { bytes: Uint8Array; type: string } {
  const m = text.trim().match(/^data:([^;,]*)(?:;[^,]*)?,/)
  const body = (m ? text.trim().slice(m[0].length) : text).replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/')
  if (/[^A-Za-z0-9+/=]/.test(body) || body.length % 4 === 1) throw new Error('That isn’t valid Base64. Check for missing or extra characters.')
  let bin: string
  try {
    bin = atob(body.replace(/=+$/, '').padEnd(Math.ceil(body.replace(/=+$/, '').length / 4) * 4, '='))
  } catch {
    throw new Error('That isn’t valid Base64. Check for missing or extra characters.')
  }
  return { bytes: Uint8Array.from(bin, (c) => c.charCodeAt(0)), type: m?.[1] ?? '' }
}
