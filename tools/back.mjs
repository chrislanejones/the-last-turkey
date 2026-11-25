import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1280, height: 720 } })
p.on('pageerror', e => console.log('ERR', e.message))
await p.goto('http://localhost:8765/?shot&play', { waitUntil: 'load' })
await p.waitForFunction(() => window.__game, null, { timeout: 180000 })
console.log(await p.evaluate(() => { const g = window.__game, U = 4.084, log = [], at = (t, v) => log.push(`${t}: x=${(v.pos.x / U).toFixed(1)} z=${(v.pos.y / U).toFixed(1)} h=${(v.heading * 57.3).toFixed(0)} v=${v.fwd.toFixed(1)}`)
  g.sim(4.3); for (let i = 0; i < 8; i++) { g.sim(1); at('wagon t+' + (i + 1), g.R) }
  // player: back straight out, then swing and go
  g.reset(true); g.sim(5.5); g.game.cans = 0; g.R.pos.set(-60 * U, 300 * U); g.R.vel.set(0, 0)
  g.keys.add('s'); g.sim(1.6); at('player backed', g.P); g.keys.add('a'); g.sim(1.5); at('player swung', g.P); g.keys.clear(); g.keys.add('w'); g.sim(3); at('player forward', g.P); g.keys.clear()
  return log.join('\n') }))
await b.close()
