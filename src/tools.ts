import type { ComponentType } from 'react'
import type { IconName } from './components/Icon'

export type Category = 'PDF' | 'Media' | 'Image' | 'Generate' | 'Utility'

export type Tool = {
  slug: string // URL: /<slug>
  name: string
  blurb: string // one line; also the meta description
  category: Category
  icon: IconName
  /** Missing until the tool is built; the card and route then say "Coming soon". */
  load?: () => Promise<{ default: ComponentType }>
}

/** Single source for the home grid, routes, titles and descriptions. */
export const TOOLS: Tool[] = [
  { slug: 'pdf-merge', name: 'Merge PDF', blurb: 'Bring separate pages into one happy file.', category: 'PDF', icon: 'merge' },
  { slug: 'mp4-to-mp3', name: 'MP4 to MP3', blurb: 'Keep the sound. Leave the video.', category: 'Media', icon: 'music' },
  { slug: 'certify', name: 'Bulk certificates', blurb: 'One template. A well-deserved PDF for everyone.', category: 'Generate', icon: 'award' },
  { slug: 'image-compress', name: 'Compress image', blurb: 'A smaller file. The same big picture.', category: 'Image', icon: 'compress' },
  { slug: 'pdf-split', name: 'Split PDF', blurb: 'Just the pages you need. Nothing extra.', category: 'PDF', icon: 'scissors' },
  { slug: 'image-convert', name: 'Convert image', blurb: 'A fresh format for your favourite images.', category: 'Image', icon: 'convert' },
  { slug: 'pdf-organize', name: 'Organize pages', blurb: 'Reorder, rotate, and find your flow.', category: 'PDF', icon: 'sort' },
  { slug: 'images-to-pdf', name: 'Images to PDF', blurb: 'Turn a collection of pictures into a PDF.', category: 'PDF', icon: 'image' },
  { slug: 'pdf-to-images', name: 'PDF to images', blurb: 'Give every page a picture-perfect format.', category: 'PDF', icon: 'image' },
  { slug: 'pdf-sign', name: 'Sign PDF', blurb: 'Your signature. Right where it belongs.', category: 'PDF', icon: 'pen' },
  { slug: 'pdf-watermark', name: 'Watermark', blurb: 'Put your own mark on every page.', category: 'PDF', icon: 'water' },
  { slug: 'pdf-page-numbers', name: 'Page numbers', blurb: 'Every page, counted and in its place.', category: 'PDF', icon: 'hash' },
  { slug: 'trim-media', name: 'Trim audio & video', blurb: 'Make the cut. Keep the good part.', category: 'Media', icon: 'scissors' },
  { slug: 'video-converter', name: 'Video converter', blurb: 'Find a format that plays nicely.', category: 'Media', icon: 'video' },
  { slug: 'compress-video', name: 'Compress video', blurb: 'Make room without losing the moment.', category: 'Media', icon: 'compress' },
  { slug: 'recorder', name: 'Screen recorder', blurb: 'Capture your screen, webcam, or voice.', category: 'Media', icon: 'record' },
  { slug: 'exif-remove', name: 'Remove photo data', blurb: 'Keep the photo. Leave the metadata.', category: 'Image', icon: 'location' },
  { slug: 'qr-generator', name: 'QR code maker', blurb: 'A little square with somewhere to go.', category: 'Generate', icon: 'qr' },
  { slug: 'hash', name: 'Hash calculator', blurb: 'Find the unique fingerprint of your file.', category: 'Utility', icon: 'hash' },
]

export const CATEGORIES: [Category | 'all', string, IconName][] = [
  ['all', 'All tools', 'grid'],
  ['PDF', 'PDF', 'file'],
  ['Media', 'Audio & video', 'music'],
  ['Image', 'Images', 'image'],
  ['Generate', 'Generators', 'award'],
  ['Utility', 'Utilities', 'hash'],
]
