import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1280, height: 720 } })
p.on('pageerror', e => console.log('ERR', e.message))
await p.goto('http://localhost:8765/?shot', { waitUntil: 'load' })
await p.waitForFunction(() => window.__game, null, { timeout: 180000 })
console.log(await p.evaluate(() => {
  const g = window.__game, U = 4.084, { circles, boxes, regions, DATA } = g.dbg, r = 1.05
  const V2 = g.P.pos.constructor
  // Points that are invisibly blocked: no circle or box near them, yet no region holds a car there.
  const inPoly = (x, z, poly) => { let hit = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) hit = !hit } return hit }
  const fits = (c) => regions.some(({ walls }) => walls.every((w) => c.clone().sub(w.a).dot(w.n) >= r - 1e-6))
  const out = {}
  for (let z = 336; z <= 397; z += 0.5) for (let x = -106; x <= -68; x += 0.5) {
    const c = new V2(x * U, z * U)
    // only look inside the lots (the plaza polygon and the station pad), not the roads
    if (!inPoly(x * U, z * U, DATA.plaza) && !inPoly(x * U, z * U, DATA.station)) continue
    if (fits(c)) continue
    const key = `${Math.round(x)},${Math.round(z)}`; out[key] = (out[key] || 0) + 1
  }
  return 'blocked by area edges inside the lots: ' + Object.keys(out).join(' ')
}))
await b.close()
