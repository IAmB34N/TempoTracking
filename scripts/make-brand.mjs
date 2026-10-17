// Generates the Tempo logo files (SVG + PNG) from the same geometry as src/components/Logo.tsx.
//   npm run brand
// Output: public/brand/*.svg, public/brand/png/*.png, public/favicon.svg, docs/brand-sheet.png
import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const brandDir = path.join(root, 'public/brand')
const pngDir = path.join(brandDir, 'png')
await mkdir(pngDir, { recursive: true })

// ---- geometry (mirrors Logo.tsx) ----
const BOLT_T = 'M0 0H84V22H58L46 58H58L26 110L32 58H22L34 22H0Z'
const LETTERS = [
  [0, BOLT_T, true],
  [96, 'M0 0H70L62 22H24V38H60L52 62H24V78H70L62 100H0Z'],
  [178, 'M0 0H26L53 50L80 0H106V100H82V38L62 74H44L24 38V100H0Z'],
  [296, 'M0 0H60L72 12V46L60 58H24V100H0ZM24 22H46L50 26V32L46 36H24Z'],
  [380, 'M18 0H62L80 18V82L62 100H18L0 82V18ZM30 24L24 30V70L30 76H50L56 70V30L50 24Z'],
]
const WORD_W = 478
const WORD_H = 112
const SKEW = -8
const ORANGE = '#ff6a00'
const PINK = '#ff3d8a'
const BLACK = '#121212'
const WHITE = '#ffffff'

const gradient = (id) => `<linearGradient id="${id}" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="#ffb061"/><stop offset="0.5" stop-color="${ORANGE}"/><stop offset="1" stop-color="${PINK}"/></linearGradient>`
const boltT = (fill, extra = '', outline = true) =>
  `<g ${extra}><g transform="translate(16 0) skewX(${SKEW})"><path d="${BOLT_T}" fill="${fill}"/>${outline ? `<path d="${BOLT_T}" fill="none" stroke="#fff" stroke-opacity="0.3" stroke-width="2" stroke-linejoin="round"/>` : ''}</g></g>`
const wordmark = (color, tFill, extra = '') =>
  `<g ${extra}><g transform="translate(16 0) skewX(${SKEW})" fill="${color}" fill-rule="evenodd">${LETTERS.map(([x, d, bolt]) => `<path d="${d}" transform="translate(${x} 0)"${bolt && tFill ? ` fill="${tFill}"` : ''}/>`).join('')}</g></g>`
const svg = (w, h, body, title) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${title}">\n${body}\n</svg>\n`

const files = {}

// Primary: the lightning wordmark with the gradient bolt-T. Padding 30.
{
  const pad = 30
  const w = WORD_W + pad * 2
  const h = WORD_H + pad * 2
  const body = (color) => `<defs>${gradient('g')}</defs>` + wordmark(color, 'url(#g)', `transform="translate(${pad} ${pad})"`)
  files['tempo-primary.svg'] = svg(w, h, body(BLACK), 'Tempo')
  files['tempo-primary-white.svg'] = svg(w, h, body(WHITE), 'Tempo')
  files['tempo-primary-on-black.svg'] = svg(w, h, `<rect width="${w}" height="${h}" fill="${BLACK}"/>` + body(WHITE), 'Tempo')
  files['tempo-primary-mono.svg'] = svg(w, h, wordmark(BLACK, null, `transform="translate(${pad} ${pad})"`), 'Tempo')
}

// Secondary: stacked — big bolt-T mark above the one-colour wordmark.
{
  const pad = 40
  const markScale = 1.9
  const markH = 110 * markScale
  const markW = 90 * markScale
  const gap = 26
  const w = WORD_W + pad * 2
  const h = markH + gap + WORD_H + pad * 2
  const body = (color) => `<defs>${gradient('g')}</defs>` + boltT('url(#g)', `transform="translate(${(w - markW) / 2} ${pad}) scale(${markScale})"`) + wordmark(color, null, `transform="translate(${pad} ${pad + markH + gap})"`)
  files['tempo-secondary.svg'] = svg(w, h, body(BLACK), 'Tempo')
  files['tempo-secondary-white.svg'] = svg(w, h, body(WHITE), 'Tempo')
  files['tempo-secondary-on-black.svg'] = svg(w, h, `<rect width="${w}" height="${h}" fill="${BLACK}"/>` + body(WHITE), 'Tempo')
}

