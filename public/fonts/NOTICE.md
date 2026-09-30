# Bundled fonts

Certify embeds font files directly in the PDFs it generates, and ships the
`.ttf` files in this folder so nothing is fetched from a font CDN at runtime.

Every family here is published on [Google Fonts](https://fonts.google.com)
under the **SIL Open Font License 1.1**. That licence permits bundling and
redistribution — including inside generated PDFs — but it **requires the
licence text and each font's own copyright notice to travel with the font
files**.

## Offered in the font picker

| Family | Files | Source |
| --- | --- | --- |
| Italiana | `italiana.ttf` | https://fonts.google.com/specimen/Italiana |
| Cinzel | `cinzel.ttf` | https://fonts.google.com/specimen/Cinzel |
| Marcellus | `marcellus.ttf` | https://fonts.google.com/specimen/Marcellus |
| Forum | `forum.ttf` | https://fonts.google.com/specimen/Forum |
| Playfair Display | `playfair-display.ttf` | https://fonts.google.com/specimen/Playfair+Display |
| Cormorant Garamond | `cormorant-garamond.ttf` | https://fonts.google.com/specimen/Cormorant+Garamond |
| Great Vibes | `great-vibes.ttf` | https://fonts.google.com/specimen/Great+Vibes |
| Alex Brush | `alex-brush.ttf` | https://fonts.google.com/specimen/Alex+Brush |
| Tiro Devanagari Hindi | `tiro-devanagari-hindi.ttf` | https://fonts.google.com/specimen/Tiro+Devanagari+Hindi |

## Used by the interface

| Family | Files | Source |
| --- | --- | --- |
| Instrument Sans | `instrument-sans-400/500/600.ttf` | https://fonts.google.com/specimen/Instrument+Sans |
| Bricolage Grotesque | `bricolage-grotesque-500/700.ttf` | https://fonts.google.com/specimen/Bricolage+Grotesque |

## Before publishing this repository

> **TODO — not yet done.** Download each family from the link above. Every
> Google Fonts download contains an `OFL.txt` carrying that family's own
> copyright line (for example `Copyright 2011 The Cinzel Project Authors`).
> Copy those files in here as `OFL-<family>.txt`, or concatenate them into a
> single `OFL.txt`.
>
> These notices were deliberately not written from memory: a licence text that
> is subtly wrong is worse than one that is obviously missing. Fetch the
> authoritative copies.

## Adding your own font

Drop a `.ttf` in this folder and add its id to `FONTS` in
[`src/lib/fonts.ts`](../../src/lib/fonts.ts). If you cannot redistribute a
font, do not commit it — users can still upload it at runtime from the Style
step, and it will be embedded in their output exactly like a bundled one.
