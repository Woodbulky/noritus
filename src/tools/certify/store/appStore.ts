import { create } from 'zustand'
import { download } from '../../../lib/files'
import type { Font } from 'fontkit'

import { BUILTINS, loadBuiltin } from '../lib/builtins'
import { loadTemplate, type Template } from '../lib/loadTemplate'
import { parseSheet, parsePasted, normalizeName } from '../lib/parseSheet'
import {
  CUSTOM_FONT_ID,
  loadFont,
  loadFontBytes,
  setCustomFont,
  type FontOption,
} from '../lib/fonts'
import {
  DEFAULT_BOX,
  DEFAULT_SECOND,
  DEFAULT_STYLE,
  type Box,
  type TextStyle,
} from '../lib/layoutName'
import { certId, DEFAULT_QR, verifyCsv, type QrStyle } from '../lib/verify'
import { filenames, type FilenamePattern } from '../../../lib/sanitize'
import {
  deletePreset,
  loadLastStyle,
  loadPresets,
  savePreset,
  saveLastStyle,
  type Preset,
} from '../lib/presets'
import { emptyHistory, push, redo, undo, type History } from '../lib/history'
import type { GenerateRequest, GenerateResponse } from '../workers/generate.worker'
import type { Row } from '../lib/generatePdf'

export type Field = 'name' | 'second'
export type Zoom = 'fit' | 1 | 1.5
export type Toast = { id: number; msg: string; kind: 'ok' | 'err' }
export type Progress = { label: string; done: number; total: number; mode: string }

/** What undo/redo restores: everything the Style step can change. */
type Snapshot = { style: TextStyle; second: TextStyle; secondOn: boolean }

let toastSeq = 0
let jobSeq = 0
let worker: Worker | null = null

type State = {
  step: number
  template: Template | null
  templateBusy: boolean

  names: string[]
  extras: string[]
  namesFile: string
  sheetName: string
  idx: number

  style: TextStyle
  second: TextStyle
  secondOn: boolean
  qr: QrStyle
  verifyLink: string
  history: History<Snapshot>

  nameFont: Font | null
  nameFontBytes: Uint8Array | null
  secondFont: Font | null
  secondFontBytes: Uint8Array | null
  customFont: FontOption | null

  zoom: Zoom
  pattern: FilenamePattern
  event: string

  presets: Preset[]
  toasts: Toast[]
  progress: Progress | null
}

type Actions = {
  setStep: (step: number) => void
  toast: (msg: string, kind?: 'ok' | 'err') => void
  dismissToast: (id: number) => void

  pickTemplate: (file: File, box?: Box) => Promise<void>
  pickBuiltin: (id: string) => Promise<void>

  pickNames: (file: File) => Promise<void>
  pasteNames: (text: string) => void
  addName: (name: string) => void
  editName: (index: number, value: string) => void
  removeName: (index: number) => void
  clearNames: () => void
  setIdx: (index: number) => void
  stepIdx: (delta: number) => void

  styleOf: (field: Field) => TextStyle
  patch: (field: Field, partial: Partial<TextStyle>, snapshot?: boolean) => void
  setBox: (field: Field, box: Box) => void
  snapshot: () => void
  resetLayout: () => void
  toggleSecond: () => void
  patchQr: (partial: Partial<QrStyle>) => void
  setVerifyLink: (link: string) => void
  undo: () => void
  redo: () => void

  setFont: (field: Field, id: string) => Promise<void>
  uploadFont: (field: Field, file: File) => Promise<void>

  setZoom: (zoom: Zoom) => void
  setPattern: (pattern: FilenamePattern) => void
  setEvent: (event: string) => void

  refreshPresets: () => void
  storePreset: (name: string) => void
  applyPreset: (name: string) => void
  dropPreset: (name: string) => void

  rows: () => Row[]
  stems: () => string[]
  downloadVerifyCsv: () => void
  generate: (mode: 'zip' | 'combined', label: string) => void
  generateOne: (index: number) => void
  cancel: () => void
}

