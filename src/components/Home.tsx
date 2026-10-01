import { useEffect, useRef, useState } from 'react'
import { CATEGORIES, TOOLS, type Tool } from '../tools'
import { filterTools } from '../lib/search'
import { favourites, recents } from '../lib/prefs'
import Icon from './Icon'
import { useFlip } from './useFlip'
import { Mark } from './Logo'

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
const VERBS = ['Merge', 'Convert', 'Trim', 'Sign', 'Compress', 'Certify']
const FORMATS = ['PDF', 'MP3', 'MP4', 'JPG', 'PNG', 'WEBP', 'GIF', 'WAV', 'AAC', 'HEIC', 'CSV', 'XLSX', 'ZIP', 'QR', 'MOV', 'WEBM']
const FEATURED = 6
const SHORTCUTS = ['pdf-merge', 'compress-video', 'certify']

/** Toolbox filters survive a trip to a tool and back (in memory, this tab only). */
const kept = { cat: 'all', query: '', expanded: false }

const bySlug = (slugs: string[]) => slugs.map((s) => TOOLS.find((t) => t.slug === s && t.load)).filter((t): t is Tool => !!t)

function ToolChip({ tool, star }: { tool: Tool; star?: boolean }) {
  return (
    <a className="chip" href={`/${tool.slug}`}>
      <Icon name={tool.icon} /> {tool.name}
      {star && <span aria-label="favourite"> ★</span>}
    </a>
  )
}

/** Favourites first, then recently opened tools, from this browser's storage. Hidden until there are some. */
function YourTools() {
  const [[favs, tools]] = useState(() => {
    const f = favourites()
    return [f, bySlug([...new Set([...f, ...recents()])]).slice(0, 8)] as const
  })
  if (!tools.length) return null
  return (
    <section className="container yours" aria-label="Your tools">
      <span className="eyebrow">Your tools</span>
      <div className="chips">
        {tools.map((t) => (
          <ToolChip key={t.slug} tool={t} star={favs.includes(t.slug)} />
        ))}
      </div>
    </section>
  )
}

function ToolCard({ tool, i }: { tool: Tool; i: number }) {
  return (
    <a
      href={`/${tool.slug}`}
      className={`tool-card tone-${tool.category.toLowerCase()}${tool.slug === 'pdf-merge' ? ' featured' : ''}`}
      data-flip={tool.slug}
      style={{ '--i': i } as React.CSSProperties}
    >
      <div className="card-top">
        <span className="tool-icon">
          <Icon name={tool.icon} />
        </span>
        <span className={tool.load ? 'status live' : 'status'}>{tool.load ? 'Open ↗' : 'Coming soon'}</span>
      </div>
      <h3>{tool.name}</h3>
      <p>{tool.blurb}</p>
      <span className="card-arrow" aria-hidden="true">
        ↗
      </span>
    </a>
  )
}

function Toolbox() {
  const [cat, setCat] = useState(kept.cat)
  const [query, setQuery] = useState(kept.query)
  const [expanded, setExpanded] = useState(kept.expanded)
  useEffect(() => void Object.assign(kept, { cat, query, expanded }), [cat, query, expanded])
  // After the first filter change, cards fade in quickly instead of replaying the staggered entrance.
  const [settled, setSettled] = useState(false)
  const grid = useRef<HTMLDivElement>(null)
  useFlip(grid, 240)
  const results = filterTools(TOOLS, cat, query)
  const filtered = cat !== 'all' || query.trim() !== ''
  const shown = expanded || filtered ? results : results.slice(0, FEATURED)

  return (
    <section className="section container" id="tools">
      <div className="section-heading" data-reveal>
        <div>
          <div className="eyebrow">01 / The toolbox</div>
          <h2>A tool for your to-do.</h2>
        </div>
        <p>
          The everyday essentials, all within reach.
          <br />
          Pick a tool and make room for what’s next.
        </p>
      </div>
      <div className="tool-controls" data-reveal>
        <div className="tabs" role="group" aria-label="Filter tools by category">
          {CATEGORIES.map(([id, name]) => (
            <button key={id} className={id === cat ? 'tab active' : 'tab'} aria-pressed={id === cat} onClick={() => (setCat(id), setSettled(true))}>
              {name}
              {id === 'all' && <span className="count">{TOOLS.length}</span>}
            </button>
          ))}
        </div>
        <label className="search-wrap">
          <Icon name="search" />
          <input type="search" placeholder="Merge PDF, resize photo, compress video…" aria-label="Search the toolbox" value={query} onChange={(e) => (setQuery(e.target.value), setSettled(true))} />
        </label>
      </div>
      <div className={settled ? 'tools-grid settled' : 'tools-grid'} aria-live="polite" ref={grid}>
        {shown.length ? (
          shown.map((t, i) => <ToolCard key={t.slug} tool={t} i={i} />)
        ) : (
          <p className="no-results">No tools found. Try “PDF”, “image”, or “audio”.</p>
        )}
      </div>
      {!filtered && (
        <div className="tools-bottom">
          <button className="text-link" onClick={() => (setExpanded(!expanded), setSettled(true))}>
            {expanded ? (
              <>
                Show the essentials <span>↑</span>
              </>
            ) : (
              <>
                Explore all {TOOLS.length} tools <span>↗</span>
              </>
            )}
          </button>
        </div>
      )}
    </section>
  )
}

