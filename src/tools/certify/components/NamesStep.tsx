import { useState } from 'react'
import Dropzone from './Dropzone'
import NamesList, { type RowIssue } from './NamesList'
import { useApp } from '../store/appStore'

type Props = { issues: RowIssue[]; duplicates: Set<number> }

export default function NamesStep({ issues, duplicates }: Props) {
  const names = useApp((s) => s.names)
  const namesFile = useApp((s) => s.namesFile)
  const sheetName = useApp((s) => s.sheetName)
  const pickNames = useApp((s) => s.pickNames)
  const pasteNames = useApp((s) => s.pasteNames)
  const clearNames = useApp((s) => s.clearNames)
  const setStep = useApp((s) => s.setStep)

  const [pasting, setPasting] = useState(false)
  const [pasted, setPasted] = useState('')

  const ext = namesFile.split('.').pop()?.toUpperCase() ?? ''

  return (
    <section className="view">
      <div>
        <h1>Add names</h1>
        <p className="lede">
          First column of the sheet, one name per row. A “Name” header is skipped.
        </p>
      </div>

      {namesFile && (
        <div className="file">
          <div className="ic">{ext}</div>
          <div className="meta">
            <div className="nm" title={namesFile}>
              {namesFile}
            </div>
            <div className="sub">
              {sheetName}, {names.length} names
            </div>
          </div>
          <button type="button" className="link" onClick={clearNames}>
            Clear
          </button>
        </div>
      )}

      <Dropzone
        accept=".xlsx,.xls,.csv"
        label={namesFile ? 'Replace the sheet' : 'Drop an .xlsx, .xls or .csv'}
        onFile={pickNames}
      />

      {pasting ? (
        <div className="field">
          <label htmlFor="paste">Paste names, one per line</label>
          <textarea
            id="paste"
            className="input"
            value={pasted}
            placeholder={'Aarav Sharma\nAarav Deshmukh\nहर्ष कासलीवाल'}
            onChange={(e) => setPasted(e.target.value)}
          />
          <div className="row">
            <button
              type="button"
              className="link"
              onClick={() => {
                setPasting(false)
                setPasted('')
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: '8px 14px' }}
              onClick={() => {
                pasteNames(pasted)
                setPasted('')
                setPasting(false)
              }}
            >
              Add these names
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="link" style={{ alignSelf: 'start' }} onClick={() => setPasting(true)}>
          Paste names instead
        </button>
      )}

      <NamesList issues={issues} duplicates={duplicates} />

      <div className="panel-foot">
        <button type="button" className="btn btn-ghost" onClick={() => setStep(0)}>
          Back
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={names.length === 0}
          onClick={() => setStep(2)}
        >
          Continue to style
        </button>
      </div>
    </section>
  )
}
