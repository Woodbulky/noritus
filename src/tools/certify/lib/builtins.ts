import type { Box } from './layoutName'

/**
 * Designs that ship with the app, so a first run is not a blank dropzone.
 *
 * The PNGs are rendered once from `make-templates.html` by `npm run templates`;
 * `box` is the blank name area each design was drawn around, printed by that
 * same script. They are ~80 KB each rather than the couple of megabytes a
 * stock template usually weighs, which also keeps the ZIP small — every
 * certificate carries its own copy of the artwork.
 */
export type Builtin = {
  id: string
  name: string
  blurb: string
  box: Box
}

export const BUILTINS: Builtin[] = [
  {
    id: 'laurel',
    name: 'Laurel',
    blurb: 'Classic, gold rules',
    box: { l: 0.175, t: 0.5111, r: 0.825, b: 0.5942 },
  },
  {
    id: 'ribbon',
    name: 'Ribbon',
    blurb: 'Navy header band',
    box: { l: 0.1875, t: 0.4721, r: 0.8125, b: 0.5623 },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    blurb: 'Hairline frame',
    box: { l: 0.2125, t: 0.4421, r: 0.7875, b: 0.5305 },
  },
  {
    id: 'arc',
    name: 'Arc',
    blurb: 'Bold green shapes',
    box: { l: 0.1875, t: 0.4881, r: 0.8125, b: 0.5818 },
  },
  {
    id: 'deco',
    name: 'Deco',
    blurb: 'Art-deco brackets',
    box: { l: 0.1812, t: 0.4951, r: 0.8187, b: 0.5871 },
  },
  {
    id: 'seal',
    name: 'Seal',
    blurb: 'Warm, with a rosette',
    box: { l: 0.1875, t: 0.4297, r: 0.8125, b: 0.5217 },
  },
]

export const builtinUrl = (id: string) => `${import.meta.env.BASE_URL}templates/certify/${id}.png`

/** Fetches a built-in as a File, so it takes the same path as a dropped one. */
export async function loadBuiltin(b: Builtin): Promise<File> {
  const res = await fetch(builtinUrl(b.id))
  if (!res.ok) throw new Error(`The “${b.name}” template could not be loaded.`)
  return new File([await res.blob()], `${b.name}.png`, { type: 'image/png' })
}
