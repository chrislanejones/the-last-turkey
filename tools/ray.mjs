import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1280, height: 720 } })
await p.goto('http://localhost:8765/?shot', { waitUntil: 'load' }); await p.waitForFunction(() => window.__game, null, { timeout: 180000 }); await p.waitForTimeout(2000)
await p.evaluate(() => { const g = window.__game, c = window.__cat.position; g.manual = { pos: new g.V3(c.x - 1, 1.6, c.z + 6), look: new g.V3(c.x, 1.2, c.z), fov: 50 }; g.setCam(3) })
await p.waitForTimeout(1500)
console.log(await p.evaluate(() => { const g = window.__game, T = g.THREE, rc = new T.Raycaster(); const out = []
  for (const [px, py] of [[480, 425], [480, 300], [1070, 405]]) { rc.setFromCamera(new T.Vector2(px / 640 - 1, 1 - py / 360), g.camera); const h = rc.intersectObject(g.world, true)[0]; out.push(h ? [h.point.x, h.point.y, h.point.z].map((v) => v.toFixed(2)).join(',') : 'none') }
  return out.join(' | ') + ' cat ' + [window.__cat.position.x, window.__cat.position.z].map((v) => v.toFixed(2)).join(',') }))
await b.close()
