import { stepUnlocked, useApp } from '../store/appStore'

const STEPS = ['Template', 'Names', 'Style', 'Download'] as const

export default function Stepper() {
  const step = useApp((s) => s.step)
  const setStep = useApp((s) => s.setStep)
  const hasTemplate = useApp((s) => s.template !== null)
  const nameCount = useApp((s) => s.names.length)

  return (
    <ol className="steps">
      {STEPS.map((label, i) => {
        const unlocked = stepUnlocked(i, hasTemplate, nameCount)
        const cls = i === step ? 'active' : i < step ? 'done' : ''
        return (
          <li key={label}>
            <button
              type="button"
              className={cls}
              disabled={!unlocked}
              aria-current={i === step ? 'step' : undefined}
              title={
                unlocked
                  ? undefined
                  : i === 1
                    ? 'Upload a template first'
                    : 'Upload a template and add names first'
              }
              onClick={() => setStep(i)}
            >
              <span className="n">{i + 1}</span>
              {label}
            </button>
          </li>
        )
      })}
    </ol>
  )
}
