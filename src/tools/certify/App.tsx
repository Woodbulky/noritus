import { useDeferredValue, useEffect, useLayoutEffect, useMemo } from 'react'

import Stepper from './components/Stepper'
import TemplateStep from './components/TemplateStep'
import NamesStep from './components/NamesStep'
import StyleStep from './components/StyleStep'
import DownloadStep from './components/DownloadStep'
import PreviewStage, { SAMPLE } from './components/PreviewStage'
import Toasts from './components/Toasts'
import type { RowIssue } from './components/NamesList'

import { layoutName, MIN_FIT_RATIO } from './lib/layoutName'
import { missingGlyphs } from './lib/fonts'
import { duplicateIndices } from '../../lib/sanitize'
import { useApp } from './store/appStore'
import { KINDS, KindContext } from './kind'

/** The variant shown last; switching variants starts over so a certificate never shows up as an ID card. */
let shown = 'certify'

export default function App({ slug = 'certify' }: { slug?: string }) {
  const kind = KINDS[slug]
  // Before paint and before the font effect below, which reads the fresh state.
  useLayoutEffect(() => {
    if (shown === slug) return
    shown = slug
    useApp.setState({ ...useApp.getInitialState(), presets: useApp.getState().presets }, true)
  }, [slug])
  const step = useApp((s) => s.step)
  const template = useApp((s) => s.template)
  const names = useApp((s) => s.names)
  const extras = useApp((s) => s.extras)
  const idx = useApp((s) => s.idx)
  const style = useApp((s) => s.style)
  const second = useApp((s) => s.second)
  const secondOn = useApp((s) => s.secondOn)
  const nameFont = useApp((s) => s.nameFont)
  const secondFont = useApp((s) => s.secondFont)
  const setFont = useApp((s) => s.setFont)
  const undo = useApp((s) => s.undo)
  const redo = useApp((s) => s.redo)

  // Load the starting font (and any font restored from localStorage) once.
  useEffect(() => {
    void setFont('name', useApp.getState().style.fontId)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- startup only
  }, [])

  // Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z, unless the user is typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return
      const el = e.target as HTMLElement | null
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  // Deferred so dragging a slider with 1000 names loaded stays responsive.
  // Each value keeps a stable identity between real changes, which an object
  // literal here would not.
  const dNames = useDeferredValue(names)
  const dStyle = useDeferredValue(style)
  const dFont = useDeferredValue(nameFont)

  const duplicates = useMemo(() => duplicateIndices(dNames), [dNames])

  /** Per-row warnings, computed once here and shared by the list and summary. */
  const issues = useMemo<RowIssue[]>(() => {
    if (!dFont || !template) return dNames.map(() => ({ missing: [], atMin: false }))
    const floor = dStyle.size * MIN_FIT_RATIO + 1e-6
    return dNames.map((name) => {
      const place = layoutName(dFont, name, dStyle, template.width, template.height)
      return {
        missing: missingGlyphs(dFont, place.text),
        atMin: dStyle.fit ? place.size <= floor : place.overflows,
      }
    })
  }, [dNames, dStyle, dFont, template])

  const previewName = names[idx] ?? SAMPLE
  const previewExtra = secondOn ? (extras[idx] ?? '') : ''

  const layout = useMemo(
    () =>
      nameFont && template
        ? layoutName(nameFont, previewName, style, template.width, template.height)
        : null,
    [nameFont, template, previewName, style],
  )

  const secondLayout = useMemo(
    () =>
      secondOn && secondFont && template && previewExtra
        ? layoutName(secondFont, previewExtra, second, template.width, template.height)
        : null,
    [secondOn, secondFont, template, previewExtra, second],
  )

  return (
    <KindContext value={kind}>
    <div className="certify">
      <div className="top">
        <Stepper />
        <span className="top-meta">Everything stays in your browser</span>
      </div>
      <div className="app">
        <aside className="panel">
          {step === 0 && <TemplateStep />}
          {step === 1 && <NamesStep issues={issues} duplicates={duplicates} />}
          {step === 2 && <StyleStep />}
          {step === 3 && <DownloadStep issues={issues} duplicates={duplicates} />}
        </aside>

        {template ? (
          <PreviewStage
            template={template}
            editing={step === 2}
            layout={layout}
            secondLayout={secondLayout}
          />
        ) : (
          <section className="stage-wrap">
            <div className="stage-bar">
              <div className="stage-title">Preview</div>
            </div>
            <div className="stage-empty">
              <span>
                <strong>No template yet</strong>
                Drop a PNG, JPG or PDF on the left and your {kind.one} appears here.
              </span>
            </div>
          </section>
        )}
      </div>
      <Toasts />
    </div>
    </KindContext>
  )
}