// Mark alone (transparent): the gradient bolt-T.
files['tempo-mark.svg'] = svg(90, 110, `<defs>${gradient('g')}</defs>` + boltT('url(#g)'), 'Tempo mark')
files['tempo-mark-black.svg'] = svg(90, 110, boltT(BLACK, '', false), 'Tempo mark')

// Submark: bolt-T in a black circle with an orange ring and pink sparks (+ square and mono variants).
{
  const sparks = `<g stroke="${PINK}" stroke-width="3.5" stroke-linecap="round"><line x1="22" y1="60" x2="27" y2="65"/><line x1="76" y1="66" x2="71" y2="71"/></g>`
  const glyph = (fill, outline = true) => `<g transform="translate(29 18) scale(0.56) skewX(${SKEW})"><path d="${BOLT_T}" fill="${fill}"/>${outline ? `<path d="${BOLT_T}" fill="none" stroke="#fff" stroke-opacity="0.3" stroke-width="2.5" stroke-linejoin="round"/>` : ''}</g>`
  const inner = `<defs>${gradient('g')}</defs>` + glyph('url(#g)') + sparks
  files['tempo-submark.svg'] = svg(100, 100, `<circle cx="50" cy="50" r="50" fill="${BLACK}"/><circle cx="50" cy="50" r="44" fill="none" stroke="${ORANGE}" stroke-width="3" stroke-opacity="0.9"/>` + inner, 'Tempo submark')
  files['tempo-submark-square.svg'] = svg(100, 100, `<rect width="100" height="100" rx="26" fill="${BLACK}"/><rect x="6" y="6" width="88" height="88" rx="21" fill="none" stroke="${ORANGE}" stroke-width="3" stroke-opacity="0.9"/>` + inner, 'Tempo submark')
  files['tempo-submark-mono.svg'] = svg(100, 100, `<circle cx="50" cy="50" r="50" fill="${BLACK}"/>` + glyph(WHITE, false), 'Tempo submark')
}

// Favicon: the bolt-T, solid orange, on a black rounded square — no gradient, ring or sparks.
files['tempo-favicon.svg'] = svg(64, 64, `<rect width="64" height="64" rx="14" fill="${BLACK}"/><g transform="translate(9 5) scale(0.5) skewX(${SKEW})"><path d="${BOLT_T}" fill="${ORANGE}"/></g>`, 'Tempo')

for (const [name, content] of Object.entries(files)) await writeFile(path.join(brandDir, name), content)
await writeFile(path.join(root, 'public/favicon.svg'), files['tempo-favicon.svg'])
console.log('wrote', Object.keys(files).length, 'svg files')

// ---- PNG exports + brand sheet ----
const browser = await chromium.launch()
const page = await browser.newPage({ deviceScaleFactor: 1 })
const exportPng = async (name, width, transparent = true) => {
  const content = files[name]
  const [, vw, vh] = content.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/).map(Number)
  const height = Math.round((width * vh) / vw)
  await page.setViewportSize({ width, height })
  await page.setContent(`<html><body style="margin:0;background:transparent;width:${width}px;height:${height}px">${content.replace('<svg ', `<svg style="width:${width}px;height:${height}px" `)}</body></html>`)
  const png = await page.screenshot({ omitBackground: transparent, type: 'png' })
  await writeFile(path.join(pngDir, name.replace('.svg', `-${width}.png`)), png)
}
await exportPng('tempo-primary.svg', 1600)
await exportPng('tempo-primary-white.svg', 1600)
await exportPng('tempo-primary-on-black.svg', 1600, false)
await exportPng('tempo-primary-mono.svg', 1600)
await exportPng('tempo-secondary.svg', 1200)
await exportPng('tempo-secondary-white.svg', 1200)
await exportPng('tempo-secondary-on-black.svg', 1200, false)
await exportPng('tempo-mark.svg', 512)
await exportPng('tempo-mark-black.svg', 512)
await exportPng('tempo-submark.svg', 512)
await exportPng('tempo-submark-square.svg', 512)
await exportPng('tempo-submark-mono.svg', 512)
await exportPng('tempo-favicon.svg', 256)
await exportPng('tempo-favicon.svg', 32)

