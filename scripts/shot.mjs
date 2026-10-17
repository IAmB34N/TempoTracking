// Screenshot a Tempo page with the Playwright-managed Chromium.
//   node scripts/shot.mjs --url http://127.0.0.1:5173/#/ --out /tmp/home.png [--seed seed.json] [--mobile] [--dark] [--landscape]
import { chromium } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const args = process.argv.slice(2)
const opt = (name, def) => {
  const i = args.indexOf(name)
  return i === -1 ? def : args[i + 1]
}
const flag = (name) => args.includes(name)
const url = opt('--url', 'http://127.0.0.1:5173/#/')
const out = opt('--out', 'shot.png')
const seedPath = opt('--seed', null)
const mobile = flag('--mobile')
const landscape = flag('--landscape')
const dark = flag('--dark')
const full = flag('--full')

const seed = seedPath ? JSON.parse(await readFile(seedPath, 'utf8')) : null
const browser = await chromium.launch()
const viewport = mobile ? (landscape ? { width: 844, height: 390 } : { width: 390, height: 844 }) : { width: 1280, height: 800 }
const context = await browser.newContext({ viewport, deviceScaleFactor: mobile ? 2 : 1, hasTouch: mobile, isMobile: mobile, colorScheme: dark ? 'dark' : 'light' })
if (seed || dark) {
  await context.addInitScript(
    ({ seed, dark }) => {
      try {
        const existing = seed ?? JSON.parse(localStorage.getItem('tempo.v1') || 'null') ?? { version: 1, games: [], teams: [] }
        if (dark) existing.settings = { ...(existing.settings ?? {}), darkMode: true }
        localStorage.setItem('tempo.v1', JSON.stringify(existing))
      } catch {}
    },
    { seed, dark },
  )
}
const page = await context.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(300)
if (full) {
  const h = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight))
  await page.setViewportSize({ width: viewport.width, height: Math.min(Math.max(h, viewport.height), 6000) })
  await page.waitForTimeout(100)
}
await page.screenshot({ path: out, fullPage: full })
await browser.close()
console.log('wrote', out, errors.length ? `\nERRORS:\n${errors.join('\n')}` : '')
process.exit(errors.length ? 2 : 0)
