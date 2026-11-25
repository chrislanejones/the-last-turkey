import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1280, height: 720 } })
p.on('pageerror', e => console.log('ERR', e.message))
await p.goto('http://localhost:8765/?shot&play', { waitUntil: 'load' })
await p.waitForFunction(() => window.__game, null, { timeout: 180000 })
const out = await p.evaluate(() => {
  const g = window.__game, log = []
  const snap = (tag) => log.push(`${tag} state=${g.game.state} ai=${g.game.ai} hp=${g.game.health.toFixed(0)} grab=${g.game.grab.toFixed(2)} Rd=${g.R.pos.distanceTo(g.DOOR).toFixed(1)} Rv=${g.R.fwd.toFixed(1)} Pd=${g.P.pos.distanceTo(g.DOOR).toFixed(1)} Pv=${g.P.fwd.toFixed(1)}`)
  // 1) leave them alone: do they get the turkey?
  g.sim(6); snap('after cutscene')
  for (let i = 0; i < 12; i++) { g.sim(2); snap(`idle +${(i + 1) * 2}s`); if (g.game.state === 'lost') break }
  // 2) restart and just floor it straight at them, steering toward the wagon
  g.reset(true); g.sim(6); snap('restart')
  for (let i = 0; i < 60 * 60 && g.game.state === 'chase'; i++) {
    const to = g.R.pos.clone().sub(g.P.pos), diff = Math.atan2(Math.sin(Math.atan2(to.x, to.y) - g.P.heading), Math.cos(Math.atan2(to.x, to.y) - g.P.heading))
    g.keys.clear(); g.keys.add('w'); if (diff > 0.08) g.keys.add('a'); if (diff < -0.08) g.keys.add('d')
    if (Math.abs(diff) > 1.6) { g.keys.delete('w'); g.keys.add('s') }
    g.sim(1 / 60)
    if (i % 300 === 0) snap(`ram t=${(i / 60).toFixed(0)}`)
  }
  snap('ram end rams=' + g.game.rams)
  // 3) go claim it
  for (let i = 0; i < 60 * 40 && g.game.state === 'claim'; i++) {
    const to = g.DOOR.clone().sub(g.P.pos), a = Math.atan2(to.x, to.y) - g.P.heading, diff = Math.atan2(Math.sin(a), Math.cos(a))
    g.keys.clear(); if (g.P.fwd < 7) g.keys.add('w'); if (diff > 0.08) g.keys.add('a'); if (diff < -0.08) g.keys.add('d')
    g.sim(1 / 60)
  }
  g.keys.clear(); snap('claim end')
  return log.join('\n')
})
console.log(out)
await p.waitForTimeout(2500); await p.screenshot({ path: '/tmp/t-win.png' })
await b.close()
