import { useEffect, useRef, useState } from 'react'
import type { Font } from 'fontkit'
import NameBox from './NameBox'
import SnapGuides from './SnapGuides'
import { ChevronLeft, ChevronRight } from './icons'
import { layoutName, paintRun, type Layout, type TextStyle } from '../lib/layoutName'
import { certId, qrMatrix, qrPayload, qrRect, qrRuns, quietZone } from '../lib/verify'
import type { Template } from '../lib/loadTemplate'
import { useApp, type Zoom } from '../store/appStore'

const ZOOMS: { v: Zoom; label: string }[] = [
  { v: 'fit', label: 'Fit' },
  { v: 1, label: '100%' },
  { v: 1.5, label: '150%' },
]

/** Placeholder shown before any names exist, so the layout is still adjustable. */
const SAMPLE = 'AARAV SHARMA'

type Props = {
  template: Template
  editing: boolean
  /** Same layout the PDF writer will use, for the notes under the title. */
  layout: Layout | null
  secondLayout: Layout | null
}

export default function PreviewStage({ template, editing, layout, secondLayout }: Props) {
  const style = useApp((s) => s.style)
  const second = useApp((s) => s.second)
  const secondOn = useApp((s) => s.secondOn)
  const nameFont = useApp((s) => s.nameFont)
  const secondFont = useApp((s) => s.secondFont)
  const names = useApp((s) => s.names)
  const idx = useApp((s) => s.idx)
  const qr = useApp((s) => s.qr)
  const verifyLink = useApp((s) => s.verifyLink)
  const event = useApp((s) => s.event)
  const setIdx = useApp((s) => s.setIdx)
  const stepIdx = useApp((s) => s.stepIdx)
  const zoom = useApp((s) => s.zoom)
  const setZoom = useApp((s) => s.setZoom)

  const scroll = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [cssWidth, setCssWidth] = useState(0)
  const [snap, setSnap] = useState({ x: false, y: false })

  // --- sizing --------------------------------------------------------------
  useEffect(() => {
    const el = stage.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setCssWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // --- paint ---------------------------------------------------------------
  useEffect(() => {
    const el = canvas.current
    if (!el || !cssWidth) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const cssHeight = (cssWidth * template.height) / template.width
    el.width = Math.round(cssWidth * dpr)
    el.height = Math.round(cssHeight * dpr)
    const ctx = el.getContext('2d')
    if (!ctx) return

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssWidth, cssHeight)
    ctx.drawImage(template.bitmap, 0, 0, cssWidth, cssHeight)

    const scale = cssWidth / template.width
    /** Same glyphs, same numbers the PDF writer gets. */
    const paint = (font: Font | null, place: Layout | null, colour: string) => {
      if (font && place) paintRun(ctx, font, place, colour, scale)
    }

    paint(nameFont, layout, style.color)
    if (secondOn) paint(secondFont, secondLayout, second.color)

    // Same placement and the same merged runs the PDF writer uses.
    if (qr.on) {
      const place = qrRect(qr, template.width, template.height)
      const m = qrMatrix(qrPayload(certId(names[idx] ?? SAMPLE, event), verifyLink))
      const unit = (place.side * scale) / m.length
      const quiet = quietZone(place.side, m.length) * scale
      const x0 = place.x * scale
      const y0 = place.y * scale
      ctx.fillStyle = qr.light
      ctx.fillRect(x0 - quiet, y0 - quiet, place.side * scale + quiet * 2, place.side * scale + quiet * 2)
      ctx.fillStyle = qr.dark
      for (const [r, c, len] of qrRuns(m)) {
        ctx.fillRect(x0 + c * unit, y0 + r * unit, len * unit, unit)
      }
    }
  }, [
    template,
    cssWidth,
    nameFont,
    secondFont,
    layout,
    secondLayout,
    style.color,
    second.color,
    secondOn,
    qr,
    verifyLink,
    event,
    names,
    idx,
  ])

  // --- pan when zoomed -----------------------------------------------------
  const zoomed = zoom !== 'fit'
  const onStagePointerDown = (e: React.PointerEvent) => {
    const box = scroll.current
    if (!zoomed || !box || (e.target as HTMLElement).closest('.box')) return
    const x0 = e.clientX
    const y0 = e.clientY
    const left = box.scrollLeft
    const top = box.scrollTop
    box.classList.add('panning')
    const move = (ev: PointerEvent) => {
      box.scrollLeft = left - (ev.clientX - x0)
      box.scrollTop = top - (ev.clientY - y0)
    }
    const up = () => {
      box.classList.remove('panning')
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  /** Left/right cycle names unless a box has focus (it uses arrows to nudge). */
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    if ((e.target as HTMLElement).classList.contains('box')) return
    e.preventDefault()
    stepIdx(e.key === 'ArrowRight' ? 1 : -1)
  }

  const longest = () => {
    if (names.length === 0 || !nameFont) return
    let best = 0
    let bestWidth = -1
    names.forEach((n, i) => {
      const w = layoutName(nameFont, n, { ...style, fit: false } as TextStyle, template.width, template.height).width
      if (w > bestWidth) {
        bestWidth = w
        best = i
      }
    })
    setIdx(best)
  }

  const px = (v: number) => Math.round(v)
  const stageWidth = zoom === 'fit' ? '100%' : `${template.width * (zoom as number)}px`

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <section className="stage-wrap" onKeyDown={onKeyDown}>
      <div className="stage-bar">
        <div className="stage-title">
          Preview
          {layout?.shrunk && <span className="tag warn">Shrunk to fit</span>}
          {layout?.overflows && <span className="tag warn">Too long for the box</span>}
          {names.length === 0 && <span className="tag">Sample name</span>}
        </div>

        <div className="pager">
          <div className="seg" role="group" aria-label="Zoom">
            {ZOOMS.map((z) => (
              <button
                key={String(z.v)}
                type="button"
                aria-pressed={zoom === z.v}
                onClick={() => setZoom(z.v)}
              >
                {z.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: '7px 12px', fontSize: 13 }}
            disabled={names.length === 0}
            onClick={longest}
          >
            Longest name
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Previous name"
            disabled={names.length === 0}
            onClick={() => stepIdx(-1)}
          >
            <ChevronLeft />
          </button>
          <span className="count">
            {names.length ? idx + 1 : 0} of {names.length}
          </span>
          <button
            type="button"
            className="icon-btn"
            aria-label="Next name"
            disabled={names.length === 0}
            onClick={() => stepIdx(1)}
          >
            <ChevronRight />
          </button>
        </div>
      </div>

      <div ref={scroll} className={`stage-scroll${zoomed ? ' pannable' : ''}`}>
        <div
          ref={stage}
          className={`stage${editing ? ' edit' : ''}`}
          style={{ width: stageWidth, maxWidth: zoomed ? 'none' : undefined }}
          onPointerDown={onStagePointerDown}
        >
          <canvas ref={canvas} className="art" />
          {editing && (
            <>
              <NameBox
                field="name"
                box={style.box}
                label="Name area"
                templateWidth={template.width}
                templateHeight={template.height}
                onSnap={setSnap}
              />
              {secondOn && (
                <NameBox
                  field="second"
                  box={second.box}
                  label="Second line"
                  templateWidth={template.width}
                  templateHeight={template.height}
                  onSnap={setSnap}
                />
              )}
              <SnapGuides x={snap.x} y={snap.y} />
            </>
          )}
        </div>
      </div>

      <div className="stage-foot">
        <span>
          Name area: x {px(style.box.l * template.width)}–{px(style.box.r * template.width)} px, y{' '}
          {px(style.box.t * template.height)}–{px(style.box.b * template.height)} px on the template
        </span>
        {layout && (
          <span>
            · {Math.round(layout.size)} pt, {Math.round(layout.width)} px wide
          </span>
        )}
      </div>
    </section>
  )
}

export { SAMPLE }