const tile = (title, name, bg, fg, w) =>
  `<div style="background:${bg};color:${fg};border-radius:18px;padding:28px;display:flex;flex-direction:column;gap:14px;align-items:center;justify-content:center;border:1px solid rgba(127,127,127,.25)">` +
  `<div style="font:700 13px/1 system-ui;letter-spacing:.12em;text-transform:uppercase;opacity:.6">${title}</div>` +
  `<div style="width:${w}px;max-width:100%">${files[name].replace('<svg ', '<svg style="width:100%;height:auto;display:block" ')}</div></div>`
const sheet = `<html><body style="margin:0;background:#eef0f3;font-family:system-ui;padding:36px;width:1400px;box-sizing:border-box">
<div style="display:flex;align-items:baseline;gap:16px;margin-bottom:22px"><div style="font:900 34px/1 system-ui;letter-spacing:.14em">TEMPO LOGO SYSTEM</div><div style="font:600 16px/1 system-ui;color:#6b7280">Tracking the tempo of every set.</div></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
${tile('Primary · light', 'tempo-primary.svg', '#ffffff', '#121212', 540)}
${tile('Primary · dark', 'tempo-primary-white.svg', '#0f1012', '#f5f5f5', 540)}
${tile('Secondary · light', 'tempo-secondary.svg', '#ffffff', '#121212', 300)}
${tile('Secondary · dark', 'tempo-secondary-white.svg', '#0f1012', '#f5f5f5', 300)}
<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:20px">
${tile('Mark', 'tempo-mark.svg', '#ffffff', '#121212', 110)}
${tile('Submark', 'tempo-submark.svg', '#ffffff', '#121212', 150)}
${tile('Submark · square', 'tempo-submark-square.svg', '#ffffff', '#121212', 150)}
${tile('Submark · mono', 'tempo-submark-mono.svg', '#ffffff', '#121212', 150)}
</div>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px">
${tile('Favicon · 64', 'tempo-favicon.svg', '#ffffff', '#121212', 96)}
${tile('Favicon · 32', 'tempo-favicon.svg', '#ffffff', '#121212', 32)}
${tile('Favicon · 16', 'tempo-favicon.svg', '#ffffff', '#121212', 16)}
</div>
</div>
<div style="margin-top:22px;display:flex;gap:12px">
${['#ff6a00|Orange · primary', '#121212|Black · secondary', '#ff3d8a|Pink · tertiary', '#eef0f3|Gray · background', '#ffffff|White · surface'].map((s) => { const [c, l] = s.split('|'); return `<div style="flex:1;background:${c};border:1px solid #d6d9de;border-radius:12px;padding:14px;color:${c === '#121212' || c === '#ff6a00' || c === '#ff3d8a' ? '#fff' : '#121212'};font:700 13px system-ui">${l}<div style="opacity:.75;font-weight:500">${c}</div></div>` }).join('')}
</div></body></html>`
await page.setViewportSize({ width: 1400, height: 1000 })
await page.setContent(sheet)
await mkdir(path.join(root, 'docs'), { recursive: true })
await page.screenshot({ path: path.join(root, 'docs/brand-sheet.png'), fullPage: true, type: 'png' })
await browser.close()
console.log('wrote PNG exports and docs/brand-sheet.png')
