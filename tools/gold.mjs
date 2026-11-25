import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 640, height: 360 } })
p.on('pageerror', e => console.log('ERR', e.message))
await p.goto('http://localhost:8765/?shot&play', { waitUntil: 'load' })
await p.waitForFunction(() => window.__game, null, { timeout: 180000 })
console.log(await p.evaluate(() => { const g = window.__game, U = 4.084; g.sim(5.5); g.game.cans = 1; g.game.throwCool = 0
  let out = ''
  for (let tries = 0; tries < 12 && g.game.state === 'chase'; tries++) { g.game.cans = 1; g.game.throwCool = 0; g.P.pos.set(g.R.pos.x + 10 * U / U * 2, g.R.pos.y); g.P.vel.set(0, 0); g.sim(2.5) }
  return `state=${g.game.state} people=${g.game.people} cans=${g.game.cans}` }))
await b.close()
