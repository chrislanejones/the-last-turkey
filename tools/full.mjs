import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 640, height: 360 } })
p.on('pageerror', e => console.log('ERR', e.message))
await p.goto('http://localhost:8765/?shot&play', { waitUntil: 'load' })
await p.waitForFunction(() => window.__game, null, { timeout: 180000 })
console.log(await p.evaluate(() => { const g = window.__game, U = 4.084, log = []; g.sim(4.3); g.P.pos.set(-140 * U, 380 * U)
  for (let t = 0; t < 90 && g.game.state === 'chase' || t < 3; t++) { g.sim(1); if (t % 3 === 0) log.push(`t=${t} pathI=${g.game.pathI} x=${(g.R.pos.x / U).toFixed(1)} z=${(g.R.pos.y / U).toFixed(1)} v=${g.R.fwd.toFixed(1)} grab=${g.game.grab.toFixed(2)} armor=${g.game.armor.toFixed(0)}`) }
  log.push('end ' + g.game.state); return log.join('\n') }))
await b.close()
