import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 640, height: 360 } })
p.on('pageerror', e => console.log('ERR', e.message))
await p.goto('http://localhost:8765/?shot&play', { waitUntil: 'load' })
await p.waitForFunction(() => window.__game, null, { timeout: 180000 })
console.log(await p.evaluate(() => { const g = window.__game, U = 4.084, log = []; g.sim(5.5)
  const run = (t, x, z, h, secs) => { Object.assign(g.game, { state: 'chase', armor: 100, people: 100, cans: 0, grab: 0 }); g.R.pos.set(-60 * U, 300 * U); g.P.pos.set(x * U, z * U); g.P.heading = h; g.P.vel.set(0, 0); g.keys.add('w'); g.sim(secs); g.keys.clear(); log.push(`${t}: x=${(g.P.pos.x / U).toFixed(1)} z=${(g.P.pos.y / U).toFixed(1)}`) }
  run('road -> west into the lot', -80, 372.1, -Math.PI / 2, 1.6)
  run('lot -> east onto the road', -86, 365, Math.PI / 2, 1.8)
  run('east lot across the old strip, north-east', -86, 360, Math.atan2(1, -2.2), 2.2)
  run('station -> east onto road', -88, 388.3, Math.PI / 2, 2)
  return log.join('\n') }))
await b.close()
