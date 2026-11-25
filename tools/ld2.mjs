import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
for (const [name, w, h] of [['desktop', 1600, 900], ['phone', 390, 844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 })
  await p.goto('http://localhost:8765/', { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(2500)
  await p.evaluate(() => { const L = document.getElementById('loading'); L.classList.remove('gone'); L.style.opacity = '1'; L.style.display = 'grid'
    for (const sel of ['.track', '#bar', '#loading p', '#loading small']) document.querySelectorAll(sel).forEach((e) => { if (!e.closest('h1')) e.style.display = 'none' }) })
  await p.waitForTimeout(500)
  await p.screenshot({ path: `/tmp/title-${name}.png` }); await p.close()
}
await b.close()
