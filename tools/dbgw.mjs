import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 640, height: 360 } })
await p.goto('http://localhost:8765/?shot', { waitUntil: 'load' })
await p.waitForFunction(() => window.__game, null, { timeout: 180000 })
console.log(await p.evaluate(() => { const g = window.__game, U = 4.084, { regions } = g.dbg, V2 = g.P.pos.constructor
  const c = new V2(-79 * U, 345 * U)
  return regions[0].walls.map((w, i) => `${i}: a=(${(w.a.x / U).toFixed(1)},${(w.a.y / U).toFixed(1)}) n=(${w.n.x.toFixed(2)},${w.n.y.toFixed(2)}) d=${(c.clone().sub(w.a).dot(w.n) / U).toFixed(2)}`).join('\n') }))
await b.close()
