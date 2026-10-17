// Generates the Tempo logo files (SVG + PNG) from the same geometry as src/components/Logo.tsx.
//   npm run brand
// Output: public/brand/*.svg, public/brand/png/*.png, public/favicon.svg, docs/brand-sheet.png
import { chromium } from '@playwright/test'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const brandDir = path.join(root, 'public/brand')
const pngDir = path.join(brandDir, 'png')
await mkdir(pngDir, { recursive: true })

// ---- geometry (mirrors Logo.tsx) ----
const BOLT = 'M42 0 L6 56 H28 L18 100 L60 40 H37 L48 0 Z'
const LETTERS = [
  [0, 'M0 0H76V24H50V100H26V24H0Z'],
  [90, 'M0 0H70V24H24V38H58V62H24V76H70V100H0Z'],
  [174, 'M0 0H24L53 52L82 0H106V100H82V38L62 74H44L24 38V100H0Z'],
  [294, 'M0 0H72V58H24V100H0ZM24 24V34H48V24Z'],
  [380, 'M14 0H66L80 14V86L66 100H14L0 86V14ZM28 24L24 28V72L28 76H52L56 72V28L52 24Z'],
]
const WORD_W = 482
const WORD_H = 100
const ORANGE = '#ff6a00'
const PINK = '#ff3d8a'
const BLACK = '#121212'
const WHITE = '#ffffff'

const gradient = (id) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb061"/><stop offset="0.55" stop-color="${ORANGE}"/><stop offset="1" stop-color="${PINK}"/></linearGradient>`
const bolt = (gid, extra = '') =>
  `<g ${extra}><path d="${BOLT}" fill="url(#${gid})"/><path d="${BOLT}" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="2" stroke-linejoin="round"/></g>`
const wordmark = (color, extra = '') =>
  `<g ${extra}><g transform="translate(21 0) skewX(-12)" fill="${color}" fill-rule="evenodd">${LETTERS.map(([x, d]) => `<path d="${d}" transform="translate(${x} 0)"/>`).join('')}</g></g>`
