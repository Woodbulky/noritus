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

export const CAT_LABEL: Record<Category, string> = { PDF: 'PDF', Media: 'Audio & video', Image: 'Images', Generate: 'Generators', Utility: 'Utilities' }
