import JSZip from 'jszip'

export type ZipEntry = { name: string; bytes: Uint8Array }

/**
 * PDF streams are already Flate-compressed, so STORE is the same size as
 * DEFLATE and much faster.
 */
export async function buildZip(entries: ZipEntry[]): Promise<Blob> {
  const zip = new JSZip()
  for (const e of entries) zip.file(e.name, e.bytes, { compression: 'STORE' })
  return zip.generateAsync({ type: 'blob', compression: 'STORE' })
}
