import type { ComponentType } from 'react'
import type { IconName } from './components/Icon'
import { IMAGE_ACCEPT } from './lib/image'
import { AUDIO_ACCEPT, VIDEO_ACCEPT } from './lib/media'

const PDF = '.pdf,application/pdf'

export type Category = 'PDF' | 'Media' | 'Image' | 'Generate' | 'Utility'

export type Tool = {
  slug: string // URL: /<slug>
  name: string
  blurb: string // one line, shown on the card and tool page
  /** What someone would search for, as a phrase: the page title and the start of the meta description. */
  seo: string
  /** Extra words the toolbox search matches. */
  keywords: string
  /** What goes in and what comes out, shown on the toolbox card. */
  io: string
  category: Category
  icon: IconName
  /** What its drop zone takes (an `accept` string), so another tool's result can be handed over. */
  takes?: string
  /** Missing until the tool is built; the card and route then say "Coming soon". */
  load?: () => Promise<{ default: ComponentType }>
}

/** Single source for the home grid, routes, titles and descriptions. */
export const TOOLS: Tool[] = [
  { slug: 'pdf-merge', name: 'Merge PDF', blurb: 'Bring separate pages into one happy file.', category: 'PDF', icon: 'merge', seo: 'Merge PDF files', keywords: 'combine join bundle documents assignment', io: 'PDFs → one PDF', takes: PDF, load: () => import('./tools/pdf-merge') },
  { slug: 'mp4-to-mp3', name: 'MP4 to MP3', blurb: 'Keep the sound. Leave the video.', category: 'Media', icon: 'music', seo: 'Convert MP4 to MP3', keywords: 'extract audio music sound', io: 'Video → MP3', takes: VIDEO_ACCEPT, load: () => import('./tools/mp4-to-mp3') },
  { slug: 'certify', name: 'Bulk certificates', blurb: 'One template. A well-deserved PDF for everyone.', category: 'Generate', icon: 'award', seo: 'Generate certificates in bulk', keywords: 'college event award names batch participants', io: 'Template + names → PDFs', load: () => import('./tools/certify') },
  { slug: 'image-compress', name: 'Compress image', blurb: 'A smaller file. The same big picture.', category: 'Image', icon: 'compress', seo: 'Compress JPG, PNG and WebP images', keywords: 'photo smaller reduce shrink kb size', io: 'Images → smaller images', takes: IMAGE_ACCEPT, load: () => import('./tools/image-compress') },
  { slug: 'pdf-split', name: 'Split PDF', blurb: 'Just the pages you need. Nothing extra.', category: 'PDF', icon: 'scissors', seo: 'Split a PDF into pages', keywords: 'extract separate cut pages', io: 'PDF → pages', takes: PDF, load: () => import('./tools/pdf-split') },
  { slug: 'image-convert', name: 'Convert image', blurb: 'A fresh format for your favourite images.', category: 'Image', icon: 'convert', seo: 'Convert HEIC, JPG, PNG and WebP images', keywords: 'photo change format heic jpg png webp avif', io: 'Image → JPG · PNG · WebP', takes: IMAGE_ACCEPT, load: () => import('./tools/image-convert') },
  { slug: 'pdf-organize', name: 'Organize pages', blurb: 'Reorder, rotate, and find your flow.', category: 'PDF', icon: 'sort', seo: 'Reorder, rotate and delete PDF pages', keywords: 'arrange sort delete rotate remove pages', io: 'PDF → reordered PDF', takes: PDF, load: () => import('./tools/pdf-organize') },
  { slug: 'images-to-pdf', name: 'Images to PDF', blurb: 'Turn a collection of pictures into a PDF.', category: 'PDF', icon: 'image', seo: 'Convert images to PDF', keywords: 'photos jpg png scans assignment combine', io: 'Images → PDF', takes: IMAGE_ACCEPT, load: () => import('./tools/images-to-pdf') },
  { slug: 'pdf-to-images', name: 'PDF to images', blurb: 'Give every page a picture-perfect format.', category: 'PDF', icon: 'image', seo: 'Convert PDF to JPG or PNG', keywords: 'jpg png export photos pages', io: 'PDF → JPG · PNG', takes: PDF, load: () => import('./tools/pdf-to-images') },
  { slug: 'pdf-sign', name: 'Sign PDF', blurb: 'Your signature. Right where it belongs.', category: 'PDF', icon: 'pen', seo: 'Sign a PDF', keywords: 'signature e-sign application', io: 'PDF → signed PDF', takes: PDF, load: () => import('./tools/pdf-sign') },
  { slug: 'pdf-watermark', name: 'Watermark', blurb: 'Put your own mark on every page.', category: 'PDF', icon: 'water', seo: 'Add a watermark to a PDF', keywords: 'stamp branding text', io: 'PDF → stamped PDF', takes: PDF, load: () => import('./tools/pdf-watermark') },
  { slug: 'pdf-page-numbers', name: 'Page numbers', blurb: 'Every page, counted and in its place.', category: 'PDF', icon: 'hash', seo: 'Add page numbers to a PDF', keywords: 'paginate numbering assignment', io: 'PDF → numbered PDF', takes: PDF, load: () => import('./tools/pdf-page-numbers') },
  { slug: 'trim-media', name: 'Trim audio & video', blurb: 'Make the cut. Keep the good part.', category: 'Media', icon: 'scissors', seo: 'Trim video and audio', keywords: 'cut shorten clip', io: 'Video · Audio → clip', takes: `${VIDEO_ACCEPT},${AUDIO_ACCEPT}`, load: () => import('./tools/trim-media') },
  { slug: 'video-converter', name: 'Video converter', blurb: 'Find a format that plays nicely.', category: 'Media', icon: 'video', seo: 'Convert video to MP4, WebM or MOV', keywords: 'mp4 webm mov avi mkv', io: 'Video → MP4 · WebM · MOV', takes: VIDEO_ACCEPT, load: () => import('./tools/video-converter') },
  { slug: 'compress-video', name: 'Compress video', blurb: 'Make room without losing the moment.', category: 'Media', icon: 'compress', seo: 'Compress a video', keywords: 'reduce size smaller shrink mb', io: 'Video → smaller video', takes: VIDEO_ACCEPT, load: () => import('./tools/compress-video') },
  { slug: 'audio-converter', name: 'Audio converter', blurb: 'Any sound, in the format you need.', category: 'Media', icon: 'convert', seo: 'Convert audio to MP3, WAV or AAC', keywords: 'mp3 wav aac m4a ogg flac music', io: 'Audio → MP3 · WAV · AAC', takes: AUDIO_ACCEPT, load: () => import('./tools/audio-converter') },
  { slug: 'video-to-gif', name: 'Video to GIF', blurb: 'A moment, on a loop.', category: 'Media', icon: 'image', seo: 'Convert video to GIF', keywords: 'animation animated', io: 'Video → GIF', takes: VIDEO_ACCEPT, load: () => import('./tools/video-to-gif') },
  { slug: 'mute-video', name: 'Mute video', blurb: 'Keep the picture. Lose the noise.', category: 'Media', icon: 'mute', seo: 'Remove audio from a video', keywords: 'silent remove sound', io: 'Video → silent video', takes: VIDEO_ACCEPT, load: () => import('./tools/mute-video') },
  { slug: 'recorder', name: 'Screen recorder', blurb: 'Capture your screen, webcam, or voice.', category: 'Media', icon: 'record', seo: 'Record your screen, webcam or voice', keywords: 'capture webcam microphone presentation', io: 'Screen · Camera · Mic', load: () => import('./tools/recorder') },
  { slug: 'image-resize', name: 'Resize image', blurb: 'Just the right size, a whole batch at once.', category: 'Image', icon: 'resize', seo: 'Resize images in bulk', keywords: 'photo size pixels width height dimensions application', io: 'Images → new size', takes: IMAGE_ACCEPT, load: () => import('./tools/image-resize') },
  { slug: 'image-crop', name: 'Crop image', blurb: 'Frame the part worth keeping.', category: 'Image', icon: 'crop', seo: 'Crop an image', keywords: 'photo cut frame trim', io: 'Image → cropped image', takes: IMAGE_ACCEPT, load: () => import('./tools/image-crop') },
  { slug: 'exif-remove', name: 'Remove photo data', blurb: 'Keep the photo. Leave the metadata.', category: 'Image', icon: 'location', seo: 'Remove EXIF and GPS data from photos', keywords: 'exif metadata privacy gps location', io: 'Photo → clean photo', takes: IMAGE_ACCEPT, load: () => import('./tools/exif-remove') },
  { slug: 'favicon-generator', name: 'Favicon maker', blurb: 'Your logo, tab-sized and ready.', category: 'Image', icon: 'star', seo: 'Make a favicon from an image', keywords: 'icon website ico logo', io: 'Logo → site icons', takes: IMAGE_ACCEPT, load: () => import('./tools/favicon-generator') },
  { slug: 'qr-generator', name: 'QR code maker', blurb: 'A little square with somewhere to go.', category: 'Generate', icon: 'qr', seo: 'Make a QR code', keywords: 'link url share wifi event', io: 'Link · Text → QR', load: () => import('./tools/qr-generator') },
  { slug: 'pdf-compress', name: 'Compress PDF', blurb: 'A lighter PDF that still looks the part.', category: 'PDF', icon: 'compress', seo: 'Compress a PDF', keywords: 'reduce size smaller shrink mb', io: 'PDF → smaller PDF', takes: PDF, load: () => import('./tools/pdf-compress') },
  { slug: 'pdf-fill-form', name: 'Fill PDF form', blurb: 'Fill it in, no printer required.', category: 'PDF', icon: 'form', seo: 'Fill in a PDF form', keywords: 'application edit fields', io: 'Form → filled PDF', takes: PDF, load: () => import('./tools/pdf-fill-form') },
  { slug: 'pdf-annotate', name: 'Annotate PDF', blurb: 'Notes, highlights and boxes, right on the page.', category: 'PDF', icon: 'highlight', seo: 'Annotate and highlight a PDF', keywords: 'markup comment draw edit study notes', io: 'PDF → marked-up PDF', takes: PDF, load: () => import('./tools/pdf-annotate') },
  { slug: 'pdf-redact', name: 'Redact PDF', blurb: 'Black it out. Gone for good.', category: 'PDF', icon: 'redact', seo: 'Redact a PDF', keywords: 'hide censor black out privacy', io: 'PDF → redacted PDF', takes: PDF, load: () => import('./tools/pdf-redact') },
  { slug: 'pdf-protect', name: 'Protect PDF', blurb: 'A password between your PDF and prying eyes.', category: 'PDF', icon: 'lock', seo: 'Password-protect a PDF', keywords: 'encrypt security private', io: 'PDF → locked PDF', takes: PDF, load: () => import('./tools/pdf-protect') },
  { slug: 'pdf-unlock', name: 'Unlock PDF', blurb: 'Know the password? Lose the prompt.', category: 'PDF', icon: 'unlock', seo: 'Remove a PDF password', keywords: 'decrypt password', io: 'Locked PDF → PDF', takes: PDF, load: () => import('./tools/pdf-unlock') },
  { slug: 'pdf-ocr', name: 'PDF OCR', blurb: 'Turn scanned pages into searchable text.', category: 'PDF', icon: 'scan', seo: 'Make scanned PDFs searchable with OCR', keywords: 'extract text scan recognition hindi english', io: 'Scan → searchable PDF', takes: PDF, load: () => import('./tools/pdf-ocr') },
  { slug: 'pdf-to-text', name: 'PDF to text', blurb: 'Every word, none of the formatting fuss.', category: 'PDF', icon: 'text', seo: 'Extract text from a PDF', keywords: 'copy read words txt', io: 'PDF → TXT', takes: PDF, load: () => import('./tools/pdf-to-text') },
  { slug: 'pdf-metadata', name: 'PDF properties', blurb: 'See, change or wipe the hidden details.', category: 'PDF', icon: 'info', seo: 'View and edit PDF metadata', keywords: 'title author properties privacy', io: 'PDF → clean details', takes: PDF, load: () => import('./tools/pdf-metadata') },
  { slug: 'invitations', name: 'Bulk invitations', blurb: 'Every guest, personally invited.', category: 'Generate', icon: 'mail', seo: 'Make personalised invitations in bulk', keywords: 'college event invite guests batch', io: 'Template + names → PDFs', load: () => import('./tools/certify/invitations') },
  { slug: 'password-generator', name: 'Password generator', blurb: 'Strong, random, and only ever yours.', category: 'Generate', icon: 'key', seo: 'Generate strong passwords', keywords: 'secure random security', io: 'No file needed', load: () => import('./tools/password-generator') },
  { slug: 'spreadsheet-convert', name: 'CSV, Excel & JSON', blurb: 'Rows and columns, in whichever shape you need.', category: 'Utility', icon: 'table', seo: 'Convert CSV, Excel and JSON files', keywords: 'xlsx xls table rows sheet', io: 'CSV ⇄ XLSX ⇄ JSON', takes: '.xlsx,.xls,.ods,.csv,.tsv,.json', load: () => import('./tools/spreadsheet-convert') },
  { slug: 'barcode-scanner', name: 'QR & barcode scanner', blurb: 'Point, scan, and see what it says.', category: 'Utility', icon: 'barcode', seo: 'Scan QR codes and barcodes', keywords: 'decode camera read', io: 'Camera · Image → text', takes: IMAGE_ACCEPT, load: () => import('./tools/barcode-scanner') },
  { slug: 'hash', name: 'Hash calculator', blurb: 'Find the unique fingerprint of your file.', category: 'Utility', icon: 'hash', seo: 'Calculate MD5 and SHA file hashes', keywords: 'checksum sha256 integrity verify', io: 'File → MD5 · SHA', load: () => import('./tools/hash') },
  { slug: 'base64', name: 'Base64', blurb: 'Encode it, decode it, carry on.', category: 'Utility', icon: 'code', seo: 'Encode and decode Base64', keywords: 'encoding decoding developer', io: 'Text · File ⇄ Base64', load: () => import('./tools/base64') },
  { slug: 'json-formatter', name: 'JSON formatter', blurb: 'Tidy, check and minify in a blink.', category: 'Utility', icon: 'braces', seo: 'Format and validate JSON', keywords: 'pretty beautify minify developer', io: 'JSON → tidy JSON', load: () => import('./tools/json-formatter') },
  { slug: 'text-diff', name: 'Compare text', blurb: 'Spot every change between two versions.', category: 'Utility', icon: 'diff', seo: 'Compare two texts', keywords: 'difference diff versions drafts', io: 'Two texts → changes', load: () => import('./tools/text-diff') },
  { slug: 'word-counter', name: 'Word counter', blurb: 'Words, characters and reading time, as you type.', category: 'Utility', icon: 'count', seo: 'Count words and characters', keywords: 'essay assignment length writing reading time', io: 'Text → counts', load: () => import('./tools/word-counter') },
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
export const CAT_CAPTION: Record<Category, string> = {
  PDF: 'A little order for every page.',
  Media: 'Keep the parts that matter.',
  Image: 'The right picture, the right size.',
  Generate: 'For the things you bring people together for.',
  Utility: 'Small helpers for everyday details.',
}

/** The toolbox section id (and /tools#<id> link) for a category. */
export const kindId = (c: Category) => c.toLowerCase()

/** Hand-picked tool sets for an everyday job, in the order you'd use them. Linked as /tools#day-<id>. */
export const FLOWS: { id: string; icon: IconName; title: string; text: string; note: string; slugs: string[] }[] = [
  {
    id: 'assignment',
    icon: 'file',
    title: 'Finish an assignment',
    text: 'Bring your pages together. Get it ready to submit.',
    note: 'Scan, merge, number and shrink. Pick the next step.',
    slugs: ['images-to-pdf', 'pdf-merge', 'pdf-organize', 'pdf-annotate', 'pdf-page-numbers', 'pdf-compress', 'word-counter'],
  },
  {
    id: 'apply',
    icon: 'pen',
    title: 'Ready to apply',
    text: 'Photos, forms and signatures, all in good shape.',
    note: 'Get your photo, forms and documents to the size they ask for.',
    slugs: ['image-resize', 'image-crop', 'image-compress', 'pdf-fill-form', 'pdf-sign', 'pdf-compress'],
  },
  {
    id: 'event',
    icon: 'award',
    title: 'Make an event happen',
    text: 'A personal invitation. A well-earned certificate.',
    note: 'Invite everyone, recognise everyone, and make sharing simple.',
    slugs: ['invitations', 'qr-generator', 'barcode-scanner', 'certify', 'spreadsheet-convert'],
  },
]

export const SITE = 'https://noritus.dpdns.org'
export const HOME_TITLE = 'Noritus — Free PDF, image, audio & video tools that never upload your files'
export const HOME_DESC = `${TOOLS.length} free file tools that run entirely in your browser: merge and compress PDFs, convert video to MP3, resize photos, make certificates. No upload, no sign-up.`
export const TOOLS_TITLE = `All ${TOOLS.length} free file tools — PDF, image, audio & video | Noritus`
export const TOOLS_DESC = `Browse ${TOOLS.length} free tools that run in your browser: merge, split and compress PDFs, convert video and audio, resize photos and more. Nothing is uploaded.`
export const PRIVACY_TITLE = 'Privacy — Your files never leave your device | Noritus'
export const PRIVACY_DESC = 'How Noritus keeps your files on your device: no uploads, no file data on any server, no trackers. Check it yourself in the Network tab.'
export const pageTitle = (t: Tool) => `${t.seo} — Free, No Upload | Noritus`
export const pageDesc = (t: Tool) => `${t.seo} for free, right in your browser. ${t.blurb} Nothing is uploaded: your files never leave your device.`
