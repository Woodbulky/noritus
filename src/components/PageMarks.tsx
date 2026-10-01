import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as RPointerEvent, type ReactNode } from 'react'
import { thumbnail, type PdfDoc } from '../lib/pdfjs'

/** A box on a page, as fractions of the displayed page from its top-left corner. */
export type Box = { id: number; page: number; l: number; t: number; w: number; h: number }
type Area = Omit<Box, 'id' | 'page'>

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)
const fit = (a: Area): Area => {
  const w = clamp(a.w, 0.01, 1)
  const h = clamp(a.h, 0.01, 1)
  return { w, h, l: clamp(a.l, 0, 1 - w), t: clamp(a.t, 0, 1 - h) }
}

let seq = 0

/**
 * One page at a time with boxes drawn on it. Drag on the page to draw a box;
 * drag a box to move it and its corner to resize. With the keyboard: “Add a
 * box”, then arrows move it, Alt+arrows resize, Delete removes.
 * `scale` given to `children` is preview pixels per PDF point.
 */
export function PageMarks<B extends Box>({
  doc,
  boxes,
  onChange,
  selected,
  onSelect,
  create,
  paint,
  children,
}: {
  doc: PdfDoc
  boxes: B[]
  onChange: (boxes: B[]) => void
  selected: number | null
  onSelect: (id: number | null) => void
  create: (page: number, area: Area) => Omit<B, 'id'>
  paint: (b: B) => CSSProperties
  children?: (b: B, scale: number) => ReactNode
}) {
  const [page, setPage] = useState(0)
  const [preview, setPreview] = useState<{ url: string; points: number } | null>(null)
  const [draft, setDraft] = useState<Area | null>(null)
  const [width, setWidth] = useState(0)
  const stage = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let live = true
    ;(async () => {
      const p = await doc.getPage(page + 1)
      const url = await thumbnail(doc, page + 1, 1000)
      if (live) setPreview({ url, points: p.getViewport({ scale: 1 }).width })
    })()
    return () => {
      live = false
    }
  }, [doc, page])

  useEffect(() => {
    const el = stage.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [preview])

  const update = (id: number, a: Area) => onChange(boxes.map((b) => (b.id === id ? { ...b, ...fit(a) } : b)))
  const remove = (id: number) => {
    onChange(boxes.filter((b) => b.id !== id))
    onSelect(null)
  }
  const add = (a: Area) => {
    const b = { ...create(page, fit(a)), id: ++seq } as B
    onChange([...boxes, b])
    onSelect(b.id)
  }

  const at = (e: { clientX: number; clientY: number }) => {
    const r = stage.current!.getBoundingClientRect()
    return { x: clamp((e.clientX - r.left) / r.width, 0, 1), y: clamp((e.clientY - r.top) / r.height, 0, 1) }
  }

  /** Pointer drag: draw (no box), move, or resize (corner). */
  const drag = (e: RPointerEvent, box: B | null, resize = false) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    const from = at(e)
    let area: Area | null = null
    if (box) onSelect(box.id)
    const move = (ev: PointerEvent) => {
      const p = at(ev)
      const dx = p.x - from.x
      const dy = p.y - from.y
      if (!box) setDraft((area = { l: Math.min(from.x, p.x), t: Math.min(from.y, p.y), w: Math.abs(dx), h: Math.abs(dy) }))
      else update(box.id, resize ? { ...box, w: box.w + dx, h: box.h + dy } : { ...box, l: box.l + dx, t: box.t + dy })
    }
    const up = () => {
      removeEventListener('pointermove', move)
      removeEventListener('pointerup', up)
      setDraft(null)
      if (area && area.w > 0.01 && area.h > 0.008) add(area)
      else if (!box) onSelect(null)
    }
    addEventListener('pointermove', move)
    addEventListener('pointerup', up)
  }

  const keys = (e: KeyboardEvent, b: B) => {
    if (e.key === 'Delete' || e.key === 'Backspace') return (e.preventDefault(), remove(b.id))
    const d = e.shiftKey ? 0.05 : 0.01
    const k: Record<string, [number, number]> = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }
    if (!k[e.key]) return
    e.preventDefault()
    const [x, y] = k[e.key]
    update(b.id, e.altKey ? { ...b, w: b.w + x, h: b.h + y } : { ...b, l: b.l + x, t: b.t + y })
  }

  const here = boxes.filter((b) => b.page === page)
  const scale = preview && width ? width / preview.points : 1
  const count = (n: number) => boxes.filter((b) => b.page === n).length

  return (
    <>
      {preview ? (
        <div className="sign-stage marks-stage" ref={stage} onPointerDown={(e) => drag(e, null)}>
          <img src={preview.url} alt={`Page ${page + 1}`} draggable={false} />
          {here.map((b) => (
            <div
              key={b.id}
              className={b.id === selected ? 'mark-box picked' : 'mark-box'}
              role="group"
              tabIndex={0}
              aria-label="Box. Drag, or use the arrow keys to move it; Alt with arrows resizes; Delete removes."
              onFocus={() => onSelect(b.id)}
              onKeyDown={(e) => keys(e, b)}
              onPointerDown={(e) => drag(e, b)}
              style={{ left: `${b.l * 100}%`, top: `${b.t * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%`, ...paint(b) }}
            >
              {children?.(b, scale)}
              <span className="sign-handle" aria-hidden="true" onPointerDown={(e) => drag(e, b, true)} />
            </div>
          ))}
          {draft && <div className="mark-box draft" style={{ left: `${draft.l * 100}%`, top: `${draft.t * 100}%`, width: `${draft.w * 100}%`, height: `${draft.h * 100}%` }} />}
        </div>
      ) : (
        <p className="file-empty">Opening the page…</p>
      )}
      <div className="pager-row">
        <button className="btn btn-outline btn-small" disabled={page === 0} onClick={() => setPage(page - 1)}>
          ← Previous
        </button>
        <span className="muted">
          Page {page + 1} of {doc.numPages}
          {count(page) ? ` · ${count(page)} here` : ''}
        </span>
        <button className="btn btn-outline btn-small" disabled={page === doc.numPages - 1} onClick={() => setPage(page + 1)}>
          Next →
        </button>
      </div>
      <div className="pager-row">
        <button className="text-link" onClick={() => add({ l: 0.3, t: 0.4, w: 0.4, h: 0.08 })}>
          + Add a box on this page
        </button>
        {selected !== null && boxes.some((b) => b.id === selected) && (
          <button className="text-link" onClick={() => remove(selected)}>
            Remove the selected box
          </button>
        )}
      </div>
    </>
  )
}
