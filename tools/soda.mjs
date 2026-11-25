import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1280, height: 720 } })
p.on('pageerror', e => console.log('ERR', e.message))
await p.goto('http://localhost:8765/?shot&play', { waitUntil: 'load' })
await p.waitForFunction(() => window.__game, null, { timeout: 180000 })
console.log(await p.evaluate(() => { const g = window.__game, log = []; g.sim(5.5)
  g.throwSoda(); log.push(`before his first throw: soda=${g.game.soda}`)
  let i = 0; g.keys.add('w'); while (!g.game.sodaReady && i++ < 1200) g.sim(1 / 60); g.keys.clear(); log.push(`ready after ${(i / 60).toFixed(1)}s, cans=${g.game.cans}`)
  for (let k = 0; k < 3; k++) { g.throwSoda(); g.sim(1.6); log.push(`throw ${k + 1}: soda=${g.game.soda} his hp=${g.game.health.toFixed(0)}`) }
  return log.join('\n') }))
await b.close()
