import { CATEGORIES, kindId, TOOLS, type Category } from '../tools'
import { Brand } from './Logo'

const REPO = 'https://github.com/Woodbulky/noritus'
const YEAR = new Date().getFullYear()
const POPULAR = ['pdf-merge', 'pdf-compress', 'mp4-to-mp3', 'image-resize', 'certify']

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Brand />
            <p>A calmer corner of the internet. Everyday file tools that never upload your files.</p>
          </div>
          <nav aria-label="Tools by kind">
            <h4>Tools</h4>
            <ul>
              {CATEGORIES.slice(1).map(([id, name]) => (
                <li key={id}>
                  <a href={`/tools#${kindId(id as Category)}`}>{name}</a>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Popular tools">
            <h4>Popular</h4>
            <ul>
              {POPULAR.map((slug) => (
                <li key={slug}>
                  <a href={`/${slug}`}>{TOOLS.find((t) => t.slug === slug)?.name}</a>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="About Noritus">
            <h4>Noritus</h4>
            <ul>
              <li>
                <a href="/privacy">Privacy</a>
              </li>
              <li>
                <a href={REPO} target="_blank" rel="noopener noreferrer">
                  Open source ↗
                </a>
              </li>
              <li>
                <a href={`${REPO}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer">
                  MIT licence
                </a>
              </li>
            </ul>
          </nav>
        </div>
        <div className="footer-bottom">
          <span>© {YEAR} Noritus. Your files stay with you.</span>
          <span>Made with care, run on your device.</span>
        </div>
      </div>
    </footer>
  )
}
