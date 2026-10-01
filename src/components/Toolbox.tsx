import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CAT_CAPTION, CATEGORIES, FLOWS, kindId, TOOLS, type Category, type Tool } from '../tools'
import { filterTools } from '../lib/search'
import { favourites, recents, setToolboxView, toggleFavourite, toolboxView } from '../lib/prefs'
import Icon, { type IconName } from './Icon'

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
const KINDS = CATEGORIES.slice(1) as [Category, string, IconName][]
const LABEL: Record<Category, string> = { PDF: 'PDF & documents', Media: 'Audio & video', Image: 'Images', Generate: 'Generators', Utility: 'Utilities' }
const SUGGEST: [string, string][] = [
  ['compress', 'Make a file smaller'],
  ['sign', 'Sign a document'],
  ['photo', 'Work with photos'],
]
type Space = 'all' | 'favourites' | 'recent'
const SPACES: [Space, string, IconName][] = [
  ['all', 'All tools', 'grid'],
  ['favourites', 'Favourites', 'star'],
  ['recent', 'Recently opened', 'clock'],
]

/** `#day-<id>` in the URL picks a job; `#<kind>` just scrolls (the browser does that). */
const flowFromHash = () => (location.hash.startsWith('#day-') ? location.hash.slice(5) : '')

/** `text` with each search word wrapped in <mark>. */
function marked(text: string, words: string[]): ReactNode {
  if (!words.length) return text
  const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
  return text.split(re).map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part))
}

function ToolCard({ tool, words, fav, onStar }: { tool: Tool; words: string[]; fav: boolean; onStar: () => void }) {
  return (
    <div className="tool-card">
      <a className="tool-link" href={`/${tool.slug}`}>
        <span className="tool-icon">
          <Icon name={tool.icon} />
        </span>
        <span className="tool-copy">
          <span className="tool-name">{marked(tool.name, words)}</span>
          <span className="tool-blurb">{marked(tool.blurb, words)}</span>
          <span className="tool-io">{tool.io}</span>
        </span>
      </a>
      <button className="star" aria-pressed={fav} aria-label={`${fav ? 'Remove' : 'Add'} ${tool.name} ${fav ? 'from' : 'to'} favourites`} onClick={onStar}>
        <Icon name="star" />
      </button>
    </div>
  )
}

