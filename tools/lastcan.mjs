import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 640, height: 360 } })
p.on('pageerror', e => console.log('ERR', e.message))
await p.goto('http://localhost:8765/?shot&play', { waitUntil: 'load' })
await p.waitForFunction(() => window.__game, null, { timeout: 180000 })
console.log(await p.evaluate(() => { const g = window.__game; g.sim(5.5)
  // chase: he should stop at 1 can
  for (let i = 0; i < 40; i++) { g.game.throwCool = 0; g.game.people = 100; g.game.canHits = 0; g.game.state = "chase"; g.P.pos.set(g.R.pos.x + 8, g.R.pos.y); g.P.vel.set(0, 0); g.sim(1) }
  const a = `chase: state=${g.game.state} cans=${g.game.cans} hits=${g.game.canHits}`
  g.game.health = 0; g.game.state = 'claim'; g.game.people = 100; g.game.canHits = 0; g.game.canHits = 0
  g.P.pos.set(g.R.pos.x + 8, g.R.pos.y); g.P.vel.set(0, 0); g.sim(4)
  return a + ` | after wreck: state=${g.game.state} cans=${g.game.cans} hits=${g.game.canHits}` }))
await b.close()
