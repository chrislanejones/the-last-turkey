import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1280, height: 720 } })
p.on('pageerror', e => console.log('ERR', e.message))
await p.goto('http://localhost:8765/?shot&play', { waitUntil: 'load' })
await p.waitForFunction(() => window.__game, null, { timeout: 180000 })
console.log(await p.evaluate(() => {
  const g = window.__game, log = []
  g.sim(5.5)
  // park the Galaxie in his way up the lot and see whether he swings at it
  g.P.pos.copy(g.PATH[6]); g.P.vel.set(0, 0)
  let attacks = 0, last = 'seek'
  for (let i = 0; i < 60 * 45 && g.game.state === 'chase'; i++) { g.sim(1 / 60); if (g.game.ai === 'attack' && last !== 'attack') attacks++; last = g.game.ai; if (i % 300 === 0) log.push(`t=${i / 60 | 0} ai=${g.game.ai} armor=${g.game.armor.toFixed(0)} hp=${g.game.health.toFixed(0)} grab=${g.game.grab.toFixed(2)} dist=${g.R.pos.distanceTo(g.P.pos).toFixed(0)}`) }
  log.push(`end state=${g.game.state} attacks=${attacks} armor=${g.game.armor.toFixed(0)} hp=${g.game.health.toFixed(0)}`)
  return log.join('\n')
}))
await b.close()
