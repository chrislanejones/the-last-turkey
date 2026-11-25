import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const sizes = [['iphone-se-land', 667, 375], ['iphone-15-land', 852, 393], ['iphone-15-port', 393, 852], ['android-land', 915, 412], ['android-port', 412, 915]]
for (const [name, w, h] of sizes) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' })
  const p = await ctx.newPage(); const errs = []
  p.on('pageerror', e => errs.push(e.message))
  await p.goto('http://localhost:8765/', { waitUntil: 'load' })
  await p.waitForTimeout(1500); await p.screenshot({ path: `/tmp/mob-${name}-load.png` })
  await p.waitForFunction(() => window.__game, null, { timeout: 180000 }); await p.waitForTimeout(4500)
  await p.screenshot({ path: `/tmp/mob-${name}-intro.png` })
  await p.tap('#playBtn').catch(() => {}); await p.waitForTimeout(500)
  await p.evaluate(() => { const g = window.__game; g.sim(7); g.game.cans = 6; g.game.sodaReady = true; g.game.soda = 2; g.game.gotLattes = true; g.game.lattes = 2; g.game.grab = 0.4; g.game.lastGrab = 0.3;
    document.getElementById('bubble2').textContent = 'AND OF COURSE, EVERY CRANBERRY CAN IS THROWN AT ME!'; document.getElementById('bubble2').classList.add('show'); g.game.b2T = 99
    document.getElementById('bubble').classList.add('show'); g.game.bubbleT = 99; g.sim(0.05) })
  await p.waitForTimeout(1500)
  await p.screenshot({ path: `/tmp/mob-${name}-play.png` })
  // overlap report between HUD boxes
  const rep = await p.evaluate(() => {
    const ids = ['mission', 'minimap', 'speedo', 'objective', 'camBtn', 'sodaBtn', 'keysBtn', ...[...document.querySelectorAll('#touch button.t')].map((b, i) => (b.id = b.id || 'tb' + i))]
    const R = ids.map((id) => { const e = document.getElementById(id); if (!e || !e.offsetParent && getComputedStyle(e).position !== 'fixed') return null; const r = e.getBoundingClientRect(); if (!r.width || getComputedStyle(e).display === 'none' || getComputedStyle(e).visibility === 'hidden') return null; return { id, l: r.left, t: r.top, r: r.right, b: r.bottom } }).filter(Boolean)
    const out = []
    for (const a of R) { if (a.l < -1 || a.t < -1 || a.r > innerWidth + 1 || a.b > innerHeight + 1) out.push('OFFSCREEN ' + a.id) }
    for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) { const a = R[i], c = R[j]; const ox = Math.min(a.r, c.r) - Math.max(a.l, c.l), oy = Math.min(a.b, c.b) - Math.max(a.t, c.t); if (ox > 2 && oy > 2) out.push(`OVERLAP ${a.id}/${c.id} ${ox.toFixed(0)}x${oy.toFixed(0)}`) }
    return out.join('; ') || 'clean' })
  console.log(name, rep, errs.join(' | '))
  await ctx.close()
}
await b.close()
