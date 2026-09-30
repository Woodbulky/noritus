import { Brand } from './Logo'

const REPO = 'https://github.com/Woodbulky/noritus'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <Brand />
        <p>A calmer corner of the internet. Your files stay with you.</p>
        <a href="/privacy">Privacy</a>
        <a href={`${REPO}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer">
          MIT licence
        </a>
        <a href={REPO} target="_blank" rel="noopener noreferrer">
          Open source ↗
        </a>
      </div>
    </footer>
  )
}
