import { useEffect, useRef } from 'react'
import { CAT_CAPTION, FLOWS, kindId, TOOLS, type Category, type Tool } from '../tools'
import Icon, { type IconName } from './Icon'
import { Mark } from './Logo'

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
const VERBS = ['Merge', 'Convert', 'Trim', 'Sign', 'Compress', 'Certify']
const FORMATS = ['PDF', 'MP3', 'MP4', 'JPG', 'PNG', 'WEBP', 'GIF', 'WAV', 'AAC', 'HEIC', 'CSV', 'XLSX', 'ZIP', 'QR', 'MOV', 'WEBM']
const SHORTCUTS = ['pdf-merge', 'compress-video', 'certify']

/** The landing page's overview of each kind: a few well-known tools, and a link to the rest. */
const KINDS: { id: Category; name: string; icon: IconName; text?: string; slugs: string[] }[] = [
  {
    id: 'PDF',
    name: 'PDF & documents',
    icon: 'file',
    text: 'Merge, split, sign, compress and tidy. A little order for every page, from the first draft to the final submit.',
    slugs: ['pdf-merge', 'pdf-compress', 'pdf-split', 'pdf-sign', 'images-to-pdf', 'pdf-organize', 'pdf-ocr', 'pdf-fill-form', 'pdf-redact', 'pdf-protect'],
  },
  { id: 'Media', name: 'Audio & video', icon: 'music', slugs: ['mp4-to-mp3', 'compress-video', 'trim-media'] },
  { id: 'Image', name: 'Images', icon: 'image', slugs: ['image-compress', 'image-resize', 'image-convert'] },
  { id: 'Generate', name: 'Generators', icon: 'award', slugs: ['certify', 'invitations', 'qr-generator'] },
  { id: 'Utility', name: 'Utilities', icon: 'hash', slugs: ['word-counter', 'spreadsheet-convert', 'text-diff'] },
]

const FAQ: [string, string][] = [
  ['Do I need to make an account?', 'No. Every tool works without one. Signing in with Google is optional, and nothing is locked behind it.'],
  ['Is it really free?', 'Yes. Noritus is free and open source under the MIT licence. There is no paid tier and no watermark on your results.'],
  ['Do my files go anywhere?', 'No. They are processed inside your browser tab and never uploaded. Open your browser’s Network tab while you use a tool and see for yourself.'],
  ['Does it work offline?', 'Once a tool has loaded, yes. The work happens on your device, so there is nothing to wait for from a server.'],
  ['Does it work on my phone?', 'Yes. Every tool works in a modern mobile browser. Very large videos are quicker on a laptop, since your own device does the work.'],
  ['Is there a file size limit?', 'Only your device’s memory. There is no upload, so there is no upload limit.'],
]