function HeroArt() {
  const art = useRef<HTMLDivElement>(null)
  // Layers shift with the pointer via CSS `translate`, so it never fights the float animations.
  const move = (e: React.PointerEvent) => {
    if (reduce || !art.current) return
    const r = art.current.getBoundingClientRect()
    art.current.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3))
    art.current.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3))
  }
  const leave = () => {
    art.current?.style.setProperty('--mx', '0')
    art.current?.style.setProperty('--my', '0')
  }
  const depth = (d: number) => ({ '--d': d, position: 'absolute', inset: 0 }) as React.CSSProperties

  return (
    <div className="art-wrap">
      <div className="hero-art" ref={art} onPointerMove={move} onPointerLeave={leave} role="img" aria-label="PDF, image and audio files flowing into the Noritus mark, all on your own device">
        <div className="art-backdrop" />
        <div className="orbit" />
        <svg className="flow" viewBox="0 0 520 466" aria-hidden="true">
          <path id="p1" d="M135 157 C 175 135 235 170 250 215" />
          <path id="p2" d="M419 190 C 385 150 295 175 250 215" />
          <path id="p3" d="M158 370 C 190 330 250 290 250 215" />
          {!reduce && (
            <g fill="#ce4b2c">
              {(
                [
                  [4, 'p1', '2.8s', '0s'],
                  [4, 'p2', '3.2s', '-1s'],
                  [4, 'p3', '2.6s', '-.5s'],
                  [3, 'p1', '2.8s', '-1.6s', '#145c50'],
                  [3, 'p2', '3.2s', '-2.4s', '#145c50'],
                ] as const
              ).map(([r, p, dur, begin, fill], i) => (
                <circle key={i} r={r} fill={fill}>
                  <animateMotion dur={dur} begin={begin} repeatCount="indefinite">
                    <mpath href={`#${p}`} />
                  </animateMotion>
                </circle>
              ))}
            </g>
          )}
        </svg>
        <div className="privacy-stamp">
          <span>Made to stay</span>
          <Icon name="lock" />
          <span>on your device</span>
        </div>
        <div className="depth" style={depth(-14)}>
          <div className="paper-card document-card">
            <div className="paper-top">
              <Icon name="file" />
              <span className="file-label">.PDF</span>
            </div>
            <div className="paper-heading">
              Good things,
              <br />
              all together.
            </div>
            <div className="paper-line" />
            <div className="paper-line short" />
            <div className="paper-chart">
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
        </div>
        <div className="depth" style={depth(16)}>
          <div className="paper-card picture-card">
            <div className="landscape">
              <span className="sun" />
              <span className="hill" />
              <span className="hill two" />
            </div>
            <div className="picture-caption">
              <span>A little fresh perspective.</span>
              <b>.JPG</b>
            </div>
          </div>
        </div>
        <div className="depth" style={depth(-8)}>
          <div className="paper-card audio-card">
            <span className="play-circle">
              <Icon name="play" />
            </span>
            <div style={{ flex: 1 }}>
              <div className="wave">
                {Array.from({ length: 25 }, (_, i) => (
                  <i key={i} style={{ '--h': `${9 + ((i * 17) % 24)}px`, '--d': `${-(i * 0.09).toFixed(2)}s` } as React.CSSProperties} />
                ))}
              </div>
              <div className="audio-bottom">
                <span>A sound idea.</span>
                <b>.MP3</b>
              </div>
            </div>
          </div>
        </div>
        <div className="file-hub depth" style={{ '--d': 6 } as React.CSSProperties}>
          <span className="ring" />
          <span className="ring" />
          <span className="logo" style={{ display: 'block', width: '100%', height: '100%' }}>
            <Mark onDark />
          </span>
        </div>
        <div className="art-note">
          <svg viewBox="0 0 65 45">
            <path d="M60 43C58 12 25 7 8 13m0 0 15 0M8 13l9 12" />
          </svg>
          Your files. Your space.
        </div>
        <span className="tiny-star">✳</span>
      </div>
    </div>
  )
}

