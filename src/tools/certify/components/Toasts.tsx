import { Check, Close } from './icons'
import { useApp } from '../store/appStore'

export default function Toasts() {
  const toasts = useApp((s) => s.toasts)
  const dismiss = useApp((s) => s.dismissToast)
  if (toasts.length === 0) return null

  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast${t.kind === 'err' ? ' err' : ''}`}>
          {t.kind === 'ok' && <Check size={15} />}
          <span>{t.msg}</span>
          <button
            type="button"
            className="icon-btn x"
            aria-label="Dismiss"
            onClick={() => dismiss(t.id)}
          >
            <Close size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
