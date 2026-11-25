import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 640, height: 360 } })
p.on('pageerror', e => console.log('ERR', e.message))
await p.goto('http://localhost:8765/?shot&play', { waitUntil: 'load' })
await p.waitForFunction(() => window.__game, null, { timeout: 180000 })
console.log(await p.evaluate(() => { const g = window.__game, U = 4.084, log = []; g.sim(5.5)
  const run = (t, x, z, h, secs) => { Object.assign(g.game, { state: 'chase', armor: 100, people: 100, cans: 0, grab: 0 }); g.R.pos.set(-60 * U, 300 * U); g.P.pos.set(x * U, z * U); g.P.heading = h; g.P.vel.set(0, 0); g.keys.add('w'); g.sim(secs); g.keys.clear(); log.push(`${t}: x=${(g.P.pos.x / U).toFixed(1)} z=${(g.P.pos.y / U).toFixed(1)}`) }
  run('north lot -> north barrier (stop ~z 337)', -85, 350, Math.PI, 4)
  run('NW lot -> diagonal barrier', -92, 348, Math.atan2(-0.8, -0.6), 4)
  run('A1A S north to parade (stop ~z 341.5)', -100, 363, Math.atan2(-3.68, -13.75), 10)
  run('A1A S gap by corner (should stop at barrier)', -103.5, 348, Math.atan2(0.3, -1), 4)
  run('A1A Beach N to parade (stop ~z 340)', -72, 346, Math.atan2(6.2, -19.7), 6)
  run('station south (stop ~z 394.6)', -86.8, 389, 0, 4)
  run('A1A S south (stop ~z 394.6)', -93.5, 387, Math.atan2(1.2, 4.4), 4)
  run('A1A Beach south (stop ~z 394.6)', -83.4, 388, 0, 4)
  run('lot -> west road -> far edge', -91, 372, -Math.PI / 2, 5)
  run('lot -> east road -> far edge', -84, 365, Math.PI / 2, 4)
  // invisible stops inside: sample the whole wedge; anywhere a still car gets moved with nothing visible nearby
  const { circles, boxes } = g.dbg, V2 = g.P.pos.constructor, odd = []
  for (let z = 338; z <= 394; z += 1) for (let x = -106; x <= -70; x += 0.5) {
    const c = new V2(x * U, z * U)
    if (!g.dbg.regions.some(({ walls }) => walls.every((w) => c.clone().sub(w.a).dot(w.n) >= 3.2))) continue // only well inside the drivable shape
    const near = circles.some(([cx, cz, r]) => Math.hypot(c.x - cx, c.y - cz) < r + 3.2) || boxes.some((bx) => { const rel = c.clone().sub(bx.c), lx = rel.x * bx.a.x + rel.y * bx.a.y, lz = rel.x * -bx.a.y + rel.y * bx.a.x; return Math.abs(lx) < bx.hx + 3.2 && Math.abs(lz) < bx.hz + 3.2 })
    if (near) continue
    g.P.pos.copy(c); g.P.vel.set(0, 0); g.P.heading = 0; g.sim(1 / 60)
    if (g.P.pos.distanceTo(c) > 0.05) odd.push(`${x},${z}`)
  }
  log.push(`unexplained shoves in open ground: ${odd.length} ${odd.slice(0, 40).join(' ')}`)
  return log.join('\n') }))
await b.close()
