import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
for (const [name, w, h] of [['land', 844, 390], ['port', 390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' })
  const p = await ctx.newPage(); const logs = []
  p.on('pageerror', e => logs.push('ERR ' + e.message))
  await p.goto('http://localhost:8765/?shot', { waitUntil: 'load' })
  await p.waitForFunction(() => window.__game, null, { timeout: 180000 })
  await p.waitForTimeout(2500)
  await p.screenshot({ path: `/tmp/m-${name}-intro.png` })
  await p.evaluate(() => { const g = window.__game; document.getElementById('playBtn').click() })
  await p.waitForTimeout(1500)
  await p.evaluate(() => { const g = window.__game; g.sim(9); g.game.sodaReady = true; document.getElementById('bubble3').textContent='GREAT THROW, HONEY!'; document.getElementById('bubble3').classList.add('show'); g.game.b3T=99 })
  await p.waitForTimeout(2500)
  await p.screenshot({ path: `/tmp/m-${name}-play.png` })
  console.log(name, logs.join(' | '), await p.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.offsetParent).map(b => { const r = b.getBoundingClientRect(); return `${b.id||b.textContent.trim()}:${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)}x${Math.round(r.height)}` }).join(' ')), await p.evaluate(() => window.__game.game.state))
  await ctx.close()
}
await b.close()
