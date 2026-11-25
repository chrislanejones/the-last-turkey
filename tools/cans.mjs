import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1280, height: 720 } })
p.on('pageerror', e => console.log('ERR', e.message))
await p.goto('http://localhost:8765/?shot&play', { waitUntil: 'load' })
await p.waitForFunction(() => window.__game, null, { timeout: 180000 })
console.log(await p.evaluate(() => { const g = window.__game, log = []; g.sim(5.5)
  // follow him without ramming, 12 m behind, and count what lands
  for (let i = 0; i < 60 * 40 && g.game.state === 'chase'; i++) {
    const to = g.R.pos.clone().sub(g.P.pos), a = Math.atan2(to.x, to.y) - g.P.heading, d = Math.atan2(Math.sin(a), Math.cos(a))
    g.keys.clear(); if (to.length() > 12 && g.P.fwd < 10) g.keys.add('w'); if (to.length() < 8) g.keys.add('s'); if (d > 0.08) g.keys.add('a'); if (d < -0.08) g.keys.add('d')
    g.sim(1 / 60); if (i % 300 === 0) log.push(`t=${i / 60 | 0} cans=${g.game.cans} people=${g.game.people.toFixed(0)} armor=${g.game.armor.toFixed(0)} dist=${to.length().toFixed(0)}`)
  }
  g.keys.clear(); log.push(`end state=${g.game.state} cans=${g.game.cans} people=${g.game.people.toFixed(0)} armor=${g.game.armor.toFixed(0)}`); return log.join('\n') }))
await p.waitForTimeout(1500); await p.screenshot({ path: '/tmp/cans.png' })
await b.close()
