/** The few parts of libheif-js (LGPL-3.0, bundled wasm) the image worker uses. */
declare module 'libheif-js/libheif-wasm/libheif-bundle.mjs' {
  type HeifImage = {
    get_width(): number
    get_height(): number
    display(target: ImageData, done: (result: ImageData | null) => void): void
  }
  const libheif: () => { HeifDecoder: new () => { decode(bytes: Uint8Array): HeifImage[] } }
  export default libheif
}
