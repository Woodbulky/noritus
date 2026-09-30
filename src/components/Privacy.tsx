// Account deletion requests go here.
const CONTACT_EMAIL = 'thestudio95official@gmail.com'
const UPDATED = '1 October 2026'

/** Text from docs/PRIVACY.md. Keep the two in sync. */
export default function Privacy() {
  return (
    <div className="container room">
      <div className="eyebrow">Privacy, without the fine print</div>
      <h1>Privacy at Noritus.</h1>
      <div className="prose">
        <h2>Your files never leave your device.</h2>
        <p>
          Every tool on Noritus runs inside your browser. When you merge a PDF or convert a video, the work happens on your computer or phone. We never receive your files,
          their names, or their contents. You can check this yourself: open your browser’s developer tools, go to the Network tab, and use any tool.
        </p>
        <h2>Signing in is optional.</h2>
        <p>
          Every tool works without an account. If you choose “Sign in with Google”, our authentication provider (Supabase) stores your email address, name, profile picture
          and sign-in times so that you can stay signed in. We don’t use this for advertising and we don’t sell or share it. To delete your account, email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we will remove it within 30 days.
        </p>
        <h2>Some tools download an engine.</h2>
        <p>
          Audio and video tools download a processing engine (ffmpeg) from jsDelivr, a public code CDN, the first time you use them. Like any website, jsDelivr sees that a
          download happened. It never sees your files.
        </p>
        <h2>Hosting.</h2>
        <p>The site is served by Cloudflare, which processes standard connection data (such as IP address) to deliver and protect the site.</p>
        <h2>No tracking.</h2>
        <p>
          No analytics, no ads, no tracking cookies. The only storage we use is your browser’s local storage, for your tool preferences and your sign-in session.
        </p>
        <h2>Open source.</h2>
        <p>
          All of the code is public at{' '}
          <a href="https://github.com/Woodbulky/noritus" target="_blank" rel="noopener noreferrer">
            github.com/Woodbulky/noritus
          </a>
          .
        </p>
        <p style={{ marginTop: 34 }}>Last updated: {UPDATED}</p>
      </div>
    </div>
  )
}
