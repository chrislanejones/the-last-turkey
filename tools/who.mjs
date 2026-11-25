import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 640, height: 360 } })
await p.goto('http://localhost:8765/?shot', { waitUntil: 'load' })
await p.waitForFunction(() => window.__game, null, { timeout: 180000 })
console.log(await p.evaluate((pts) => { const g = window.__game, U = 4.084, { circles, boxes } = g.dbg, V2 = g.P.pos.constructor
  return pts.map(([x, z]) => { const c = new V2(x * U, z * U), hits = []
    circles.forEach(([cx, cz, r], i) => { if (Math.hypot(c.x - cx, c.y - cz) < r + 1.05) hits.push(`circle ${i} at (${(cx / U).toFixed(1)},${(cz / U).toFixed(1)}) r=${r}`) })
    boxes.forEach((bx, i) => { const rel = c.clone().sub(bx.c), lx = rel.x * bx.a.x + rel.y * bx.a.y, lz = rel.x * -bx.a.y + rel.y * bx.a.x; if (Math.abs(lx) < bx.hx + 1.05 && Math.abs(lz) < bx.hz + 1.05) hits.push(`box ${i} at (${(bx.c.x / U).toFixed(1)},${(bx.c.y / U).toFixed(1)})`) })
    return `${x},${z}: ${hits.join('; ') || 'NOTHING'}` }).join('\n') }, [[-96, 390.2], [-95.2, 390.2], [-94.6, 391.5]]))
await b.close()
