import { StrictMode, useEffect, useLayoutEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { HOME_DESC, HOME_TITLE, pageDesc, pageTitle, PRIVACY_DESC, PRIVACY_TITLE, SITE, TOOLS, TOOLS_DESC, TOOLS_TITLE } from './tools'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './components/Home'
import Toolbox from './components/Toolbox'
import Privacy from './components/Privacy'
import ToolPage from './components/ToolPage'

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
      <a className="btn btn-primary" href="/tools">
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
  } else if (slug === 'tools') {
    page = <Toolbox />
    title = TOOLS_TITLE
    desc = TOOLS_DESC
  } else if (slug === 'privacy') {
    page = <Privacy />
    title = PRIVACY_TITLE
    desc = PRIVACY_DESC
  } else if (tool) {
    page = <ToolPage tool={tool} />
    title = pageTitle(tool)
    desc = pageDesc(tool)
  }

  // Same tags scripts/prerender.ts writes, kept right after in-app navigation.
  useEffect(() => {
    document.title = title
    const url = SITE + (slug ? `/${slug}` : '/')
    const tags: [string, string][] = [
      ['meta[name="description"]', desc],
      ['meta[property="og:description"]', desc],
      ['meta[property="og:title"]', title],
      ['meta[property="og:url"]', url],
      ['link[rel="canonical"]', url],
    ]
    for (const [sel, v] of tags) document.head.querySelector(sel)?.setAttribute(sel.startsWith('link') ? 'href' : 'content', v)
  }, [title, desc, slug])

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
      <Header path={slug} />
      <main id="main" tabIndex={-1}>
        <div className="page" key={path}>
          {page}
        </div>
      </main>
      <Footer />
    </>
  )
}

// Ctrl/⌘ K anywhere opens the toolbox with its search focused (the toolbox page handles it itself).
document.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'k' || location.pathname === '/tools') return
  e.preventDefault()
  history.pushState({ focusSearch: true }, '', '/tools')
  dispatchEvent(new PopStateEvent('popstate'))
})

// Primary buttons lean toward the cursor.
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  let magnet: HTMLElement | null = null
  document.addEventListener('pointermove', (e) => {
    const el = e.target as Element
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
