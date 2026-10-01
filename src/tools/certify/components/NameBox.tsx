import { useRef } from 'react'
import type { Box } from '../lib/layoutName'
import { useApp, type Field } from '../store/appStore'

/** Smallest box the user can drag down to, as a fraction of the template. */
const MIN_W = 0.05
const MIN_H = 0.03
/** Snap when the box centre is within this fraction of a template midline. */
const SNAP = 0.008

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

type Snap = { x: boolean; y: boolean }

type Props = {
  field: Field
  box: Box
  label: string
  /** Template pixels per fraction, for 1px keyboard nudges. */
  templateWidth: number
  templateHeight: number
  onSnap: (snap: Snap) => void
}

export default function NameBox({
  field,
  box,
  label,
  templateWidth,
  templateHeight,
  onSnap,
}: Props) {
  const setBox = useApp((s) => s.setBox)
  const snapshot = useApp((s) => s.snapshot)
  const ref = useRef<HTMLDivElement>(null)

  const startDrag = (mode: 'move' | 'tl' | 'br') => (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    const stage = ref.current?.parentElement?.getBoundingClientRect()
    if (!stage) return

    // One undo step per gesture.
    snapshot()
    const start = { ...box }
    const x0 = e.clientX
    const y0 = e.clientY
    ;(e.target as Element).setPointerCapture?.(e.pointerId)

    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - x0) / stage.width
      const dy = (ev.clientY - y0) / stage.height
      let next: Box
      const snap: Snap = { x: false, y: false }

      if (mode === 'move') {
        const w = start.r - start.l
        const h = start.b - start.t
        let l = clamp(start.l + dx, 0, 1 - w)
        let t = clamp(start.t + dy, 0, 1 - h)
        // Alt suspends snapping for fine placement.
        if (!ev.altKey) {
          if (Math.abs(l + w / 2 - 0.5) < SNAP) {
            l = 0.5 - w / 2
            snap.x = true
          }
          if (Math.abs(t + h / 2 - 0.5) < SNAP) {
            t = 0.5 - h / 2
            snap.y = true
          }
        }
        next = { l, t, r: l + w, b: t + h }
      } else if (mode === 'br') {
        next = {
          ...start,
          r: clamp(start.r + dx, start.l + MIN_W, 1),
          b: clamp(start.b + dy, start.t + MIN_H, 1),
        }
      } else {
        next = {
          ...start,
          l: clamp(start.l + dx, 0, start.r - MIN_W),
          t: clamp(start.t + dy, 0, start.b - MIN_H),
        }
      }
      setBox(field, next)
      onSnap(snap)
    }

    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      onSnap({ x: false, y: false })
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  /** Arrows nudge by one template pixel, Shift by ten. Alt+arrows resize. */
  const onKeyDown = (e: React.KeyboardEvent) => {
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }
    const d = deltas[e.key]
    if (!d) return
    e.preventDefault()
    e.stopPropagation()
    const step = e.shiftKey ? 10 : 1
    const dx = (d[0] * step) / templateWidth
    const dy = (d[1] * step) / templateHeight
    snapshot()

    if (e.altKey) {
      setBox(field, {
        ...box,
        r: clamp(box.r + dx, box.l + MIN_W, 1),
        b: clamp(box.b + dy, box.t + MIN_H, 1),
      })
      return
    }
    const w = box.r - box.l
    const h = box.b - box.t
    const l = clamp(box.l + dx, 0, 1 - w)
    const t = clamp(box.t + dy, 0, 1 - h)
    setBox(field, { l, t, r: l + w, b: t + h })
  }

  return (
    <div
      ref={ref}
      className={`box${field === 'second' ? ' second' : ''}`}
      tabIndex={0}
      role="application"
      aria-label={`${label} area — drag to move, arrow keys nudge by 1px, Shift for 10px, Alt+arrows resize`}
      style={{
        left: `${box.l * 100}%`,
        top: `${box.t * 100}%`,
        width: `${(box.r - box.l) * 100}%`,
        height: `${(box.b - box.t) * 100}%`,
      }}
      onPointerDown={startDrag('move')}
      onKeyDown={onKeyDown}
    >
      <span className="box-label">{label}</span>
      <span className="handle tl" onPointerDown={startDrag('tl')} />
      <span className="handle br" onPointerDown={startDrag('br')} />
    </div>
  )
}
