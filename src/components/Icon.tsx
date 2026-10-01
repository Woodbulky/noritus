/* 24px line icons from prototype.html. The markup is static, so innerHTML is safe here. */
const PATHS = {
  file: '<path d="M14 3H6a1 1 0 0 0-1 1v16h14V8zM14 3v5h5M8 12h8M8 16h6"/>',
  merge: '<rect x="3" y="3" width="12" height="14" rx="1"/><path d="M9 17v4h12V7h-6M6 7h5M6 11h5"/>',
  scissors: '<circle cx="5" cy="6" r="3"/><circle cx="5" cy="18" r="3"/><path d="m8 7 13 14M8 17 21 3"/>',
  sort: '<path d="M7 3v18m-4-4 4 4 4-4M17 21V3m-4 4 4-4 4 4"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="2"/><path d="m3 18 6-6 4 4 3-3 5 5"/>',
  pen: '<path d="m15 4 5 5M3 21l6-2L21 7a2 2 0 0 0-4-4L5 15zM5 15l4 4"/>',
  water: '<path d="M12 3C8 9 5 11 5 15a7 7 0 0 0 14 0c0-4-3-6-7-12zM9 15a3 3 0 0 0 3 3"/>',
  music: '<path d="M9 18V5l11-2v13M9 9l11-2"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="17" cy="16" rx="3" ry="3"/>',
  video: '<rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-3v10l-5-3z"/>',
  compress: '<path d="m3 3 6 6m0-5v5H4m17 12-6-6m0 5v-5h5M3 21l6-6m-5 0h5v5M21 3l-6 6m0-5v5h5"/>',
  record: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><circle cx="12" cy="10" r="3"/>',
  convert: '<path d="M3 7h17m-4-4 4 4-4 4M21 17H4m4-4-4 4 4 4"/>',
  location: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0z"/><circle cx="12" cy="10" r="2"/>',
  qr: '<path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h3v3h3v3h-6zM12 3v3M12 12h3M3 12h3M12 18v3M21 12v3"/>',
  hash: '<path d="M9 3 7 21M17 3l-2 18M3 8h18M3 16h18"/>',
  award: '<circle cx="12" cy="8" r="5"/><path d="m8 12-2 9 6-3 6 3-2-9"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  zap: '<path d="m13 2-9 12h7l-1 8 10-13h-8z"/>',
  user: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  mute: '<path d="M11 5 6 9H3v6h3l5 4zM16 9l5 6m0-6-5 6"/>',
  play: '<path d="m7 3 14 9-14 9z"/>',
}

export type IconName = keyof typeof PATHS

export default function Icon({ name }: { name: IconName }) {
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: PATHS[name] }} />
}
