import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1280, height: 720 } })
p.on('pageerror', e => console.log('ERR', e.message))
await p.goto('http://localhost:8765/?shot&play', { waitUntil: 'load' })
await p.waitForFunction(() => window.__game, null, { timeout: 180000 })
console.log(await p.evaluate(() => { const g = window.__game, U = 4.084, log = []
  const run = (t, x, z, h, secs) => { g.P.pos.set(x * U, z * U); g.P.heading = h; g.P.vel.set(0, 0); g.keys.add('w'); g.sim(secs); g.keys.clear(); log.push(`${t}: x=${(g.P.pos.x / U).toFixed(1)} z=${(g.P.pos.y / U).toFixed(1)} v=${g.P.fwd.toFixed(1)}`) }
  g.sim(5.5)
  run('lot -> east across grass and road (should stop near x=-75.5)', -78.3, 358, Math.PI / 2, 5)
  run('station -> east (should stop near x=-82.4)', -88, 388, Math.PI / 2, 4)
  run('road north end (z~340)', -72, 346, Math.atan2(6.2, -19.7), 6)
  run('road south end (z~395)', -83.4, 390, 0, 5)
  return log.join('\n') }))
await p.evaluate(() => { const g = window.__game, U = 4.084; g.manual = { pos: new g.V3(-86.5 * U, 4.5, 386 * U), look: new g.V3(-80 * U, 1, 372 * U), fov: 65 }; g.setCam(3) })
await p.waitForTimeout(2500); await p.screenshot({ path: '/tmp/east.png' })
await b.close()
