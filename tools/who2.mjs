import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 640, height: 360 } })
await p.goto('http://localhost:8765/?shot', { waitUntil: 'load' })
await p.waitForFunction(() => window.__game, null, { timeout: 180000 })
console.log(await p.evaluate((pts) => { const g = window.__game, U = 4.084, { circles, boxes, regions } = g.dbg, V2 = g.P.pos.constructor
  const fits = (c) => regions.some(({ walls }) => walls.every((w) => c.clone().sub(w.a).dot(w.n) >= 1.05 - 1e-6))
  return pts.map(([x, z]) => [Math.PI / 2, 0].map((h) => { const f = new V2(Math.sin(h), Math.cos(h)), out = []
    for (const e of [1, 0, -1]) { const c = new V2(x * U, z * U).addScaledVector(f, e * 1.55)
      if (!fits(c)) out.push(`end ${e}: outside every area`)
      circles.forEach(([cx, cz, r], i) => { if (Math.hypot(c.x - cx, c.y - cz) < r + 1.05) out.push(`end ${e}: circle ${i} (${(cx / U).toFixed(1)},${(cz / U).toFixed(1)}) r=${r}`) }) }
    return `${x},${z} h=${h.toFixed(2)}: ${out.join('; ') || 'clear'}` }).join('\n')).join('\n') }, [[-79.5, 359], [-84.3, 380], [-80.2, 368], [-75.4, 349], [-72.9, 345]]))
await b.close()
