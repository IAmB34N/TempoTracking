// Renders public/favicon.svg into the PNG icons the manifest and iOS expect.
// Uses the Playwright-managed Chromium; run with `npm run icons`.
import { chromium } from '@playwright/test'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const svg = await readFile(path.join(root, 'public/favicon.svg'), 'utf8')
const outDir = path.join(root, 'public/icons')
await mkdir(outDir, { recursive: true })

const targets = [
  { file: 'icon-192.png', size: 192, pad: 0 },
  { file: 'icon-512.png', size: 512, pad: 0 },
  { file: 'apple-touch-icon.png', size: 180, pad: 0 },
  // maskable icons need ~20% safe-zone padding; fill the background with the mark's black.
  { file: 'icon-maskable-512.png', size: 512, pad: 0.18 },
]

const browser = await chromium.launch()
const page = await browser.newPage({ deviceScaleFactor: 1 })
for (const t of targets) {
  const inner = Math.round(t.size * (1 - 2 * t.pad))
  const bg = t.pad ? '#121212' : 'transparent'
  await page.setViewportSize({ width: t.size, height: t.size })
  await page.setContent(
    `<html><body style="margin:0;background:${bg};width:${t.size}px;height:${t.size}px;display:flex;align-items:center;justify-content:center">` +
      `<div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', '<svg style="width:100%;height:100%" ')}</div></body></html>`,
  )
  const png = await page.screenshot({ omitBackground: !t.pad, type: 'png' })
  await writeFile(path.join(outDir, t.file), png)
  console.log('wrote', t.file)
}
await browser.close()
