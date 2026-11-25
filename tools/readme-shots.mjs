import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1280, height: 720 } })
p.on('pageerror', e => console.log('ERR', e.message))
await p.goto('http://localhost:8765/?shot&play', { waitUntil: 'load' })
await p.waitForFunction(() => window.__game, null, { timeout: 180000 })
await p.waitForTimeout(3000)
const shot = async (name, js, ms = 2500) => { await p.evaluate(js); await p.waitForTimeout(ms); await p.screenshot({ path: `/tmp/rs-${name}.png` }) }
await p.evaluate(() => { document.getElementById('help').style.display = 'none' })
await shot('1', () => { const g = window.__game; g.sim(1.3) })
await shot('2', () => { const g = window.__game, U = 4.084; g.sim(5); g.game.state = 'chase'; g.P.pos.set(-90.6 * U, 391.8 * U); g.P.heading = Math.PI / 2 + 0.25; g.P.vel.set(0, 0); g.R.pos.set(-88.8 * U, 386.5 * U); g.R.heading = Math.PI / 2 + 0.3; g.R.vel.set(0, 0); g.setCam(0); g.sim(0.05); document.getElementById('flash').style.display='none'; document.getElementById('objective').style.visibility='hidden'; g.manual = { pos: new g.V3(-93.4 * U, 3.0, 395.6 * U), look: new g.V3(-89.4 * U, 1.2, 388.5 * U), fov: 58 }; g.setCam(3) })
await shot('3', () => { const g = window.__game, U = 4.084; document.getElementById('hud').style.visibility = 'hidden'; document.getElementById('touch').style.visibility = 'hidden'; g.manual = { pos: new g.V3(-86 * U, 2.6, 356 * U), look: new g.V3(-84 * U, 4.2, 340 * U), fov: 55 }; g.setCam(3) })
await shot('4', () => { const g = window.__game, U = 4.084; for (const id of ['bubble','bubble2','bubble3']) document.getElementById(id).style.display='none'; g.manual = { pos: new g.V3(-104.6 * U, 3, 350 * U), look: new g.V3(-105.6 * U, 3.6, 341 * U), fov: 55 }; g.setCam(3) })
await b.close()
