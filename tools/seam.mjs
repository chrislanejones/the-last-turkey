import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1280, height: 720 } })
p.on('pageerror', e => console.log('ERR', e.message))
await p.goto('http://localhost:8765/?shot&play', { waitUntil: 'load' })
await p.waitForFunction(() => window.__game, null, { timeout: 180000 })
console.log(await p.evaluate(() => { const g = window.__game, U = 4.084, bad = []; g.sim(5.5); g.R.pos.set(-100 * U, 350 * U)
  // Sweep the lot, the grass and the road: anywhere the car gets shoved while standing still is a hidden wall or an object.
  const road = [[-83.3, 395.5], [-83.5, 387], [-82.3, 379.75], [-76.1, 359], [-69.9, 339.3]]
  const cx = (z) => { for (let i = 0; i + 1 < road.length; i++) { const [a, b] = [road[i], road[i + 1]]; if (z <= a[1] && z >= b[1]) return a[0] + (b[0] - a[0]) * (a[1] - z) / (a[1] - b[1]) } }
  let n = 0
  for (let z = 341; z <= 394; z += 1) for (let dx = -3.4; dx <= 0.2; dx += 0.2) for (const h of [Math.PI / 2, 0]) {
    const x = cx(z) + dx; g.P.pos.set(x * U, z * U); g.P.heading = h; g.P.vel.set(0, 0); g.sim(1 / 60); n++
    const d = Math.hypot(g.P.pos.x / U - x, g.P.pos.y / U - z); if (d > 0.02) bad.push(`${x.toFixed(1)},${z}`)
  }
  return `${n} spots, ${bad.length} shoved: ` + [...new Set(bad)].join(' ') }))
await b.close()
