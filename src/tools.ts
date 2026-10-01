import type { ComponentType } from 'react'
import type { IconName } from './components/Icon'
import { IMAGE_ACCEPT } from './lib/image'
import { AUDIO_ACCEPT, VIDEO_ACCEPT } from './lib/media'

const PDF = '.pdf,application/pdf'

export type Category = 'PDF' | 'Media' | 'Image' | 'Generate' | 'Utility'

export type Tool = {
  slug: string // URL: /<slug>
  name: string
  blurb: string // one line; also the meta description
  category: Category
  icon: IconName
  /** What its drop zone takes (an `accept` string), so another tool's result can be handed over. */
  takes?: string
  /** Missing until the tool is built; the card and route then say "Coming soon". */
  load?: () => Promise<{ default: ComponentType }>
}

/** Single source for the home grid, routes, titles and descriptions. */
export const TOOLS: Tool[] = [
  { slug: 'pdf-merge', name: 'Merge PDF', blurb: 'Bring separate pages into one happy file.', category: 'PDF', icon: 'merge', takes: PDF, load: () => import('./tools/pdf-merge') },
  { slug: 'mp4-to-mp3', name: 'MP4 to MP3', blurb: 'Keep the sound. Leave the video.', category: 'Media', icon: 'music', takes: VIDEO_ACCEPT, load: () => import('./tools/mp4-to-mp3') },
  { slug: 'certify', name: 'Bulk certificates', blurb: 'One template. A well-deserved PDF for everyone.', category: 'Generate', icon: 'award', load: () => import('./tools/certify') },
  { slug: 'image-compress', name: 'Compress image', blurb: 'A smaller file. The same big picture.', category: 'Image', icon: 'compress', takes: IMAGE_ACCEPT, load: () => import('./tools/image-compress') },
  { slug: 'pdf-split', name: 'Split PDF', blurb: 'Just the pages you need. Nothing extra.', category: 'PDF', icon: 'scissors', takes: PDF, load: () => import('./tools/pdf-split') },
  { slug: 'image-convert', name: 'Convert image', blurb: 'A fresh format for your favourite images.', category: 'Image', icon: 'convert', takes: IMAGE_ACCEPT, load: () => import('./tools/image-convert') },
  { slug: 'pdf-organize', name: 'Organize pages', blurb: 'Reorder, rotate, and find your flow.', category: 'PDF', icon: 'sort', takes: PDF, load: () => import('./tools/pdf-organize') },
  { slug: 'images-to-pdf', name: 'Images to PDF', blurb: 'Turn a collection of pictures into a PDF.', category: 'PDF', icon: 'image', takes: IMAGE_ACCEPT, load: () => import('./tools/images-to-pdf') },
  { slug: 'pdf-to-images', name: 'PDF to images', blurb: 'Give every page a picture-perfect format.', category: 'PDF', icon: 'image', takes: PDF, load: () => import('./tools/pdf-to-images') },
  { slug: 'pdf-sign', name: 'Sign PDF', blurb: 'Your signature. Right where it belongs.', category: 'PDF', icon: 'pen', takes: PDF, load: () => import('./tools/pdf-sign') },
  { slug: 'pdf-watermark', name: 'Watermark', blurb: 'Put your own mark on every page.', category: 'PDF', icon: 'water', takes: PDF, load: () => import('./tools/pdf-watermark') },
  { slug: 'pdf-page-numbers', name: 'Page numbers', blurb: 'Every page, counted and in its place.', category: 'PDF', icon: 'hash', takes: PDF, load: () => import('./tools/pdf-page-numbers') },
  { slug: 'trim-media', name: 'Trim audio & video', blurb: 'Make the cut. Keep the good part.', category: 'Media', icon: 'scissors', takes: `${VIDEO_ACCEPT},${AUDIO_ACCEPT}`, load: () => import('./tools/trim-media') },
  { slug: 'video-converter', name: 'Video converter', blurb: 'Find a format that plays nicely.', category: 'Media', icon: 'video', takes: VIDEO_ACCEPT, load: () => import('./tools/video-converter') },
  { slug: 'compress-video', name: 'Compress video', blurb: 'Make room without losing the moment.', category: 'Media', icon: 'compress', takes: VIDEO_ACCEPT, load: () => import('./tools/compress-video') },
  { slug: 'audio-converter', name: 'Audio converter', blurb: 'Any sound, in the format you need.', category: 'Media', icon: 'convert', takes: AUDIO_ACCEPT, load: () => import('./tools/audio-converter') },
  { slug: 'video-to-gif', name: 'Video to GIF', blurb: 'A moment, on a loop.', category: 'Media', icon: 'image', takes: VIDEO_ACCEPT, load: () => import('./tools/video-to-gif') },
  { slug: 'mute-video', name: 'Mute video', blurb: 'Keep the picture. Lose the noise.', category: 'Media', icon: 'mute', takes: VIDEO_ACCEPT, load: () => import('./tools/mute-video') },
  { slug: 'recorder', name: 'Screen recorder', blurb: 'Capture your screen, webcam, or voice.', category: 'Media', icon: 'record', load: () => import('./tools/recorder') },
  { slug: 'image-resize', name: 'Resize image', blurb: 'Just the right size, a whole batch at once.', category: 'Image', icon: 'resize', takes: IMAGE_ACCEPT, load: () => import('./tools/image-resize') },
  { slug: 'image-crop', name: 'Crop image', blurb: 'Frame the part worth keeping.', category: 'Image', icon: 'crop', takes: IMAGE_ACCEPT, load: () => import('./tools/image-crop') },
  { slug: 'exif-remove', name: 'Remove photo data', blurb: 'Keep the photo. Leave the metadata.', category: 'Image', icon: 'location', takes: IMAGE_ACCEPT, load: () => import('./tools/exif-remove') },
  { slug: 'favicon-generator', name: 'Favicon maker', blurb: 'Your logo, tab-sized and ready.', category: 'Image', icon: 'star', takes: IMAGE_ACCEPT, load: () => import('./tools/favicon-generator') },
  { slug: 'qr-generator', name: 'QR code maker', blurb: 'A little square with somewhere to go.', category: 'Generate', icon: 'qr', load: () => import('./tools/qr-generator') },
  { slug: 'pdf-compress', name: 'Compress PDF', blurb: 'A lighter PDF that still looks the part.', category: 'PDF', icon: 'compress', takes: PDF, load: () => import('./tools/pdf-compress') },
  { slug: 'pdf-fill-form', name: 'Fill PDF form', blurb: 'Fill it in, no printer required.', category: 'PDF', icon: 'form', takes: PDF, load: () => import('./tools/pdf-fill-form') },
  { slug: 'pdf-annotate', name: 'Annotate PDF', blurb: 'Notes, highlights and boxes, right on the page.', category: 'PDF', icon: 'highlight', takes: PDF, load: () => import('./tools/pdf-annotate') },
  { slug: 'pdf-redact', name: 'Redact PDF', blurb: 'Black it out. Gone for good.', category: 'PDF', icon: 'redact', takes: PDF, load: () => import('./tools/pdf-redact') },
  { slug: 'pdf-protect', name: 'Protect PDF', blurb: 'A password between your PDF and prying eyes.', category: 'PDF', icon: 'lock', takes: PDF, load: () => import('./tools/pdf-protect') },
  { slug: 'pdf-unlock', name: 'Unlock PDF', blurb: 'Know the password? Lose the prompt.', category: 'PDF', icon: 'unlock', takes: PDF, load: () => import('./tools/pdf-unlock') },
  { slug: 'pdf-ocr', name: 'PDF OCR', blurb: 'Turn scanned pages into searchable text.', category: 'PDF', icon: 'scan', takes: PDF, load: () => import('./tools/pdf-ocr') },
  { slug: 'pdf-to-text', name: 'PDF to text', blurb: 'Every word, none of the formatting fuss.', category: 'PDF', icon: 'text', takes: PDF, load: () => import('./tools/pdf-to-text') },
  { slug: 'pdf-metadata', name: 'PDF properties', blurb: 'See, change or wipe the hidden details.', category: 'PDF', icon: 'info', takes: PDF, load: () => import('./tools/pdf-metadata') },
  { slug: 'id-cards', name: 'Bulk ID cards', blurb: 'One design. A card for every name on the list.', category: 'Generate', icon: 'card', load: () => import('./tools/certify/id-cards') },
  { slug: 'event-passes', name: 'Event passes', blurb: 'A named pass for every guest, QR included.', category: 'Generate', icon: 'ticket', load: () => import('./tools/certify/event-passes') },
  { slug: 'invitations', name: 'Bulk invitations', blurb: 'Every guest, personally invited.', category: 'Generate', icon: 'mail', load: () => import('./tools/certify/invitations') },
  { slug: 'password-generator', name: 'Password generator', blurb: 'Strong, random, and only ever yours.', category: 'Generate', icon: 'key', load: () => import('./tools/password-generator') },
  { slug: 'spreadsheet-convert', name: 'CSV, Excel & JSON', blurb: 'Rows and columns, in whichever shape you need.', category: 'Utility', icon: 'table', takes: '.xlsx,.xls,.ods,.csv,.tsv,.json', load: () => import('./tools/spreadsheet-convert') },
  { slug: 'barcode-scanner', name: 'QR & barcode scanner', blurb: 'Point, scan, and see what it says.', category: 'Utility', icon: 'barcode', takes: IMAGE_ACCEPT, load: () => import('./tools/barcode-scanner') },
  { slug: 'hash', name: 'Hash calculator', blurb: 'Find the unique fingerprint of your file.', category: 'Utility', icon: 'hash', load: () => import('./tools/hash') },
  { slug: 'base64', name: 'Base64', blurb: 'Encode it, decode it, carry on.', category: 'Utility', icon: 'code', load: () => import('./tools/base64') },
  { slug: 'json-formatter', name: 'JSON formatter', blurb: 'Tidy, check and minify in a blink.', category: 'Utility', icon: 'braces', load: () => import('./tools/json-formatter') },
  { slug: 'text-diff', name: 'Compare text', blurb: 'Spot every change between two versions.', category: 'Utility', icon: 'diff', load: () => import('./tools/text-diff') },
  { slug: 'word-counter', name: 'Word counter', blurb: 'Words, characters and reading time, as you type.', category: 'Utility', icon: 'count', load: () => import('./tools/word-counter') },
]

export const CATEGORIES: [Category | 'all', string, IconName][] = [
  ['all', 'All tools', 'grid'],
  ['PDF', 'PDF', 'file'],
  ['Media', 'Audio & video', 'music'],
  ['Image', 'Images', 'image'],
  ['Generate', 'Generators', 'award'],
  ['Utility', 'Utilities', 'hash'],
]

export const CAT_LABEL: Record<Category, string> = { PDF: 'PDF', Media: 'Audio & video', Image: 'Images', Generate: 'Generators', Utility: 'Utilities' }