const svg = (w, h, body, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${title}">\n${body}\n</svg>\n`

const files = {}

// Primary: stacked. Bolt 90×150 centred above the 482×100 wordmark; padding 40.
{
  const pad = 40
  const boltH = 150
  const gap = 30
  const w = WORD_W + pad * 2
  const h = boltH + gap + WORD_H + pad * 2
  const body = (word) =>
    `<defs>${gradient('g')}</defs>` +
    bolt('g', `transform="translate(${(w - 90) / 2} ${pad}) scale(1.5)"`) +
    wordmark(word, `transform="translate(${pad} ${pad + boltH + gap})"`)
  files['tempo-primary.svg'] = svg(w, h, body(BLACK), 'Tempo')
  files['tempo-primary-white.svg'] = svg(w, h, body(WHITE), 'Tempo')
  files['tempo-primary-on-black.svg'] = svg(w, h, `<rect width="${w}" height="${h}" fill="${BLACK}"/>` + body(WHITE), 'Tempo')
}

// Secondary: horizontal. Bolt 60×100 then wordmark at 78px cap height, vertically centred.
{
  const pad = 30
  const boltH = 100
  const gap = 22
  const wordScale = 0.78
  const w = pad * 2 + 60 + gap + WORD_W * wordScale
  const h = boltH + pad * 2
  const body = (word) =>
    `<defs>${gradient('g')}</defs>` +
    bolt('g', `transform="translate(${pad} ${pad})"`) +
    wordmark(word, `transform="translate(${pad + 60 + gap} ${pad + (boltH - WORD_H * wordScale) / 2}) scale(${wordScale})"`)
  files['tempo-secondary.svg'] = svg(Math.round(w), h, body(BLACK), 'Tempo')
  files['tempo-secondary-white.svg'] = svg(Math.round(w), h, body(WHITE), 'Tempo')
  files['tempo-secondary-on-black.svg'] = svg(Math.round(w), h, `<rect width="${Math.round(w)}" height="${h}" fill="${BLACK}"/>` + body(WHITE), 'Tempo')
}

// Submark: bolt in a black circle with an orange ring and pink sparks (also a square variant).
{
  const sparks = `<g stroke="${PINK}" stroke-width="3.5" stroke-linecap="round"><line x1="24" y1="30" x2="29" y2="35"/><line x1="74" y1="68" x2="79" y2="73"/><line x1="76" y1="28" x2="71" y2="33"/></g>`
  const inner = `<defs>${gradient('g')}</defs>` + bolt('g', 'transform="translate(32 20) scale(0.6)"') + sparks
  files['tempo-submark.svg'] = svg(100, 100, `<circle cx="50" cy="50" r="50" fill="${BLACK}"/><circle cx="50" cy="50" r="44" fill="none" stroke="${ORANGE}" stroke-width="3" stroke-opacity="0.9"/>` + inner, 'Tempo submark')
  files['tempo-submark-square.svg'] = svg(100, 100, `<rect width="100" height="100" rx="26" fill="${BLACK}"/><rect x="6" y="6" width="88" height="88" rx="21" fill="none" stroke="${ORANGE}" stroke-width="3" stroke-opacity="0.9"/>` + inner, 'Tempo submark')
  files['tempo-submark-mono.svg'] = svg(100, 100, `<circle cx="50" cy="50" r="50" fill="${BLACK}"/><g transform="translate(32 20) scale(0.6)"><path d="${BOLT}" fill="${WHITE}"/></g>`, 'Tempo submark')
}

// Favicon: simplified — solid orange bolt, no sparks or gradient, on a black rounded square.
{
  files['tempo-favicon.svg'] = svg(64, 64, `<rect width="64" height="64" rx="14" fill="${BLACK}"/><g transform="translate(16 4) scale(0.56)"><path d="${BOLT}" fill="${ORANGE}"/></g>`, 'Tempo')
}

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
  const out = name.replace('.svg', `-${width}.png`)
  await writeFile(path.join(pngDir, out), png)
}
await exportPng('tempo-primary.svg', 1200)
await exportPng('tempo-primary-white.svg', 1200)
await exportPng('tempo-primary-on-black.svg', 1200, false)
await exportPng('tempo-secondary.svg', 1600)
await exportPng('tempo-secondary-white.svg', 1600)
await exportPng('tempo-secondary-on-black.svg', 1600, false)
await exportPng('tempo-submark.svg', 512)
await exportPng('tempo-submark-square.svg', 512)
await exportPng('tempo-submark-mono.svg', 512)
await exportPng('tempo-favicon.svg', 256)
await exportPng('tempo-favicon.svg', 32)

// Brand sheet: everything side by side on light and dark.
const tile = (title, name, bg, fg, w) =>
  `<div style="background:${bg};color:${fg};border-radius:18px;padding:28px;display:flex;flex-direction:column;gap:14px;align-items:center;justify-content:center;border:1px solid rgba(127,127,127,.25)">` +
  `<div style="font:700 13px/1 system-ui;letter-spacing:.12em;text-transform:uppercase;opacity:.6">${title}</div>` +
  `<div style="width:${w}px;max-width:100%">${files[name].replace('<svg ', '<svg style="width:100%;height:auto;display:block" ')}</div></div>`
const sheet = `<html><body style="margin:0;background:#eef0f3;font-family:system-ui;padding:36px;width:1400px;box-sizing:border-box">
<div style="display:flex;align-items:baseline;gap:16px;margin-bottom:22px"><div style="font:900 34px/1 system-ui;letter-spacing:.14em">TEMPO LOGO SYSTEM</div><div style="font:600 16px/1 system-ui;color:#6b7280">Tracking the tempo of every set.</div></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
${tile('Primary · light', 'tempo-primary.svg', '#ffffff', '#121212', 360)}
${tile('Primary · dark', 'tempo-primary-white.svg', '#0f1012', '#f5f5f5', 360)}
${tile('Secondary · light', 'tempo-secondary.svg', '#ffffff', '#121212', 520)}
${tile('Secondary · dark', 'tempo-secondary-white.svg', '#0f1012', '#f5f5f5', 520)}
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px">
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
await page.setViewportSize({ width: 1400, height: 1100 })
await page.setContent(sheet)
await mkdir(path.join(root, 'docs'), { recursive: true })
await page.screenshot({ path: path.join(root, 'docs/brand-sheet.png'), fullPage: true, type: 'png' })
await browser.close()
console.log('wrote PNG exports and docs/brand-sheet.png')
