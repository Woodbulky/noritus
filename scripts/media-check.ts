/** ffmpeg argument builders and parsers. Imported by check.ts. (Every builder was also run against native ffmpeg when written.) */
import assert from 'node:assert/strict'
import { audioArgs, canCopy, compressArgs, convertArgs, formatTime, keepExt, logTime, muteArgs, parseInfo, parseTime, readRange, targetKbps, trimArgs } from '../src/lib/media'

// --- probe log ---
const log = `Input #0, mov,mp4,m4a,3gp,3g2,mj2, from '/in/input.mp4':
  Duration: 00:01:02.50, start: 0.000000, bitrate: 133 kb/s
  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p, 640x360, 25 fps
  Stream #0:1[0x2](und): Audio: aac (LC) (mp4a / 0x6134706D), 44100 Hz, mono
At least one output file must be specified`
assert.deepEqual(parseInfo(log), { duration: 62.5, video: 'h264', audio: 'aac' })
const mp3 = `  Duration: 00:00:05.00, start: 0.025057, bitrate: 64 kb/s
  Stream #0:0: Audio: mp3 (mp3float), 44100 Hz, mono, fltp, 64 kb/s
  Stream #0:1: Video: mjpeg (Baseline), yuvj420p, 300x300, 90k tbn (attached pic)`
assert.deepEqual(parseInfo(mp3), { duration: 5, video: '', audio: 'mp3' }, 'cover art is not video')
assert.deepEqual(parseInfo('  Duration: N/A, bitrate: N/A'), { duration: null, video: '', audio: '' })
assert.equal(logTime('frame=  50 fps=0.0 q=28.0 size=  256kB time=00:01:02.50 bitrate= 33.5kbits/s'), 62.5)
assert.equal(logTime('size=N/A time=-00:00:00.02 bitrate=N/A'), null)
assert.equal(logTime('nothing here'), null)

// --- times ---
assert.equal(parseTime('90'), 90)
assert.equal(parseTime('1:30.5'), 90.5)
assert.equal(parseTime(' 0:01:30 '), 90)
for (const bad of ['', ' ', 'a', '1::2', '1:2:3:4', '-5', '1,5']) assert.equal(parseTime(bad), null, bad)
assert.equal(formatTime(62.5), '1:02.5')
assert.equal(formatTime(5), '0:05')
assert.equal(formatTime(3723), '1:02:03')
assert.equal(parseTime(formatTime(3723.4)), 3723.4)
assert.deepEqual(readRange('', '', null), { start: 0, end: null })
assert.deepEqual(readRange('1:00', '2:00', 300), { start: 60, end: 120 })
assert.deepEqual(readRange('10', '999', 300), { start: 10, end: null }, 'an end past the clip means to the end')
assert.match(readRange('2:00', '1:00', null) as string, /after the start/)
assert.match(readRange('400', '', 300) as string, /past the end/)
assert.match(readRange('x', '', null) as string, /Start should/)

// --- builders ---
const h264 = { duration: 10, video: 'h264', audio: 'aac' }
assert.equal(canCopy('mp4', h264), true)
assert.equal(canCopy('mp4', { duration: 10, video: 'h264', audio: '' }), true, 'no audio is fine')
assert.equal(canCopy('mp4', { duration: 10, video: 'vp9', audio: 'opus' }), false)
assert.equal(canCopy('webm', h264), false)
assert.equal(canCopy('mkv', { duration: 10, video: 'mpeg4', audio: 'pcm_s16le' }), true)
assert.equal(convertArgs('/in', '/o.mp4', 'mp4', h264).length, 2, 'copy, then encode')
assert.equal(convertArgs('/in', '/o.webm', 'webm', h264).length, 1, 'encode only')
assert.ok(convertArgs('/in', '/o.mp4', 'mp4', h264)[0].includes('copy'))
assert.ok(audioArgs('mp3', 320).join(' ').includes('libmp3lame -b:a 320k'))
assert.ok(!audioArgs('flac').includes('-b:a'))
assert.equal(keepExt('clip.MOV', true), 'mov')
assert.equal(keepExt('clip.avi', true), 'mkv')
assert.equal(keepExt('song.wma', false), 'm4a')
assert.equal(keepExt('song.mp3', false), 'mp3')
assert.equal(trimArgs('/in', '/o.mp4', 0, null, true, true)[0][0], '-i', 'no -ss/-to when cutting nothing')
assert.deepEqual(trimArgs('/in', '/o.mp4', 1.5, 4, false, true)[0].slice(0, 4), ['-ss', '1.5', '-to', '4'])
assert.equal(trimArgs('/in', '/o.mp3', 1, 2, true, false).length, 1)
assert.ok(muteArgs('/in', '/o.webm')[0].join(' ').includes('-map -0:a -c copy'))
assert.equal(targetKbps(10, 60), 1269)
assert.equal(targetKbps(1, 600), null)
assert.ok(compressArgs('/in', '/o.mp4', { height: 720, targetMB: 10, duration: 60 }).includes('1269k'))
assert.throws(() => compressArgs('/in', '/o.mp4', { height: 720, targetMB: 1, duration: 600 }), /at least 15 MB/)

console.log('media: ok')
