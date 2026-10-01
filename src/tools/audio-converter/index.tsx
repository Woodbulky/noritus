import AudioConvert from '../../components/AudioConvert'
import { AUDIO_ACCEPT } from '../../lib/media'

const FAQ: [string, string][] = [
  ['Which formats can I convert?', 'MP3, WAV, M4A, AAC, OGG, Opus, FLAC, WMA and more go in. MP3, AAC (M4A), OGG, WAV or FLAC come out.'],
  ['Which quality should I pick?', '192 kbps sounds great for most listening. Pick 128 for voice and podcasts, or 320 for music you care about.'],
  ['Can I convert many files at once?', 'Yes. Drop them all in. You will get one ZIP with every converted file.'],
  ['Are my files uploaded?', 'No. The engine runs inside this tab and your audio never leaves your device.'],
]

export default function AudioConverter() {
  return <AudioConvert slug="audio-converter" accept={AUDIO_ACCEPT} what="audio files" faq={FAQ} />
}
