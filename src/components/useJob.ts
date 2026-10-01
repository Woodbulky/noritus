import { useEffect, useRef, useState } from 'react'

export type JobResult = { blob: Blob; name: string; note?: string }

export type JobState =
  | { kind: 'idle' }
  /** `progress` is 0–1, or null while it can't be measured. */
  | { kind: 'running'; progress: number | null }
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

  async function run(work: (progress: (fraction: number) => void, signal: AbortSignal) => Promise<JobResult>) {
    ctrl.current?.abort()
    const c = (ctrl.current = new AbortController())
    setState({ kind: 'running', progress: null })
    try {
      const result = await work((p) => c.signal.aborted || setState({ kind: 'running', progress: p }), c.signal)
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
