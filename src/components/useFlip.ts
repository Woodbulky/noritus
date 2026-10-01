import { useLayoutEffect, useRef, type RefObject } from 'react'

const reduce = matchMedia('(prefers-reduced-motion: reduce)')

/**
 * Children of `ref` with a `data-flip` key glide from where they were to where
 * they are now (FLIP), so reordering and filtering read as movement, not a jump.
 * Uses offsetLeft/Top, which ignore transforms and scrolling.
 */
export function useFlip(ref: RefObject<HTMLElement | null>, ms = 220) {
  const last = useRef(new Map<string, [number, number]>())
  useLayoutEffect(() => {
    const next = new Map<string, [number, number]>()
    for (const el of ref.current?.querySelectorAll<HTMLElement>(':scope > [data-flip]') ?? []) {
      const key = el.dataset.flip!
      const was = last.current.get(key)
      next.set(key, [el.offsetLeft, el.offsetTop])
      if (!was || reduce.matches) continue
      const dx = was[0] - el.offsetLeft
      const dy = was[1] - el.offsetTop
      if (dx || dy) el.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: ms, easing: 'cubic-bezier(.2,.8,.2,1)' })
    }
    last.current = next
  })
}

const ids = new WeakMap<object, number>()
let n = 0
/** A stable key for an object (e.g. a File) across reorders. */
export const keyOf = (o: object) => ids.get(o) ?? (ids.set(o, ++n), n)
