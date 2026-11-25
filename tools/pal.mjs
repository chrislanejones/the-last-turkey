import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1280, height: 720 } })
const logs = []; p.on('console', m => logs.push(m.type() + ': ' + m.text())); p.on('pageerror', e => logs.push('ERR ' + e.message))
await p.goto('http://localhost:8765/?shot&' + (process.argv[2] || ''), { waitUntil: 'load' })
await p.waitForFunction(() => window.__game, null, { timeout: 180000 }).catch(e => logs.push('timeout ' + e.message))
await p.waitForTimeout(+(process.argv[4] || 4000))
const extra = process.argv[5]; if (extra) { await p.evaluate(extra); await p.waitForTimeout(3000) }
await p.screenshot({ path: process.argv[3] || '/tmp/s.png' })
console.log(logs.filter(l => /PAL|ERR|rror/.test(l)).join("\n"))
await b.close()
