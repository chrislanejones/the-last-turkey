import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] })
const p = await b.newPage(); p.on('pageerror', (e) => console.log('STACK', e.stack.split('\n').slice(0, 4).join(' | ')))
await p.goto('http://localhost:8765/'); await p.waitForTimeout(6000); await b.close()
