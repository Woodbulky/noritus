/**
 * Runs after `vite build`. Writes one static HTML per route (dist/<slug>.html, served at /<slug>)
 * with its own title, description, canonical, social tags, JSON-LD and a crawlable heading,
 * plus dist/sitemap.xml and a noindex dist/404.html. React replaces the static body on load.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { CAT_LABEL, CATEGORIES, HOME_DESC, HOME_TITLE, kindId, pageDesc, pageTitle, PRIVACY_DESC, PRIVACY_TITLE, SITE, TOOLS, TOOLS_DESC, TOOLS_TITLE, type Category } from '../src/tools'

const shell = readFileSync('dist/index.html', 'utf8')
if (!/<!-- seo:[\s\S]*?<!-- \/seo -->/.test(shell)) throw new Error('index.html lost its <!-- seo --> block')

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const json = (o: object) => JSON.stringify(o).replace(/</g, '\\u003c')

type Page = { path: string; title: string; desc: string; body: string; ld?: object; noindex?: boolean }

function render({ path, title, desc, body, ld, noindex }: Page) {
  const url = SITE + path
  const head = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}" />`,
    noindex ? '<meta name="robots" content="noindex" />' : `<link rel="canonical" href="${url}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(desc)}" />`,
    `<meta property="og:url" content="${url}" />`,
    ld ? `<script type="application/ld+json">${json({ '@context': 'https://schema.org', ...ld })}</script>` : '',
  ]
  return shell.replace(/<!-- seo:[\s\S]*?<!-- \/seo -->/, head.filter(Boolean).join('\n    ')).replace('<div id="root"></div>', `<div id="root">${body}</div>`)
}

const live = TOOLS.filter((t) => t.load)
const crumbs = (items: [string, string][]) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + path })),
})

const toolList = CATEGORIES.slice(1)
  .map(([id, name]) => {
    const items = live.filter((t) => t.category === id)
    return `<h2 id="${kindId(id as Category)}">${esc(name)}</h2><ul>${items.map((t) => `<li><a href="/${t.slug}">${esc(t.name)}</a>: ${esc(t.blurb)}</li>`).join('')}</ul>`
  })
  .join('')

const pages: [string, Page][] = [
  [
    'index.html',
    {
      path: '/',
      title: HOME_TITLE,
      desc: HOME_DESC,
      ld: { '@type': 'WebSite', name: 'Noritus', url: `${SITE}/`, description: HOME_DESC },
      body:
        `<section class="container room"><h1>Free file tools that never upload your files.</h1><p>${esc(HOME_DESC)}</p><p><a href="/tools">Open the toolbox</a></p>` +
        toolList +
        '<p><a href="/privacy">How your files stay on your device</a></p></section>',
    },
  ],
  [
    'tools.html',
    {
      path: '/tools',
      title: TOOLS_TITLE,
      desc: TOOLS_DESC,
      ld: crumbs([['Noritus', '/'], ['The toolbox', '/tools']]),
      body: `<section class="container room"><h1>Find your tool.</h1><p>${esc(TOOLS_DESC)}</p>${toolList}</section>`,
    },
  ],
  [
    'privacy.html',
    {
      path: '/privacy',
      title: PRIVACY_TITLE,
      desc: PRIVACY_DESC,
      ld: crumbs([['Noritus', '/'], ['Privacy', '/privacy']]),
      body: `<section class="container room"><h1>Privacy.</h1><p>${esc(PRIVACY_DESC)}</p><p><a href="/">All ${live.length} tools</a></p></section>`,
    },
  ],
  [
    '404.html',
    {
      path: '/404',
      title: 'Page not found — Noritus',
      desc: HOME_DESC,
      noindex: true,
      body: '<section class="container room"><h1>This page wandered off.</h1><p><a href="/">Back to the toolbox</a></p></section>',
    },
  ],
  ...TOOLS.map((t): [string, Page] => [
    `${t.slug}.html`,
    {
      path: `/${t.slug}`,
      title: pageTitle(t),
      desc: pageDesc(t),
      noindex: !t.load,
      ld: {
        '@graph': [
          {
            '@type': 'WebApplication',
            name: t.name,
            alternateName: t.seo,
            url: `${SITE}/${t.slug}`,
            description: pageDesc(t),
            applicationCategory: t.category === 'Media' ? 'MultimediaApplication' : 'UtilitiesApplication',
            operatingSystem: 'Any (runs in your web browser)',
            isAccessibleForFree: true,
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          },
          crumbs([['Noritus', '/'], [t.name, `/${t.slug}`]]),
        ],
      },
      body:
        `<section class="container room"><a class="back-button" href="/tools">← Back to the toolbox</a>` +
        `<div class="eyebrow">${esc(CAT_LABEL[t.category])} / On your device</div><h1>${esc(t.name)}.</h1><p>${esc(t.blurb)}</p></section>`,
    },
  ]),
]

for (const [file, page] of pages) writeFileSync(`dist/${file}`, render(page))

const today = new Date().toISOString().slice(0, 10)
const urls = ['/', '/tools', ...live.map((t) => `/${t.slug}`), '/privacy']
writeFileSync(
  'dist/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`)
    .join('\n')}\n</urlset>\n`,
)
console.log(`prerender: ${pages.length} pages, ${urls.length} sitemap urls`)
