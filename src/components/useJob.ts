import { useEffect, useRef, useState } from 'react'

export type JobResult = { blob: Blob; name: string; note?: string }

/** Where a run honestly is: reading input, doing the work, or packing the download. */
export type Stage = 'read' | 'work' | 'save'

export type JobState =
  | { kind: 'idle' }
  /** `progress` is 0–1, or null while it can't be measured. */
  | { kind: 'running'; progress: number | null; stage: Stage }
  | { kind: 'done'; result: JobResult }
  | { kind: 'error'; message: string }

const IDLE: JobState = { kind: 'idle' }

export type Job = ReturnType<typeof useJob>

/**
 * One cancellable run of a tool. Any change to `inputs` cancels a run in
 * flight and clears a stale result. Leaving the page cancels too.
 */
export function useJob(...inputs: unknown[]) {
  const [state, setState] = useState<JobState>(IDLE)
  const [seen, setSeen] = useState(inputs)
  const ctrl = useRef<AbortController | null>(null)

  // New inputs make the last result stale (state adjusted during render, not in an effect).
  if (inputs.some((v, i) => !Object.is(v, seen[i]))) {
    setSeen(inputs)
    setState(IDLE)
  }
  // …and cancel a run in flight, as does leaving the page.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the caller's inputs are the deps
  useEffect(() => () => ctrl.current?.abort(), inputs)

  /**
   * `progress` moves a run from reading to working (null = working, amount unknown).
   * `stage('save')` marks the last step, e.g. before building a ZIP.
   */
  async function run(work: (progress: (fraction: number | null) => void, signal: AbortSignal, stage: (s: Stage) => void) => Promise<JobResult>) {
    ctrl.current?.abort()
    const c = (ctrl.current = new AbortController())
    let at: JobState & { kind: 'running' } = { kind: 'running', progress: null, stage: 'read' }
    const set = (next: Partial<typeof at>) => c.signal.aborted || setState((at = { ...at, ...next }))
    setState(at)
    try {
      const result = await work(
        (progress) => set({ progress, stage: at.stage === 'read' ? 'work' : at.stage }),
        c.signal,
        (stage) => set({ stage, progress: null }),
      )
      if (!c.signal.aborted) setState({ kind: 'done', result })
    } catch (e) {
      if (c.signal.aborted) return
      setState({ kind: 'error', message: e instanceof Error ? e.message : 'Something went wrong. Try again.' })
    }
  }

  const cancel = () => {
    ctrl.current?.abort()
    setState(IDLE)
  }

  return { state, run, cancel }
}
