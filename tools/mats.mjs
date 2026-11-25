import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 640, height: 360 } })
await p.goto('http://localhost:8765/?shot', { waitUntil: 'load' }); await p.waitForFunction(() => window.__game, null, { timeout: 180000 })
console.log(await p.evaluate(() => { const out = []; window.__game.world.traverse((o) => { if (o.isMesh && o.name === 'ground') { const m = [].concat(o.material)[0]; o.geometry.computeBoundingBox(); out.push(m.name + ' #' + m.color.getHexString() + ' verts ' + o.geometry.attributes.position.count + ' uv ' + !!o.geometry.attributes.uv + ' vc ' + !!o.geometry.attributes.color) } }); return out.join('\n') }))
await b.close()
