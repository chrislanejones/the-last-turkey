import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1280, height: 720 } })
p.on('pageerror', e => console.log('ERR', e.message))
await p.goto('http://localhost:8765/?shot&play', { waitUntil: 'load' })
await p.waitForFunction(() => window.__game, null, { timeout: 180000 })
console.log(await p.evaluate(() => { const g = window.__game, U = 4.084, log = []; g.sim(5.5); g.game.cans = 0
  // Deepest the two boxes ever overlap, measured after each step, in three kinds of crash.
  const depth = () => { const ax = (v) => { const f = v.f; return [f, new f.constructor(f.y, -f.x)] }, [fA, lA] = ax(g.P), [fB, lB] = ax(g.R), d = g.R.pos.clone().sub(g.P.pos); let m = Infinity
    for (const a of [fA, lA, fB, lB]) { const o = g.P.hl * Math.abs(fA.dot(a)) + g.P.hw * Math.abs(lA.dot(a)) + g.R.hl * Math.abs(fB.dot(a)) + g.R.hw * Math.abs(lB.dot(a)) - Math.abs(d.dot(a)); m = Math.min(m, o) } return Math.max(0, m) }
  const crash = (name, px, pz, ph, rx, rz, rh) => { g.game.state = 'chase'; g.game.health = 100; g.game.armor = 100; g.game.people = 100; g.game.ai = 'seek'; g.game.pathI = 99; g.game.attackCool = 99
    g.P.pos.set(px * U, pz * U); g.P.heading = ph; g.P.vel.set(0, 0); g.R.pos.set(rx * U, rz * U); g.R.heading = rh; g.R.vel.set(0, 0); g.game.grab = 0
    const real = g.R.accel; g.R.accel = 0; g.R.vmax = 0.01; let worst = 0, h0 = g.R.heading; g.keys.add('w')
    for (let i = 0; i < 240; i++) { g.sim(1 / 60); worst = Math.max(worst, depth()) } g.keys.clear(); g.R.accel = real; g.R.vmax = 13.5
    log.push(`${name}: deepest overlap ${worst.toFixed(3)} m, his wagon spun ${((g.R.heading - h0) * 57.3).toFixed(0)} deg, hp ${g.game.health.toFixed(0)}`) }
  crash('rear-end', -80, 372, Math.PI, -80, 367, Math.PI)
  crash('T-bone into his door', -84, 362, Math.PI / 2, -79.5, 362, Math.PI)
  crash('corner clip', -80.4, 372, Math.PI, -80, 367, Math.PI / 2)
  return log.join('\n') }))
await b.close()
