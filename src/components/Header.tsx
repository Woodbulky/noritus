import { useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { authConfigured, hasSession, signIn, signOut, watchUser } from '../lib/auth'
import { Brand } from './Logo'

export default function Header() {
  const ref = useRef<HTMLElement>(null)
  const line = useRef<HTMLDivElement>(null)
  const [user, setUser] = useState<User | null>(null)
  const [authDown, setAuthDown] = useState(false)

  // Shrink on scroll; the coral line tracks scroll depth.
  useEffect(() => {
    let queued = false
    const onScroll = () => {
      if (queued) return
      queued = true
      requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - innerHeight
        ref.current?.classList.toggle('scrolled', scrollY > 20)
        if (line.current) line.current.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`
        queued = false
      })
    }
    addEventListener('scroll', onScroll, { passive: true })
    return () => removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!hasSession()) return
    let off: (() => void) | undefined
    let live = true
    watchUser(setUser).then(
      (u) => (live ? (off = u) : u()),
      () => setAuthDown(true),
    )
    return () => {
      live = false
      off?.()
    }
  }, [])

  const start = () =>
    signIn().catch(() => setAuthDown(true))

  const end = () => signOut().then(() => setUser(null), () => setUser(null))

  const meta = user?.user_metadata as { avatar_url?: string; full_name?: string } | undefined
  const label = meta?.full_name || user?.email || 'Your account'

  return (
    <header className="site-header" ref={ref}>
      <div className="container header-inner">
        <Brand />
        <nav className="nav" aria-label="Main navigation">
          <a href="/#tools">The toolbox</a>
          <a href="/#how">How it works</a>
          <a href="/privacy">Privacy first</a>
        </nav>
        <div className="header-action">
          {user ? (
            <>
              <span className="avatar" title={label}>
                {meta?.avatar_url ? (
                  <img src={meta.avatar_url} alt={label} width={34} height={34} style={{ borderRadius: '50%' }} />
                ) : (
                  label[0].toUpperCase()
                )}
              </span>
              <button className="sign-in" onClick={end}>
                Sign out
              </button>
            </>
          ) : authDown ? (
            <span className="sign-in muted" role="status">
              Sign-in is resting. Every tool still works.
            </span>
          ) : (
            authConfigured && (
              <button className="sign-in" onClick={start}>
                Sign in
              </button>
            )
          )}
          <a className="btn btn-primary" href="/#tools" data-magnet>
            Find your tool <span className="arrow">↗</span>
          </a>
        </div>
      </div>
      <div className="progress-line" ref={line} />
    </header>
  )
}