export default function Toolbox() {
  const [query, setQuery] = useState('')
  const [space, setSpace] = useState<Space>('all')
  const [flow, setFlow] = useState(flowFromHash)
  const [inView, setInView] = useState<Category>('PDF')
  const [view, setView] = useState(toolboxView)
  const [favs, setFavs] = useState(favourites)
  const [recent] = useState(recents)
  const search = useRef<HTMLInputElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const results = useRef<HTMLDivElement>(null)
  const chips = useRef<HTMLDivElement>(null)

  const pick = (next: { space?: Space; flow?: string; query?: string } = {}) => {
    setSpace(next.space ?? 'all')
    setFlow(next.flow ?? '')
    setQuery(next.query ?? '')
  }
  const toTop = () => scrollTo({ top: 0, behavior: 'instant' })

  // Job links (/tools#day-apply) work from anywhere, including this page. Ctrl/⌘ K or "/" focuses the search.
  useEffect(() => {
    const onHash = () => flowFromHash() && (pick({ flow: flowFromHash() }), toTop())
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof Element && e.target.closest('input,textarea,select,[contenteditable]')
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !typing)) {
        e.preventDefault()
        search.current?.focus()
        search.current?.select()
      }
    }
    const onScroll = () => bar.current?.classList.toggle('stuck', bar.current.getBoundingClientRect().top <= 68)
    if (history.state?.focusSearch) search.current?.focus()
    addEventListener('hashchange', onHash)
    addEventListener('keydown', onKey)
    addEventListener('scroll', onScroll, { passive: true })
    return () => {
      removeEventListener('hashchange', onHash)
      removeEventListener('keydown', onKey)
      removeEventListener('scroll', onScroll)
    }
  }, [])

  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
  const workflow = FLOWS.find((f) => f.id === flow)
  let shown = filterTools(TOOLS, 'all', query)
  if (space === 'favourites') shown = shown.filter((t) => favs.includes(t.slug))
  // Recent tools and jobs keep their own order; everything else is grouped by kind.
  const ordered = space === 'recent' ? recent : workflow?.slugs
  if (ordered) shown = ordered.map((s) => shown.find((t) => t.slug === s)).filter((t): t is Tool => !!t)
  const browsing = space === 'all' && !flow && !query.trim()

  // Scroll spy: while browsing everything, the kind in view lights up in the sidebar and chip row.
  useEffect(() => {
    if (!browsing) return
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && setInView((e.target as HTMLElement).dataset.kind as Category)), {
      rootMargin: '-200px 0px -55% 0px',
    })
    results.current?.querySelectorAll('[data-kind]').forEach((g) => io.observe(g))
    return () => io.disconnect()
  }, [browsing])

  // Keep the selected chip in sight on phones.
  useEffect(() => {
    const row = chips.current
    const chip = row?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (row && chip) row.scrollLeft = chip.offsetLeft - row.offsetLeft - row.clientWidth / 2 + chip.clientWidth / 2
  })

  const goKind = (c: Category) => {
    if (!browsing) pick()
    requestAnimationFrame(() => document.getElementById(kindId(c))?.scrollIntoView({ behavior: reduce ? 'instant' : 'smooth', block: 'start' }))
  }
  const star = (slug: string) => (toggleFavourite(slug), setFavs(favourites()))
  const card = (t: Tool) => <ToolCard key={t.slug} tool={t} words={words} fav={favs.includes(t.slug)} onStar={() => star(t.slug)} />
  const count = (id: Space) => (id === 'all' ? TOOLS.length : id === 'favourites' ? favs.length : recent.length)

  const title = workflow ? `${workflow.title}.` : space === 'favourites' ? 'Your favourites.' : space === 'recent' ? 'Recently opened.' : query.trim() ? 'A tool for that.' : 'The whole toolbox.'
  let empty = ['Nothing by that name… yet.', 'Try a simpler word, or browse one of these kinds of tool.']
  if (space === 'favourites' && !query) empty = ['Keep your go-to tools close.', 'Tap the star on any tool to keep it here. Favourites stay in this browser.']
  if (space === 'recent' && !query) empty = ['A fresh start.', 'Tools you open will show up here, in this browser only.']

  const spaceButton = ([id, name, icon]: [Space, string, IconName], chip?: boolean) => (
    <button key={id} className={chip ? undefined : 'side-button'} aria-pressed={id === 'all' ? browsing && !chip : space === id && !flow} onClick={() => (pick({ space: id }), toTop())}>
      <Icon name={icon} />
      <span>{chip && id === 'recent' ? 'Recent' : name}</span>
      {!chip && <span className="count">{count(id)}</span>}
    </button>
  )
  const kindButton = ([id, , icon]: [Category, string, IconName], chip?: boolean) => (
    <button key={id} className={chip ? undefined : 'side-button'} aria-pressed={browsing && inView === id} onClick={() => goKind(id)}>
      <Icon name={icon} />
      <span>{LABEL[id]}</span>
      {!chip && <span className="count">{TOOLS.filter((t) => t.category === id).length}</span>}
    </button>
  )
  const flowButton = (f: (typeof FLOWS)[number], chip?: boolean) => (
    <button key={f.id} className={chip ? undefined : 'side-button'} aria-pressed={flow === f.id} onClick={() => (pick({ flow: f.id }), toTop())}>
      <Icon name={f.icon} />
      <span>{f.title}</span>
    </button>
  )

  return (
    <>
      <section className="container tb-head">
        <div className="eyebrow tb-eyebrow">
          <span className="num">The toolbox</span> / {TOOLS.length} tools, all on your device
        </div>
        <div className="tb-head-row">
          <h1>
            Find your tool. <em>Get on with your day.</em>
          </h1>
          <p>Search by what you want to do, or browse by kind. Star the ones you use most; they stay in this browser.</p>
        </div>
      </section>

      <div className="tb-bar" ref={bar}>
        <div className="container">
          <div className="tb-bar-inner">
            <label className="search-wrap">
              <Icon name="search" />
              <input
                ref={search}
                type="search"
                placeholder="Try “combine PDFs”…"
                aria-label={`Search all ${TOOLS.length} tools`}
                autoComplete="off"
                enterKeyHint="search"
                value={query}
                onChange={(e) => pick({ query: e.target.value })}
                onKeyDown={(e) => e.key === 'Escape' && pick()}
              />
              {query ? (
                <button className="clear-search" aria-label="Clear search" onClick={() => (pick(), search.current?.focus())}>
                  <Icon name="close" />
                </button>
              ) : (
                <kbd className="key" aria-hidden="true">
                  Ctrl K
                </kbd>
              )}
            </label>
            <div className="view-toggle" role="group" aria-label="Layout">
              {(['grid', 'list'] as const).map((v) => (
                <button key={v} aria-label={`${v === 'grid' ? 'Grid' : 'List'} view`} aria-pressed={view === v} onClick={() => (setView(v), setToolboxView(v))}>
                  <Icon name={v} />
                </button>
              ))}
            </div>
          </div>
          <div className="tb-chips" ref={chips} role="group" aria-label="Filter tools">
            {SPACES.map((s) => spaceButton(s, true))}
            <span className="sep" />
            {KINDS.map((k) => kindButton(k, true))}
            <span className="sep" />
            {FLOWS.map((f) => flowButton(f, true))}
          </div>
        </div>
      </div>

      <div className="container toolbox">
        <nav className="toolbox-nav" aria-label="Browse the toolbox">
          <span className="eyebrow">Your workspace</span>
          {SPACES.map((s) => spaceButton(s))}
          <span className="eyebrow">Browse by kind</span>
          {KINDS.map((k) => kindButton(k))}
          <span className="eyebrow">Made for your day</span>
          {FLOWS.map((f) => flowButton(f))}
        </nav>

        <div className={view === 'list' ? 'results list' : 'results'} ref={results}>
          <div className="results-head">
            <h2 className="results-title">
              {title} <small role="status">{`${shown.length} tool${shown.length === 1 ? '' : 's'}`}</small>
            </h2>
            <div className="suggest">
              <span>Try</span>
              {SUGGEST.map(([q, text]) => (
                <button key={q} onClick={() => (pick({ query: q }), search.current?.focus())}>
                  {text}
                </button>
              ))}
            </div>
          </div>
          {workflow && (
            <div className="flow-banner">
              <p>{workflow.note}</p>
              <button onClick={() => (pick(), history.replaceState(history.state, '', location.pathname))}>Show all tools ×</button>
            </div>
          )}

          {!shown.length ? (
            <div className="empty">
              <Icon name={space === 'favourites' ? 'star' : 'search'} />
              <h2>{empty[0]}</h2>
              <p>{empty[1]}</p>
              <div className="chips">
                {KINDS.map(([id, , icon]) => (
                  <button key={id} className="chip" onClick={() => goKind(id)}>
                    <Icon name={icon} /> {LABEL[id]}
                  </button>
                ))}
              </div>
              <button className="btn btn-outline" onClick={() => (pick(), toTop())}>
                Show all {TOOLS.length} tools
              </button>
            </div>
          ) : ordered ? (
            <div className="tool-grid">{shown.map(card)}</div>
          ) : (
            KINDS.map(([id, , icon]) => {
              const group = shown.filter((t) => t.category === id)
              return (
                group.length > 0 && (
                  <section key={id} className="tool-group" id={kindId(id)} data-kind={id} aria-label={LABEL[id]}>
                    <div className="group-head">
                      <h3>
                        <Icon name={icon} />
                        {LABEL[id]}
                        <span className="count">{group.length}</span>
                      </h3>
                      <span>{CAT_CAPTION[id]}</span>
                    </div>
                    <div className="tool-grid">{group.map(card)}</div>
                  </section>
                )
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
