import { StrictMode, useEffect, useLayoutEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { TOOLS } from './tools'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './components/Home'
import Privacy from './components/Privacy'
import ToolPage from './components/ToolPage'

const HOME_TITLE = 'Noritus — A little less file friction.'
const HOME_DESC = 'Everyday file tools that never upload your files. PDF, audio, video and image tools that run entirely in your browser.'

/** Real paths, not hashes, so every tool is indexable. Internal <a> clicks become pushState. */
function usePath() {
  const [path, setPath] = useState(location.pathname)
  useEffect(() => {
    const onPop = () => setPath(location.pathname)
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element).closest?.('a')
      if (!a || a.target || a.hasAttribute('download') || a.origin !== location.origin) return
      if (a.pathname === location.pathname && a.hash) return // same page anchor: let the browser scroll
      e.preventDefault()
      history.pushState(null, '', a.href)
      setPath(a.pathname)
      if (a.pathname === path) scrollTo(0, 0)
    }
    addEventListener('popstate', onPop)
    document.addEventListener('click', onClick)
    return () => {
      removeEventListener('popstate', onPop)
      document.removeEventListener('click', onClick)
    }
  }, [path])
  return path
}

function NotFound() {
  return (
    <div className="container room">
      <div className="eyebrow">404 / Nothing here</div>
      <h1>This page wandered off.</h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        The toolbox is still right where you left it.
      </p>
      <a className="btn btn-primary" href="/#tools">
        Back to the toolbox <span className="arrow">↗</span>
      </a>
    </div>
  )
}

function App() {
  const path = usePath()
  const slug = path.replace(/^\/+|\/+$/g, '')
  const tool = TOOLS.find((t) => t.slug === slug)

  let page = <NotFound />
  let title = 'Page not found — Noritus'
  let desc = HOME_DESC
  if (slug === '') {
    page = <Home />
    title = HOME_TITLE
  } else if (slug === 'privacy') {
    page = <Privacy />
    title = 'Privacy — Noritus'
    desc = 'Your files never leave your device. How Noritus handles privacy.'
  } else if (tool) {
    page = <ToolPage tool={tool} />
    title = `${tool.name} — Noritus`
    desc = `${tool.blurb} Runs in your browser; your files are never uploaded.`
  }

  useEffect(() => {
    document.title = title
    document.querySelector('meta[name="description"]')?.setAttribute('content', desc)
  }, [title, desc])

  useLayoutEffect(() => {
    const target = location.hash && document.getElementById(location.hash.slice(1))
    if (target) target.scrollIntoView()
    else scrollTo(0, 0)
  }, [path])

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Header />
      <main id="main" tabIndex={-1}>
        <div className="page" key={path}>
          {page}
        </div>
      </main>
      <Footer />
    </>
  )
}

// Card spotlight follows the cursor; primary buttons lean toward it.
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  let magnet: HTMLElement | null = null
  document.addEventListener('pointermove', (e) => {
    const el = e.target as Element
    const card = el.closest?.<HTMLElement>('.tool-card')
    if (card) {
      const r = card.getBoundingClientRect()
      card.style.setProperty('--x', `${e.clientX - r.left}px`)
      card.style.setProperty('--y', `${e.clientY - r.top}px`)
    }
    const b = el.closest?.<HTMLElement>('[data-magnet]') ?? null
    if (magnet && magnet !== b) magnet.style.translate = ''
    magnet = b
    if (b) {
      const r = b.getBoundingClientRect()
      b.style.translate = `${(e.clientX - r.left - r.width / 2) * 0.12}px ${(e.clientY - r.top - r.height / 2) * 0.25}px`
    }
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
