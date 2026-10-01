import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store/appStore'
import { useKind } from '../kind'
import { Close, Download, Pencil } from './icons'

export type RowIssue = { missing: string[]; atMin: boolean }

type Props = {
  /** Per-row warnings, computed once by the caller for the whole list. */
  issues: RowIssue[]
  duplicates: Set<number>
}

/**
 * The mockup's names table: click a row to preview it, double-click (or the
 * pencil) to rename in place, and download just that one certificate.
 */
export default function NamesList({ issues, duplicates }: Props) {
  const kind = useKind()
  const names = useApp((s) => s.names)
  const idx = useApp((s) => s.idx)
  const setIdx = useApp((s) => s.setIdx)
  const addName = useApp((s) => s.addName)
  const editName = useApp((s) => s.editName)
  const removeName = useApp((s) => s.removeName)
  const generateOne = useApp((s) => s.generateOne)
  const busy = useApp((s) => s.progress !== null)

  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const listRef = useRef<HTMLUListElement>(null)

  // Keep the selected row in view when the preview pager moves the selection.
  useEffect(() => {
    listRef.current?.querySelector('li.cur')?.scrollIntoView({ block: 'nearest' })
  }, [idx])

  const commitEdit = () => {
    if (editing !== null) editName(editing, editValue)
    setEditing(null)
  }

  const startEdit = (i: number) => {
    setEditing(i)
    setEditValue(names[i])
  }

  const dupCount = new Set([...duplicates].map((i) => names[i].trim().toLowerCase())).size

  return (
    <div className="names">
      <div className="names-head">
        <b>
          {names.length} {names.length === 1 ? 'name' : 'names'}
        </b>
        {dupCount > 0 && (
          <span className="tag">
            {dupCount} duplicate{dupCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <ul ref={listRef}>
        {names.length === 0 && (
          <li className="empty" style={{ cursor: 'default' }}>
            No names yet — upload a sheet, paste a list, or type one below.
          </li>
        )}
        {names.map((name, i) => (
          <li
            key={`${i}-${name}`}
            className={i === idx ? 'cur' : undefined}
            onClick={() => setIdx(i)}
            onDoubleClick={() => startEdit(i)}
          >
            <span className="idx">{i + 1}</span>

            {editing === i ? (
              <input
                className="nm-edit"
                autoFocus
                value={editValue}
                aria-label={`Rename ${name}`}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitEdit}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdit()
                  if (e.key === 'Escape') setEditing(null)
                }}
              />
            ) : (
              <span className="nm" title={name}>
                {name}
              </span>
            )}

            {duplicates.has(i) && <span className="tag">Duplicate</span>}
            {issues[i]?.missing.length > 0 && (
              <span className="tag warn" title={`No glyph for ${issues[i].missing.join(' ')}`}>
                Missing glyphs
              </span>
            )}
            {issues[i]?.atMin && (
              <span className="tag warn" title="Shrunk to the minimum size">
                Tight
              </span>
            )}

            <button
              type="button"
              className="icon-btn"
              aria-label={`Rename ${name}`}
              onClick={(e) => {
                e.stopPropagation()
                startEdit(i)
              }}
            >
              <Pencil />
            </button>
            <button
              type="button"
              className="icon-btn"
              disabled={busy}
              aria-label={`Download the ${kind.one} for ${name}`}
              onClick={(e) => {
                e.stopPropagation()
                generateOne(i)
              }}
            >
              <Download />
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label={`Remove ${name}`}
              onClick={(e) => {
                e.stopPropagation()
                removeName(i)
              }}
            >
              <Close />
            </button>
          </li>
        ))}
      </ul>

      <div className="add">
        <input
          className="input"
          placeholder="Add a name"
          aria-label="Add a name"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            addName(draft)
            setDraft('')
          }}
        />
        <button
          type="button"
          className="btn btn-ghost"
          style={{ padding: '8px 14px' }}
          onClick={() => {
            addName(draft)
            setDraft('')
          }}
        >
          Add
        </button>
      </div>
    </div>
  )
}