/** Rotating verb in the hero line. */
function Morph() {
  const el = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (reduce) return
    let i = 0
    const id = setInterval(() => {
      const m = el.current
      if (!m) return
      m.animate([{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-8px)' }], { duration: 220, fill: 'forwards' }).onfinish = () => {
        m.textContent = VERBS[(i = (i + 1) % VERBS.length)]
        m.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 260, fill: 'forwards' })
      }
    }, 2200)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="morph" ref={el} aria-hidden="true">
      {VERBS[0]}
    </span>
  )
}

export default function Home() {
  // Sections fade up as they enter view; the padlock snaps shut and the netlog types in.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return
          e.target.classList.add('in')
          io.unobserve(e.target)
          if (e.target.classList.contains('privacy-art')) setTimeout(() => e.target.classList.add('locked'), 500)
        }),
      { threshold: 0.18 },
    )
    document.querySelectorAll('[data-reveal],.netlog').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  const k = (n: number) => ({ '--k': n }) as React.CSSProperties
  const l = (n: number) => ({ '--l': n }) as React.CSSProperties
  const ri = (n: number) => ({ '--i': n }) as React.CSSProperties

  return (
    <>
      <section className="container hero">
        <div className="hero-copy">
          <div className="eyebrow fade-up" style={k(0)}>
            <span className="dot" /> Small tools. A little more freedom.
          </div>
          <h1 aria-label="A little less file friction. A lot more flow.">
            <span className="ln" style={l(0)}>
              <span>A little less</span>
            </span>
            <span className="ln" style={l(1)}>
              <span>file friction.</span>
            </span>
            <span className="ln" style={{ ...l(2), paddingBottom: '.16em' }}>
              <em>
                A lot more flow.
                <svg className="squig" viewBox="0 0 300 12" preserveAspectRatio="none" aria-hidden="true">
                  <path pathLength={100} d="M2 8 C 40 2, 70 12, 110 6 S 190 2, 298 7" />
                </svg>
              </em>
            </span>
          </h1>
          <p className="fade-up" style={k(1)}>
            Your everyday file tools, in one quietly powerful place. <Morph /> it, right in your browser.
          </p>
          <div className="hero-actions fade-up" style={k(2)}>
            <a className="btn btn-primary" href="#tools" data-magnet>
              Find your tool <span className="arrow">↗</span>
            </a>
            <a className="text-link" href="#how">
              See how it works <span>↓</span>
            </a>
          </div>
          <div className="shortcuts fade-up" style={k(3)}>
            <span className="muted">Popular:</span>
            {bySlug(SHORTCUTS).map((t) => (
              <ToolChip key={t.slug} tool={t} />
            ))}
          </div>
          <div className="hero-note fade-up" style={k(4)}>
            <span>
              <Icon name="check" /> Free & open source
            </span>
            <span>
              <Icon name="check" /> No account needed
            </span>
            <span>
              <Icon name="check" /> Nothing uploaded
            </span>
          </div>
        </div>
        <HeroArt />
      </section>

      <YourTools />

      <div className="trust-strip">
        <div className="container trust-inner">
          <span className="trust-intro">Less fuss. More trust.</span>
          <span>
            <Icon name="lock" /> Your files stay yours
          </span>
          <span>
            <Icon name="zap" /> Works in your browser
          </span>
          <span>
            <Icon name="user" /> No sign-up detours
          </span>
          <span>
            <Icon name="code" /> Open by design
          </span>
        </div>
      </div>
      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[...FORMATS, ...FORMATS].map((f, i) => (
            <span key={i} className={i % 3 === 0 ? 'fmt c' : 'fmt'}>
              {f}
            </span>
          ))}
        </div>
      </div>

      <Toolbox />

      <section className="section process" id="how">
        <div className="container process-layout">
          <div className="process-intro" data-reveal>
            <div className="eyebrow">02 / Refreshingly simple</div>
            <h2>
              Less clicking.
              <br />
              More getting done.
            </h2>
            <p>No queues. No email attachments. Just you, your browser, and a job well done.</p>
          </div>
          <div className="steps" data-reveal>
            <div className="step">
              <span className="step-number">1</span>
              <h3>Bring your file.</h3>
              <p>Choose a tool and drop in what you’re working on. It stays right here.</p>
            </div>
            <div className="step">
              <span className="step-number">2</span>
              <h3>Make it your own.</h3>
              <p>Pick your settings. Keep it simple, or get things just the way you like.</p>
            </div>
            <div className="step">
              <span className="step-number">3</span>
              <h3>And you’re off.</h3>
              <p>Your device makes the result and saves it straight to you. No middleman.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section container privacy-section" id="privacy">
        <div className="privacy-art" data-reveal aria-hidden="true">
          <span className="privacy-ring" />
          <span className="privacy-ring two" />
          <div className="big-lock">
            <span className="shackle" />
            <span className="body">
              <i />
            </span>
          </div>
          <span className="privacy-label">✳ Personal means personal.</span>
        </div>
        <div className="privacy-copy" data-reveal style={ri(2)}>
          <div className="eyebrow">03 / Yours, always</div>
          <h2>
            Some things should
            <br />
            stay with you.
          </h2>
          <p>
            Your documents. Your photos. That recording from yesterday. Noritus is built around a simple idea: your files belong on your device. Don’t take our word for it.
          </p>
          <div className="netlog" aria-label="Example of the browser network tab while using a tool">
            <div className="netlog-head">
              <i />
              <i />
              <i />
              &nbsp;NETWORK · MERGING 3 PDFs
            </div>
            <ul>
              <li style={ri(0)}>
                <span>GET /index.html</span>
                <b>200</b>
              </li>
              <li style={ri(1)}>
                <span>GET /assets/pdf-merge.js</span>
                <b>200</b>
              </li>
              <li style={ri(2)}>
                <span>…merging on your device…</span>
                <b>✓</b>
              </li>
              <li className="you" style={ri(3)}>
                <span>Requests carrying your files</span>
                <b>0</b>
              </li>
            </ul>
          </div>
          <a className="text-link" href="/privacy">
            A closer look at privacy <span>↗</span>
          </a>
        </div>
      </section>

      <section className="container faq-layout" id="faq">
        <div data-reveal>
          <div className="eyebrow">A few good questions</div>
          <h2>Glad you asked.</h2>
        </div>
        <div className="faq" data-reveal style={ri(2)}>
          <details>
            <summary>Do I need to make an account?</summary>
            <p>No. Every tool works without one. Signing in with Google is optional, and nothing is locked behind it.</p>
          </details>
          <details>
            <summary>Is it really free?</summary>
            <p>Yes. Noritus is free and open source under the MIT licence.</p>
          </details>
          <details>
            <summary>Do my files go anywhere?</summary>
            <p>No. They are processed inside your browser tab and never uploaded. Open your browser’s Network tab while you use a tool and see for yourself.</p>
          </details>
          <details>
            <summary>Does it work offline?</summary>
            <p>Once a tool has loaded, yes. The work happens on your device, so there is nothing to wait for from a server.</p>
          </details>
        </div>
      </section>
    </>
  )
}