const bySlug = (slugs: string[]) => slugs.map((s) => TOOLS.find((t) => t.slug === s && t.load)).filter((t): t is Tool => !!t)
const countOf = (c: Category) => TOOLS.filter((t) => t.category === c).length

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
  // Sections fade up as they enter view; the padlock snaps shut, the netlog types in and the tool count ticks up.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return
          const el = e.target as HTMLElement
          el.classList.add('in')
          io.unobserve(el)
          if (el.classList.contains('privacy-art')) setTimeout(() => el.classList.add('locked'), reduce ? 0 : 500)
          el.querySelectorAll<HTMLElement>('[data-count]').forEach((b) => {
            if (reduce) return
            const to = Number(b.dataset.count)
            const t0 = performance.now()
            const tick = (t: number) => {
              const p = Math.min((t - t0) / 1100, 1)
              b.textContent = String(Math.round(to * (1 - (1 - p) ** 3)))
              if (p < 1) requestAnimationFrame(tick)
            }
            requestAnimationFrame(tick)
          })
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
    <div className="landing">
      <section className="container hero">
        <div>
          <div className="eyebrow fade-up" style={k(0)}>
            <span className="dot" /> Free PDF, image & video tools. Nothing uploaded.
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
          <p className="lede fade-up" style={k(1)}>
            Your everyday file tools, in one quietly powerful place. <Morph /> it, right in your browser. Your files never leave your device.
          </p>
          <div className="hero-actions fade-up" style={k(2)}>
            <a className="btn btn-primary" href="/tools" data-magnet>
              Find your tool <span className="arrow">↗</span>
            </a>
            <a className="text-link" href="#how">
              See how it works <span>↓</span>
            </a>
          </div>
          <div className="popular fade-up" style={k(3)}>
            <span className="muted">Popular:</span>
            {bySlug(SHORTCUTS).map((t) => (
              <a key={t.slug} className="chip" href={`/${t.slug}`}>
                <Icon name={t.icon} /> {t.name}
              </a>
            ))}
          </div>
          <div className="ticks fade-up" style={k(4)}>
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

      <section className="section container" id="inside">
        <div className="section-head" data-reveal>
          <div>
            <div className="eyebrow">
              <span className="num">01</span> / What’s inside
            </div>
            <h2>
              One toolbox.
              <br />
              Every everyday file.
            </h2>
          </div>
          <p>{TOOLS.length} small, focused tools for the files you meet every day. Each one opens in a second and does one job well.</p>
        </div>
        <div className="bento">
          {KINDS.map((kind, i) => (
            <article key={kind.id} className={i ? 'kind' : 'kind feature'} data-reveal style={ri(i)}>
              <div className="kind-top">
                <span className="kind-icon">
                  <Icon name={kind.icon} />
                </span>
                <span className="kind-count">{countOf(kind.id)} tools</span>
              </div>
              <h3>{kind.name}</h3>
              <p>{kind.text ?? CAT_CAPTION[kind.id]}</p>
              <div className="kind-tools">
                {bySlug(kind.slugs).map((t) => (
                  <a key={t.slug} href={`/${t.slug}`}>
                    {t.name}
                  </a>
                ))}
              </div>
              {!i && (
                <div className="sheets" aria-hidden="true">
                  <i />
                  <i />
                  <i>
                    <b>.PDF</b>
                  </i>
                </div>
              )}
              <a className="kind-more" href={`/tools#${kindId(kind.id)}`}>
                {i ? 'See all' : `All ${countOf(kind.id)} PDF tools`} <Icon name="arrow" />
              </a>
            </article>
          ))}
        </div>
        <div className="bento-foot" data-reveal>
          <a className="btn btn-primary" href="/tools" data-magnet>
            Browse all {TOOLS.length} tools <span className="arrow">↗</span>
          </a>
        </div>
      </section>

      <section className="section days" id="day">
        <div className="container">
          <div className="section-head" data-reveal>
            <div>
              <div className="eyebrow">
                <span className="num">02</span> / Made for your day
              </div>
              <h2>
                Start with the job,
                <br />
                not the file type.
              </h2>
            </div>
            <p>A few everyday jobs, with the tools you’ll need lined up in order. Finish one step, and your file is handed to the next.</p>
          </div>
          <div className="day-grid">
            {FLOWS.map((f, i) => (
              <article key={f.id} className="day" data-reveal style={ri(i)}>
                <span className="day-num">No. 0{i + 1}</span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
                <ol className="path">
                  {bySlug(f.slugs)
                    .slice(0, 4)
                    .map((t, n) => (
                      <li key={t.slug}>
                        <span>{n + 1}</span>
                        {t.name}
                      </li>
                    ))}
                </ol>
                <a className="text-link" href={`/tools#day-${f.id}`}>
                  Start here <span>↗</span>
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section process" id="how">
        <div className="container process-layout">
          <div className="process-intro" data-reveal>
            <div className="eyebrow">
              <span className="num">03</span> / Refreshingly simple
            </div>
            <h2>
              Less clicking.
              <br />
              More getting done.
            </h2>
            <p>No queues. No email attachments. Just you, your browser, and a job well done.</p>
          </div>
          <div className="steps" data-reveal style={ri(2)}>
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
          <div className="eyebrow">
            <span className="num">04</span> / Yours, always
          </div>
          <h2>Some things should stay with you.</h2>
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

      <section className="numbers" aria-label="Noritus in numbers">
        <div className="container numbers-inner">
          <div className="stat" data-reveal>
            <b data-count={TOOLS.length}>{TOOLS.length}</b>
            <span>everyday tools, and growing</span>
          </div>
          <div className="stat" data-reveal style={ri(1)}>
            <b>
              <em>0</em>
            </b>
            <span>files uploaded. Ever.</span>
          </div>
          <div className="stat" data-reveal style={ri(2)}>
            <b>0</b>
            <span>accounts needed to use any tool</span>
          </div>
          <div className="stat" data-reveal style={ri(3)}>
            <b>MIT</b>
            <span>open source, free to inspect</span>
          </div>
        </div>
      </section>

      <section className="section container faq-layout" id="faq">
        <div className="side" data-reveal>
          <div className="eyebrow">
            <span className="num">05</span> / A few good questions
          </div>
          <h2>Glad you asked.</h2>
          <p>Anything else? The code is open, so every answer can be checked.</p>
        </div>
        <div className="faq" data-reveal style={ri(2)}>
          {FAQ.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="container cta">
        <div className="cta-card" data-reveal>
          <span className="cta-logo">
            <Mark />
          </span>
          <h2>
            Ready when <em>you</em> are.
          </h2>
          <p>Pick a tool, drop in a file, and get on with your day. No sign-up, no upload, no waiting room.</p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="/tools" data-magnet>
              Open the toolbox <span className="arrow">↗</span>
            </a>
            <a className="text-link" href="https://github.com/Woodbulky/noritus" target="_blank" rel="noopener noreferrer">
              Read the code <span>↗</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
