import AudioConvert from '../../components/AudioConvert'
import { VIDEO_ACCEPT } from '../../lib/media'

const FAQ: [string, string][] = [
  ['Which videos work?', 'MP4, MOV, MKV, WebM, AVI and most other common formats. If it has a sound track, Noritus can take it out.'],
  ['Which format should I pick?', 'MP3 plays everywhere. AAC sounds a little better at the same size. WAV and FLAC keep every detail but make bigger files.'],
  ['Why does it download something first?', 'The first time, your browser fetches the media engine (about 31 MB). It is cached after that, so the next visit starts right away.'],
  ['Is my video uploaded?', 'No. The engine runs inside this tab and your video never leaves your device.'],
]

export default function Mp4ToMp3() {
  return <AudioConvert slug="mp4-to-mp3" accept={VIDEO_ACCEPT} what="video files" faq={FAQ} />
}
