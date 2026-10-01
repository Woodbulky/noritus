import 'fontkit'

// @types/fontkit is written against Node Buffers; in the browser we hand it
// plain Uint8Arrays. Merge an extra overload rather than casting everywhere.
declare module 'fontkit' {
  export function create(data: Uint8Array, postscriptName?: string): Font
}
