import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1280, height: 720 } })
p.on('pageerror', e => console.log('ERR', e.message))
await p.goto('http://localhost:8765/?shot&play', { waitUntil: 'load' })
await p.waitForFunction(() => window.__game, null, { timeout: 180000 })
console.log(await p.evaluate(() => { const g = window.__game, log = []; g.sim(5.5); g.keys.add('w')
  for (let i = 0; i < 8; i++) { g.sim(1); log.push(`t=${i + 1} armor=${g.game.armor.toFixed(0)} v=${g.P.fwd.toFixed(1)} state=${g.game.state}`) } return log.join('\n') }))
await b.close()
