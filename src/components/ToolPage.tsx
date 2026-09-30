import { lazy, Suspense } from 'react'
import { TOOLS, type Tool } from '../tools'
import Icon from './Icon'

// One lazy page per built tool, so each gets its own chunk.
const PAGES = new Map(
  TOOLS.filter((t) => t.load).map((t) => {
    const Page = lazy(t.load!)
    return [t.slug, <Page key={t.slug} />]
  }),
)

const CAT_LABEL: Record<Tool['category'], string> = { PDF: 'PDF', Media: 'Audio & video', Image: 'Images', Generate: 'Generators', Utility: 'Utilities' }

export default function ToolPage({ tool }: { tool: Tool }) {
  const page = PAGES.get(tool.slug)
  if (page) return <Suspense fallback={<div className="container room muted">Opening {tool.name}…</div>}>{page}</Suspense>

  return (
    <div className="container room">
      <a className="back-button" href="/#tools">
        ← Back to the toolbox
      </a>
      <div className="room-head">
        <div>
          <div className="eyebrow">{CAT_LABEL[tool.category]} / Coming soon</div>
          <h1>{tool.name}.</h1>
          <p>{tool.blurb}</p>
        </div>
        <span className="pill">
          <Icon name="lock" /> Stays on your device
        </span>
      </div>
      <div className="workspace-note">
        <Icon name="code" />
        <span>This tool is on its way. When it arrives, it will run entirely in your browser.</span>
      </div>
    </div>
  )
}