export const useApp = create<State & Actions>((set, get) => {
  /** Lazily created so a tab that never generates never spawns a worker. */
  function ensureWorker() {
    if (worker) return worker
    worker = new Worker(new URL('../workers/generate.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = (e: MessageEvent<GenerateResponse>) => {
      const m = e.data
      const current = get().progress
      if (!current) return
      if (m.type === 'progress') {
        set({ progress: { ...current, done: m.done, total: m.total } })
      } else if (m.type === 'done') {
        download(m.blob, m.filename)
        set({ progress: null })
        get().toast(`${m.filename} downloaded`)
      } else if (m.type === 'cancelled') {
        set({ progress: null })
        get().toast('Generation cancelled')
      } else {
        set({ progress: null })
        get().toast(m.message, 'err')
      }
    }
    worker.onerror = () => {
      set({ progress: null })
      get().toast('The generator stopped unexpectedly. Try a smaller batch.', 'err')
    }
    return worker
  }

  const snapshotOf = (s: State): Snapshot => ({
    style: s.style,
    second: s.second,
    secondOn: s.secondOn,
  })

  return {
    step: 0,
    template: null,
    templateBusy: false,

    names: [],
    extras: [],
    namesFile: '',
    sheetName: '',
    idx: 0,

    style: loadLastStyle() ?? DEFAULT_STYLE,
    second: DEFAULT_SECOND,
    secondOn: false,
    qr: { ...DEFAULT_QR },
    verifyLink: '',
    history: emptyHistory<Snapshot>(),

    nameFont: null,
    nameFontBytes: null,
    secondFont: null,
    secondFontBytes: null,
    customFont: null,

    zoom: 'fit',
    pattern: '{name}',
    event: '',

    presets: loadPresets(),
    toasts: [],
    progress: null,

    // --- chrome -------------------------------------------------------------
    setStep: (step) => set({ step }),

    toast: (msg, kind = 'ok') => {
      const id = ++toastSeq
      set((s) => ({ toasts: [...s.toasts, { id, msg, kind }] }))
      // Errors stay until dismissed; confirmations fade.
      if (kind === 'ok') setTimeout(() => get().dismissToast(id), 4000)
    },
    dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

    // --- template -----------------------------------------------------------
    pickTemplate: async (file, box) => {
      set({ templateBusy: true })
      try {
        const template = await loadTemplate(file)
        set((s) => ({ template, style: box ? { ...s.style, box: { ...box } } : s.style }))
        if (box) saveLastStyle(get().style)
        get().toast(`${template.fileName} loaded`)
      } catch (err) {
        get().toast(err instanceof Error ? err.message : String(err), 'err')
      } finally {
        set({ templateBusy: false })
      }
    },

    /** A shipped design: fetched, then walked down the same path as a drop. */
    pickBuiltin: async (id) => {
      const design = BUILTINS.find((b) => b.id === id)
      if (!design) return
      set({ templateBusy: true })
      try {
        await get().pickTemplate(await loadBuiltin(design), design.box)
      } catch (err) {
        get().toast(err instanceof Error ? err.message : String(err), 'err')
        set({ templateBusy: false })
      }
    },

    // --- names --------------------------------------------------------------
    pickNames: async (file) => {
      try {
        const { names, extras, sheetName, headerSkipped } = await parseSheet(file)
        set({ names, extras, sheetName, namesFile: file.name, idx: 0 })
        get().toast(
          `${names.length} name${names.length === 1 ? '' : 's'} from ${sheetName}` +
            (headerSkipped ? ' (header skipped)' : ''),
        )
      } catch (err) {
        get().toast(err instanceof Error ? err.message : String(err), 'err')
      }
    },

    pasteNames: (text) => {
      const parsed = parsePasted(text)
      if (parsed.length === 0) {
        get().toast('No names in that text. Put one name per line.', 'err')
        return
      }
      set((s) => ({
        names: [...s.names, ...parsed],
        extras: [...s.extras, ...parsed.map(() => '')],
      }))
      get().toast(`${parsed.length} name${parsed.length === 1 ? '' : 's'} added`)
    },

    addName: (name) => {
      const clean = normalizeName(name)
      if (!clean) return
      set((s) => ({
        names: [...s.names, clean],
        extras: [...s.extras, ''],
        idx: s.names.length,
      }))
    },

    editName: (index, value) => {
      const clean = normalizeName(value)
      if (!clean) return
      set((s) => ({ names: s.names.map((n, i) => (i === index ? clean : n)) }))
    },

    removeName: (index) =>
      set((s) => {
        const names = s.names.filter((_, i) => i !== index)
        return {
          names,
          extras: s.extras.filter((_, i) => i !== index),
          idx: Math.max(0, Math.min(s.idx >= index ? s.idx - 1 : s.idx, names.length - 1)),
        }
      }),

    clearNames: () => set({ names: [], extras: [], namesFile: '', sheetName: '', idx: 0 }),

    setIdx: (idx) => set({ idx }),
    stepIdx: (delta) =>
      set((s) => {
        if (s.names.length === 0) return {}
        return { idx: (s.idx + delta + s.names.length) % s.names.length }
      }),

    // --- style --------------------------------------------------------------
    styleOf: (field) => (field === 'name' ? get().style : get().second),

    snapshot: () => set((s) => ({ history: push(s.history, snapshotOf(s)) })),

    patch: (field, partial, snapshot = true) => {
      const s = get()
      const history = snapshot ? push(s.history, snapshotOf(s)) : s.history
      const next = { ...s.styleOf(field), ...partial }
      set(field === 'name' ? { style: next, history } : { second: next, history })
      if (field === 'name') saveLastStyle(next)
    },

    setBox: (field, box) => get().patch(field, { box }, false),

    resetLayout: () => {
      get().snapshot()
      const style = { ...get().style, box: { ...DEFAULT_BOX } }
      set({ style, second: { ...get().second, box: { ...DEFAULT_SECOND.box } } })
      saveLastStyle(style)
    },

    toggleSecond: () =>
      set((s) => ({ secondOn: !s.secondOn, history: push(s.history, snapshotOf(s)) })),

    patchQr: (partial) => set((s) => ({ qr: { ...s.qr, ...partial } })),
    setVerifyLink: (verifyLink) => set({ verifyLink }),

    undo: () => {
      const s = get()
      const step = undo(s.history, snapshotOf(s))
      if (!step) return
      set({ ...step.state, history: step.history })
      saveLastStyle(step.state.style)
    },

    redo: () => {
      const s = get()
      const step = redo(s.history, snapshotOf(s))
      if (!step) return
      set({ ...step.state, history: step.history })
      saveLastStyle(step.state.style)
    },

    // --- fonts --------------------------------------------------------------
    setFont: async (field, id) => {
      try {
        const [font, bytes] = await Promise.all([loadFont(id), loadFontBytes(id)])
        // Re-loading the same id (startup, preset apply) must not add an undo step.
        if (get().styleOf(field).fontId !== id) get().patch(field, { fontId: id })
        set(
          field === 'name'
            ? { nameFont: font, nameFontBytes: bytes }
            : { secondFont: font, secondFontBytes: bytes },
        )
      } catch (err) {
        get().toast(err instanceof Error ? err.message : String(err), 'err')
      }
    },

    uploadFont: async (field, file) => {
      try {
        const option = await setCustomFont(file)
        set({ customFont: option })
        await get().setFont(field, CUSTOM_FONT_ID)
        get().toast(`${option.name} ready`)
      } catch (err) {
        get().toast(err instanceof Error ? err.message : String(err), 'err')
      }
    },

    // --- preview / output options ------------------------------------------
    setZoom: (zoom) => set({ zoom }),
    setPattern: (pattern) => set({ pattern }),
    setEvent: (event) => set({ event }),

    // --- presets ------------------------------------------------------------
    refreshPresets: () => set({ presets: loadPresets() }),

    storePreset: (name) => {
      set({ presets: savePreset(name, get().style) })
      get().toast(`Preset “${name.trim() || 'Preset'}” saved`)
    },

    applyPreset: (name) => {
      const preset = get().presets.find((p) => p.name === name)
      if (!preset) return
      get().snapshot()
      set({ style: preset.style })
      saveLastStyle(preset.style)
      void get().setFont('name', preset.style.fontId)
      get().toast(`Preset “${name}” applied`)
    },

    dropPreset: (name) => set({ presets: deletePreset(name) }),

    // --- generation ---------------------------------------------------------
    rows: () => {
      const { names, extras, secondOn, qr, event } = get()
      return names.map((name, i) => ({
        name,
        extra: secondOn ? extras[i] : undefined,
        code: qr.on ? certId(name, event) : undefined,
      }))
    },

    downloadVerifyCsv: () => {
      const s = get()
      if (s.names.length === 0) return
      const csv = verifyCsv(
        s.rows().map((r) => ({ ...r, code: r.code ?? certId(r.name, s.event) })),
        s.event,
      )
      download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'verify.csv')
      s.toast('verify.csv downloaded')
    },

    stems: () => {
      const { names, pattern, event } = get()
      return filenames(names, pattern, event)
    },

    generate: (mode, label) => {
      const s = get()
      if (!s.template || !s.nameFontBytes || s.names.length === 0 || s.progress) return
      if (s.secondOn && !s.secondFontBytes) {
        s.toast('The second field has no font loaded yet.', 'err')
        return
      }
      const id = ++jobSeq
      set({ progress: { label, done: 0, total: s.names.length, mode } })
      const req: GenerateRequest = {
        kind: 'generate',
        id,
        mode,
        rows: s.rows(),
        stems: s.stems(),
        verifyCsv:
          s.qr.on && mode === 'zip'
            ? verifyCsv(
                s.rows().map((r) => ({ ...r, code: r.code ?? '' })),
                s.event,
              )
            : undefined,
        template: {
          kind: s.template.kind,
          bytes: s.template.bytes,
          width: s.template.width,
          height: s.template.height,
        },
        name: { style: s.style, fontBytes: s.nameFontBytes },
        second:
          s.secondOn && s.secondFontBytes
            ? { style: s.second, fontBytes: s.secondFontBytes }
            : undefined,
        qr: s.qr.on ? s.qr : undefined,
        verifyLink: s.verifyLink,
        cacheKey: [
          s.template.fileName,
          s.template.bytes.length,
          JSON.stringify(s.style),
          s.secondOn ? JSON.stringify(s.second) : 'off',
          s.qr.on ? JSON.stringify(s.qr) + s.verifyLink : 'no-qr',
        ].join('|'),
      }
      ensureWorker().postMessage(req)
    },

    generateOne: (index) => {
      const s = get()
      if (!s.template || !s.nameFontBytes || s.progress) return
      const id = ++jobSeq
      set({ progress: { label: 'Generating', done: 0, total: 1, mode: 'single' } })
      const req: GenerateRequest = {
        kind: 'generate',
        id,
        mode: 'single',
        rows: [s.rows()[index]],
        stems: [s.stems()[index]],
        template: {
          kind: s.template.kind,
          bytes: s.template.bytes,
          width: s.template.width,
          height: s.template.height,
        },
        name: { style: s.style, fontBytes: s.nameFontBytes },
        second:
          s.secondOn && s.secondFontBytes
            ? { style: s.second, fontBytes: s.secondFontBytes }
            : undefined,
        qr: s.qr.on ? s.qr : undefined,
        verifyLink: s.verifyLink,
        cacheKey: [
          s.template.fileName,
          s.template.bytes.length,
          JSON.stringify(s.style),
          s.secondOn ? JSON.stringify(s.second) : 'off',
          s.qr.on ? JSON.stringify(s.qr) + s.verifyLink : 'no-qr',
        ].join('|'),
      }
      ensureWorker().postMessage(req)
    },

    cancel: () => {
      if (!get().progress || !worker) return
      worker.postMessage({ kind: 'cancel', id: jobSeq })
    },
  }
})

/** Step 2 needs a template; steps 3–4 also need names. */
export const stepUnlocked = (step: number, hasTemplate: boolean, nameCount: number) =>
  step === 0 || (step === 1 ? hasTemplate : hasTemplate && nameCount > 0)
