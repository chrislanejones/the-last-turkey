// Extra dressing for the Square K, drawn in code so it costs no download: canopy lights,
// numbered pumps with hoses, island guards, bins, apron joints and stains, signs.
// Placement follows chrislanejones/3d-world's a1a-south-shops.ts (town units x U = meters).
import * as THREE from 'three'

function label(text, { w = 256, h = 128, bg = '#ffffff', fg = '#c8302b', font = 'bold 64px Oswald, Impact, sans-serif', draw } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, w, h)
  if (draw) draw(x, w, h)
  else { x.fillStyle = fg; x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, h / 2 + 4) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t
}

export const PED_BED = [-86.8, 364.6]
export function dressStation(scene, U, apronY) {
  const g = new THREE.Group(); g.name = 'station-dressing'; scene.add(g)
  const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...o })
  const white = M('#f2f0ea'), red = M('#d0282e'), yellow = M('#f1c62f'), dark = M('#24282b'), gray = M('#8d9396'), blue = M('#2f6fc4'), steel = M('#c9cdd0', { metalness: 0.6, roughness: 0.35 })
  const box = (mat, x, y, z, w, h, d, shadow = true) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; g.add(m); return m }
  const cyl = (mat, x, y, z, r, h, seg = 10) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m }
  const plane = (tex, x, y, z, w, h, ry = 0, o = {}) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, ...o })); m.position.set(x, y, z); m.rotation.y = ry; g.add(m); return m }

  const cx = -88.6 * U, cz = 390.1 * U, cw = 3.0 * U, cd = 1.8 * U, top = 1.05 * U // canopy
  const isleTop = 0.11 * U, y0 = apronY

  // Canopy: recessed light panels underneath, the clearance sign on the band (the map's own made-up fuel emblem stays).
  const lamp = new THREE.MeshStandardMaterial({ color: '#fffbe8', emissive: '#fff2c8', emissiveIntensity: 0.9 })
  for (const ex of [-1, 0, 1]) for (const ez of [-1, 1]) {
    box(M('#d9d7d0'), cx + ex * cw * 0.3, top + 0.008 * U, cz + ez * cd * 0.25, 1.25, 0.05, 1.25, false)
    box(lamp, cx + ex * cw * 0.3, top + 0.002 * U, cz + ez * cd * 0.25, 0.95, 0.05, 0.95, false)
  }
  const clearance = label("CLEARANCE 14' 0\"", { w: 512, h: 64, font: 'bold 40px Oswald, Impact, sans-serif' })
  for (const s of [-1, 1]) {
    const zf = cz + s * (cd / 2 + 0.06 * U), ry = s > 0 ? 0 : Math.PI
    plane(clearance, cx + cw * 0.22, top + 0.045 * U, zf - s * 0.13, 2.6, 0.3, ry)
  }

  // Pumps: a number flag, a lit screen, nozzles and hoses on both faces, a price card.
  const screen = new THREE.MeshStandardMaterial({ color: '#16222a', emissive: '#3aa0c8', emissiveIntensity: 0.5 })
  const hoseM = M('#151515')
  let n = 0
  for (const v of [-0.45, 0.45]) for (const u of [-0.6, 0.6]) {
    const px = cx + u * U, pz = cz + v * U
    n++
    const flag = label(String(n), { w: 96, h: 96, bg: '#f1c62f', fg: '#d0282e', font: 'bold 76px Oswald, Impact, sans-serif' })
    cyl(steel, px, 0.54 * U + 0.22, pz, 0.03, 0.45, 6)
    for (const s of [-1, 1]) plane(flag, px, 0.54 * U + 0.6, pz + s * 0.03, 0.42, 0.42, s > 0 ? 0 : Math.PI)
    box(yellow, px, 0.54 * U + 0.6, pz, 0.44, 0.44, 0.04, false)
    for (const s of [-1, 1]) {
      const fz = pz + s * (0.07 * U + 0.012)
      box(screen, px - 0.12, 1.55, fz, 0.34, 0.24, 0.02, false)
      box(dark, px + 0.2, 1.2, fz, 0.2, 0.6, 0.03, false)
      for (const [k, c] of [['#2a2a2a', -0.06], ['#d0282e', 0.0], ['#2f8f3a', 0.06]].entries()) box(M(c[0]), px + 0.2 + c[1], 1.25, fz + s * 0.03, 0.045, 0.22, 0.06, false), void k
      box(yellow, px - 0.12, 1.15, fz, 0.34, 0.3, 0.015, false)
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(px + 0.34, 2.0, fz), new THREE.Vector3(px + 0.5, 1.2, fz + s * 0.22), new THREE.Vector3(px + 0.4, 0.75, fz + s * 0.2), new THREE.Vector3(px + 0.22, 1.2, fz + s * 0.04)])
      const hose = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.022, 5), hoseM); g.add(hose)
    }
  }
  // Each island: a bin and squeegee stand in the middle, a white hoop guard on blue feet at both ends.
  for (const v of [-0.45, 0.45]) {
    const iz = cz + v * U
    box(gray, cx, isleTop + 0.45, iz, 0.5, 0.9, 0.5); box(dark, cx, isleTop + 0.92, iz, 0.54, 0.06, 0.54)
    box(blue, cx + 0.42, isleTop + 0.2, iz, 0.26, 0.4, 0.26)
    for (const e of [-1, 1]) {
      const gx = cx + e * (1.25 * U + 0.45)
      for (const s of [-1, 1]) { cyl(white, gx, y0 + 0.5, iz + s * 0.38, 0.055, 1.0); cyl(blue, gx, y0 + 0.14, iz + s * 0.38, 0.075, 0.28) }
      const bar = cyl(white, gx, y0 + 1.0, iz, 0.055, 0.86); bar.rotation.x = Math.PI / 2
    }
  }
  // Apron: saw joints in the slab and a few oil stains in the lanes.
  const joint = new THREE.MeshBasicMaterial({ color: '#8f8d85' })
  const ax0 = -91.6 * U, ax1 = -85.4 * U, az0 = 386.9 * U, az1 = 393.1 * U
  for (let i = 1; i < 4; i++) {
    box(joint, ax0 + (ax1 - ax0) * i / 4, y0 + 0.004, (az0 + az1) / 2, 0.05, 0.006, az1 - az0, false)
    box(joint, (ax0 + ax1) / 2, y0 + 0.004, az0 + (az1 - az0) * i / 4, ax1 - ax0, 0.006, 0.05, false)
  }
  const stain = new THREE.MeshBasicMaterial({ color: '#3a3a36', transparent: true, opacity: 0.28, depthWrite: false })
  for (const [sx, sz, r] of [[-89.1, 391.2, 0.9], [-88.0, 391.3, 0.6], [-88.5, 389.0, 0.8], [-89.3, 390.1, 0.5], [-87.9, 390.1, 0.7]]) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 16), stain); m.rotation.x = -Math.PI / 2; m.scale.x = 1.5; m.position.set(sx * U, y0 + 0.012, sz * U); g.add(m)
  }

  // Store front (faces south): labelled ice chests, a propane cage, window posters, a bin.
  const fz = (385.41 + 1.99 / 2) * U, sx = -88.76 * U
  const ice = label('ICE', { w: 192, h: 128, bg: '#eef2f4', fg: '#1d5fb8', font: 'bold 96px Oswald, Impact, sans-serif' })
  for (const lx of [-1.25, -0.95]) plane(ice, sx + lx * U, 0.16 * U, fz + 0.275 * U, 0.9, 0.6)
  const cage = M('#aab0b3', { metalness: 0.5 }); box(cage, sx + 1.25 * U, 0.75, fz + 0.75, 1.4, 1.3, 0.6)
  plane(label('PROPANE', { w: 256, h: 96, bg: '#1d5fb8', fg: '#ffffff', font: 'bold 52px Oswald, Impact, sans-serif' }), sx + 1.25 * U, 1.05, fz + 1.06, 1.2, 0.45)
  const posters = [['2 FOR $3', '#f1c62f', '#d0282e'], ['COLD DRINKS', '#2f6fc4', '#ffffff'], ['HOT COFFEE', '#7a4a38', '#ffffff']]
  posters.forEach(([t, bg, fg], i) => plane(label(t, { w: 256, h: 160, bg, fg, font: 'bold 44px Oswald, Impact, sans-serif' }), sx + (-0.55 + i * 0.55) * U, 1.55, fz - 0.06, 1.1, 0.7))
  box(gray, sx + 0.15 * U, 0.55, fz + 0.9, 0.5, 0.9, 0.5); box(dark, sx + 0.15 * U, 1.02, fz + 0.9, 0.54, 0.06, 0.54)

  // The price pylon by the road: both faces.
  const pylon = label('', { w: 256, h: 448, draw: (x) => {
    x.fillStyle = '#1e2124'; x.fillRect(0, 0, 256, 448)
    x.fillStyle = '#d0282e'; x.fillRect(12, 12, 232, 130)
    x.fillStyle = '#ffffff'; x.fillRect(28, 26, 100, 100); x.fillStyle = '#d0282e'; x.font = 'bold 96px Oswald, Impact, sans-serif'; x.textAlign = 'center'; x.fillText('K', 78, 112)
    x.fillStyle = '#ffffff'; x.font = 'bold 34px Oswald, Impact, sans-serif'; x.fillText('SQUARE', 184, 70); x.fillText('K', 184, 110)
    x.fillStyle = '#f1c62f'; x.fillRect(12, 152, 232, 70); x.fillStyle = '#d0282e'; x.font = 'bold 44px Oswald, Impact, sans-serif'; x.fillText('FUEL', 128, 204)
    const rows = [['REGULAR', '3.09'], ['PLUS', '3.49'], ['DIESEL', '3.59']]
    rows.forEach(([name, price], i) => { const y = 236 + i * 70
      x.fillStyle = '#0b0d0e'; x.fillRect(12, y, 232, 60); x.fillStyle = '#e8e8e8'; x.font = 'bold 22px Oswald, sans-serif'; x.textAlign = 'left'; x.fillText(name, 22, y + 38)
      x.fillStyle = '#47f06a'; x.font = 'bold 44px monospace'; x.textAlign = 'right'; x.fillText(price, 238, y + 46); x.textAlign = 'center' })
  } })
  for (const s of [-1, 1]) plane(pylon, (-86.4 + s * 0.085) * U, 1.05 * U, 394.4 * U, 0.58 * U, 1.08 * U, s * Math.PI / 2, { emissive: '#ffffff', emissiveMap: pylon, emissiveIntensity: 0.25 })
  
  // Bumpkin' Donuts shares the Square K building: a dark parapet block over its west end.
  {
    const d = new THREE.Group(); d.position.set(-88.76 * U, 0, 385.41 * U); d.rotation.y = 0.035; g.add(d)
    const H = 0.95 * U, D = 1.99 * U, w = 1.25 * U, lx = -1.68 * U + w / 2
    const blk = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 1.5, D + 0.9), M('#2b2d31')); blk.position.set(lx - 0.25, H + 0.55, 0.05); blk.castShadow = true; d.add(blk)
    const sign = label('', { w: 512, h: 160, draw: (x) => {
      x.fillStyle = '#2b2d31'; x.fillRect(0, 0, 512, 160); x.textAlign = 'center'
      x.font = 'bold 76px Oswald, Impact, sans-serif'; x.fillStyle = '#ff7a1a'; x.fillText("BUMPKIN'", 256, 76)
      x.font = 'bold 44px Oswald, Impact, sans-serif'; x.fillStyle = '#ff4f9a'; x.fillText('DONUTS · DRIVE THRU', 256, 132)
    } })
    const mk = (x, z, ry, pw) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(pw, pw * 0.3125), new THREE.MeshStandardMaterial({ map: sign, roughness: 0.6, emissive: '#ffffff', emissiveMap: sign, emissiveIntensity: 0.2 })); m.position.set(x, H + 0.6, z); m.rotation.y = ry; d.add(m) }
    mk(lx - 0.25, D / 2 + 0.52, 0, 4.4); mk(lx - 0.25 - (w + 0.5) / 2 - 0.02, 0.05, -Math.PI / 2, 4.2); mk(lx - 0.25, -D / 2 - 0.42, Math.PI, 4.4)
    // The drive-thru window and menu board round the west side.
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.1, 1.5), M('#3d4e53', { roughness: 0.2 })); win.position.set(-1.68 * U - 0.06, 1.6, -1.2); d.add(win)
    // (the menu board is gone; three trash cans stand here instead, see main.js)
  }

  // Bank of the Gulf of America, between the gas station and the plaza: a white stucco box with a
  // flat roof and a drive-thru ATM canopy on its north side.
  {
    const bx = -88.5 * U, bz = 380.0 * U, W = 2.6 * U, D = 4.6 * U, H = 3.7
    const stucco = M('#f1eee6'), trim = M('#dcd6c6'), glass = M('#31424a', { roughness: 0.15, metalness: 0.5 }), navy = '#14306b'
    const lot = 0.045 * U
    box(stucco, bx, lot + H / 2, bz, W, H, D)
    box(trim, bx, lot + H + 0.2, bz, W + 0.3, 0.4, D + 0.3)
    box(M('#bfc2c0'), bx, lot + H + 0.42, bz, W - 0.3, 0.05, D - 0.3, false)
    box(M('#c9c2b0'), bx, lot + 0.3, bz, W + 0.08, 0.6, D + 0.08, false)
    for (const [ax, az] of [[-2, -4], [1.5, 3]]) box(gray, bx + ax, lot + H + 0.85, bz + az, 1.6, 0.8, 1.6)
    const sign = (pw) => label('', { w: 1024, h: 128, draw: (x) => {
      x.fillStyle = '#f1eee6'; x.fillRect(0, 0, 1024, 128)
      // a made-up mark: three wave stripes
      for (const [i, c] of [['#c8302b', 0], ['#14306b', 1], ['#c8302b', 2]].entries()) { x.strokeStyle = c[0]; x.lineWidth = 12; x.beginPath(); for (let k = 0; k <= 20; k++) { const px = 24 + k * 5, py = 40 + i * 24 + Math.sin(k * 0.6) * 8; k ? x.lineTo(px, py) : x.moveTo(px, py) } x.stroke() }
      x.fillStyle = navy; x.textAlign = 'left'
      let px = 62; do { x.font = `bold ${px}px Oswald, Impact, sans-serif`; px -= 2 } while (x.measureText('BANK OF THE GULF OF AMERICA').width > 850)
      x.fillText('BANK OF THE GULF OF AMERICA', 150, 86)
      void pw
    } })
    const east = bx + W / 2, south = bz + D / 2
    plane(sign(), east + 0.03, lot + 3.0, bz, 9.6, 1.2, Math.PI / 2)
    plane(sign(), bx, lot + 3.0, south + 0.03, 9.6, 1.2, 0)
    // East front: glass entry, windows, a red ATM surround, hedges and bollards.
    box(glass, east + 0.02, lot + 1.25, bz + 2.2, 0.06, 2.3, 2.6, false)
    box(trim, east + 0.25, lot + 2.55, bz + 2.2, 0.6, 0.18, 3.2)
    for (const dz of [-6.5, -3.4]) box(glass, east + 0.02, lot + 1.4, bz + dz, 0.06, 1.3, 2.2, false)
    box(M('#c8302b'), east + 0.12, lot + 1.15, bz + 5.6, 0.3, 2.3, 1.5)
    plane(label('Mo-Fee-ATM', { w: 384, h: 96, bg: '#c8302b', fg: '#ffffff', font: 'bold 54px Oswald, Impact, sans-serif' }), east + 0.28, lot + 2.05, bz + 5.6, 1.45, 0.36, Math.PI / 2)
    box(dark, east + 0.28, lot + 1.2, bz + 5.6, 0.02, 0.5, 0.6, false)
    const hedge = M('#3f6b3a', { roughness: 1 })
    for (const [dz, len] of [[-5, 6.2], [7.9, 2.2]]) box(hedge, east + 0.7, lot + 0.4, bz + dz, 0.9, 0.8, len)
    box(hedge, bx, lot + 0.4, south + 0.7, W - 1.5, 0.8, 0.9)
    for (const dz of [0.6, 1.5, 2.9, 3.8]) cyl(yellow, east + 1.5, lot + 0.45, bz + dz, 0.09, 0.9)
    // Drive-thru canopy to the north.
    const cz2 = bz - D / 2 - 3.25
    box(stucco, bx, lot + 3.3, cz2, W, 0.45, 6.5)
    box(trim, bx, lot + 3.56, cz2, W + 0.2, 0.1, 6.7, false)
    for (const ex of [-1, 1]) for (const ez of [-1, 1]) box(stucco, bx + ex * 4.7, lot + 1.55, cz2 + ez * 2.6, 0.5, 3.1, 0.5)
    plane(label('DRIVE-THRU Mo-Fee-ATM', { w: 512, h: 80, bg: '#f1eee6', fg: navy, font: 'bold 40px Oswald, Impact, sans-serif' }), east + 0.03, lot + 3.3, cz2, 4.6, 0.42, Math.PI / 2)
    box(M('#c8302b'), bx, lot + 1.0, cz2, 0.7, 1.9, 0.7); box(M('#d9d5c8'), bx, lot + 0.1, cz2, 1.4, 0.2, 5.6, false)
  }
  
  // Megabucks Coffee: the end unit of the west strip, next to publick. The strip's frame is
  // anastasia-plaza.ts's: local +x runs north along it, local +z is the shop fronts (east).
  {
    const t = Math.atan2(0.968, -0.249), c = Math.cos(t), sn = Math.sin(t), cx0 = -93.25, cz0 = 364.09
    const at = (lx, lz) => [(cx0 + lx * c + lz * sn) * U, (cz0 - lx * sn + lz * c) * U]
    const green = '#1f6b45'
    const cup = (x, px, py, k) => { x.fillStyle = green; x.beginPath(); x.moveTo(px - 16 * k, py - 16 * k); x.lineTo(px + 16 * k, py - 16 * k); x.lineTo(px + 11 * k, py + 20 * k); x.lineTo(px - 11 * k, py + 20 * k); x.fill(); x.fillRect(px - 19 * k, py - 23 * k, 38 * k, 7 * k) }
    const band = label('', { w: 1024, h: 128, draw: (x) => {
      x.fillStyle = '#dcbf86'; x.fillRect(0, 0, 1024, 128); cup(x, 70, 64, 1.7)
      x.fillStyle = green; x.font = 'bold 84px Oswald, Impact, sans-serif'; x.textAlign = 'left'; x.fillText('MEGABUCKS COFFEE', 130, 94)
    } })
    const end = label('', { w: 512, h: 160, draw: (x) => {
      x.fillStyle = '#dcbf86'; x.fillRect(0, 0, 512, 160); x.fillStyle = green; x.textAlign = 'center'
      x.font = 'bold 84px Oswald, Impact, sans-serif'; x.fillText('MEGABUCKS', 256, 84); x.font = 'bold 44px Oswald, Impact, sans-serif'; x.fillText('COFFEE', 256, 136)
    } })
    // Over the end unit's old name on the sign band, and big on the north end wall facing publick.
    const [fx, fz] = at(6.25, 1.65 + 0.085); plane(band, fx, 1.25 * U, fz, 2.3 * U, 0.2875 * U, t)
    const [ex, ez] = at(14.9 / 2 + 0.02, 0.1); plane(end, ex, 1.38 * U, ez, 2.4 * U, 0.75 * U, t + Math.PI / 2)
    // And on the back, toward A1A S, where the drive comes in between the strip and publick.
    const [wx, wz] = at(6.0, -1.65 - 0.03); plane(band, wx, 1.6 * U, wz, 2.6 * U, 0.325 * U, t + Math.PI)
    // A couple of cafe tables under green umbrellas on the walk by the end.
    for (const lx of [4.7, 5.5]) {
      const [tx, tz] = at(lx, 1.65 - 0.38)
      cyl(dark, tx, 0.07 * U + 0.37, tz, 0.04, 0.74, 6); cyl(M('#c9c2b0'), tx, 0.07 * U + 0.75, tz, 0.4, 0.04, 12)
      const um = new THREE.Mesh(new THREE.ConeGeometry(1.0, 0.4, 8), M(green)); um.position.set(tx, 0.07 * U + 2.3, tz); um.castShadow = true; g.add(um)
      cyl(dark, tx, 0.07 * U + 1.45, tz, 0.025, 1.5, 6)
    }
  }
  
  // publick's main entry and the north strip, from Chris's Street Views: a cash-machine sign,
  // a bike rack, a sandwich board, window posters and door numbers, a crossing sign in a planted bed.
  {
    const lot = 0.045 * U, gx = -93.41, gz = 345.63, t = Math.atan2(0.8, 0.6)
    const gAt = (lx, lz) => [(gx + lx * 0.6 + lz * 0.8) * U, (gz - lx * 0.8 + lz * 0.6) * U]
    const pronto = label('', { w: 256, h: 112, draw: (x) => { x.fillStyle = '#ecdcb6'; x.fillRect(0, 0, 256, 112); x.fillStyle = '#c8302b'; x.beginPath(); x.roundRect(8, 8, 240, 96, 22); x.fill(); x.fillStyle = '#fff'; x.font = 'italic bold 64px Georgia, serif'; x.textAlign = 'center'; x.fillText('Pronto!', 128, 78) } })
    { const [x, z] = gAt(3.4, 4.8 + 0.19); plane(pronto, x, lot + 2.9, z, 1.5, 0.66, t) }
    // Bike rack with three bikes, out of the way on the other side of the entry.
    const bikeM = [M('#2f6fc4'), M('#c8302b'), M('#2b2d31')], tyre = M('#1b1b1b')
    for (let i = 0; i < 3; i++) {
      const [x, z] = gAt(0.95 + i * 0.13, 4.8 + 0.42), b = new THREE.Group(); b.position.set(x, lot + 0.06, z); b.rotation.y = t + 0.25; b.rotation.z = 0.12; g.add(b)
      for (const e of [-0.5, 0.5]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.03, 6, 16), tyre); w.rotation.y = Math.PI / 2; w.position.set(0, 0.36, e); b.add(w) }
      for (const [y, zz, len, rx] of [[0.62, 0, 0.95, Math.PI / 2], [0.5, -0.22, 0.6, 0.9], [0.5, 0.25, 0.62, -0.75], [0.85, 0.42, 0.5, 0]]) { const tb = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, len, 5), bikeM[i]); tb.position.set(0, y, zz); tb.rotation.x = rx; b.add(tb) }
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.25), tyre); seat.position.set(0, 0.92, -0.38); b.add(seat)
    }
    { const [x, z] = gAt(1.1, 4.8 + 0.28); const r = cyl(steel, x, lot + 0.45, z, 0.03, 1.7, 6); r.rotation.x = Math.PI / 2; r.rotation.z = -t }
    // A sandwich board by the door.
    { const [x, z] = gAt(5.75, 4.8 + 0.5); const board = label('', { w: 160, h: 256, draw: (c) => { c.fillStyle = '#fffdf5'; c.fillRect(0, 0, 160, 256); c.fillStyle = '#2f7d32'; c.fillRect(0, 0, 160, 54); c.fillStyle = '#fff'; c.font = 'bold 30px Oswald, sans-serif'; c.textAlign = 'center'; c.fillText('publick', 80, 38); c.fillStyle = '#c8302b'; c.font = 'bold 34px Oswald, sans-serif'; c.fillText('TURKEYS:', 80, 110); c.font = 'bold 76px Oswald, sans-serif'; c.fillText('1', 80, 196); c.font = 'bold 26px Oswald, sans-serif'; c.fillText('LEFT', 80, 236) } })
      for (const sgn of [-1, 1]) { const m = plane(board, x, lot + 0.6, z, 0.7, 1.1, t + (sgn > 0 ? 0 : Math.PI), { side: THREE.DoubleSide }); m.rotation.x = -sgn * 0.18; m.position.x += Math.sin(t) * 0.12 * sgn; m.position.z += Math.cos(t) * 0.12 * sgn } }
    // North strip: posters in the windows and a number over each door.
    const cols = [['SHADES 2 FOR 1', '#111', '#fff'], ['PRO DAYS', '#c8302b', '#fff'], ['COLD BEER', '#2f7d32', '#fff'], ['PETS WELCOME', '#2c7f86', '#fff'], ['DIAMONDS', '#14306b', '#f1c62f'], ['MANI · PEDI', '#c8302b', '#fff'], ['FREE TEST', '#3a6aa8', '#fff'], ['VACATION RENTALS', '#f1c62f', '#111'], ['TACOS', '#c8302b', '#f1c62f']]
    cols.forEach(([txt, bg, fg], k) => {
      const lx = -11.1 / 2 + 0.62 + k * 1.23, x = (-81.65 + lx) * U, z = (339.8 + 1.7 - 0.85) * U + 0.06
      plane(label(txt, { w: 256, h: 128, bg, fg, font: 'bold 34px Oswald, Impact, sans-serif' }), x + 0.9, 0.42 * U, z, 1.3, 0.65)
      plane(label(String(1011 + k * 2), { w: 128, h: 48, bg: '#2f3a3c', fg: '#fff', font: 'bold 34px Oswald, sans-serif' }), x - 0.3 * U, 0.7 * U, z + 0.03, 0.6, 0.22)
    })
    // The planted bed with the pedestrian-crossing sign, out in the lot at the end of a parking row.
    { const bx = PED_BED[0] * U, bz = PED_BED[1] * U
      const bed = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.35, 0.22, 16), M('#d9d5c8')); bed.position.set(bx, lot + 0.11, bz); g.add(bed)
      const mulch = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.24, 16), M('#6b4f3a')); mulch.position.set(bx, lot + 0.12, bz); g.add(mulch)
      for (const [dx, dz, r] of [[0.4, 0.2, 0.5], [-0.4, 0.3, 0.45], [0, -0.45, 0.5]]) { const sh = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), M('#3f6b3a', { roughness: 1 })); sh.scale.y = 0.7; sh.position.set(bx + dx, lot + 0.45, bz + dz); sh.castShadow = true; g.add(sh) }
      const post = new THREE.Group(); post.position.set(bx, lot, bz); g.add(post); g.userData.pedSign = post
      { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.4, 6), steel); m.position.y = 1.3; m.castShadow = true; post.add(m) }
      const ped = label('', { w: 128, h: 128, bg: 'rgba(0,0,0,0)', draw: (c) => { c.clearRect(0, 0, 128, 128); c.fillStyle = '#f1c62f'; c.beginPath(); c.moveTo(64, 4); c.lineTo(124, 64); c.lineTo(64, 124); c.lineTo(4, 64); c.fill(); c.strokeStyle = '#111'; c.lineWidth = 4; c.stroke(); c.fillStyle = '#111'; c.beginPath(); c.arc(66, 36, 8, 0, 7); c.fill(); c.lineWidth = 8; c.lineCap = 'round'; c.beginPath(); c.moveTo(64, 48); c.lineTo(60, 76); c.lineTo(46, 100); c.moveTo(60, 76); c.lineTo(78, 98); c.moveTo(62, 54); c.lineTo(44, 68); c.moveTo(63, 54); c.lineTo(82, 66); c.stroke() } })
      for (const ry of [t, t + Math.PI]) { const m = plane(ped, bx, lot + 2.2, bz, 0.85, 0.85, ry, { transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }); g.remove(m); m.position.set(0, 2.2, 0); post.add(m) }
    }
  }
  
  // The bank's monument sign, east of it on the grass by A1A Beach Blvd (just outside the barrier).
  {
    const sx = -83.72 * U, sz = 379.6 * U // on the grass strip between the lot's barrier and the road
    const face = label('', { w: 512, h: 384, draw: (x) => {
      x.fillStyle = '#ffffff'; x.fillRect(0, 0, 512, 384); x.strokeStyle = '#c8302b'; x.lineWidth = 14; x.strokeRect(7, 7, 498, 370)
      x.fillStyle = '#14306b'; x.textAlign = 'center'; const fit = (t, px, y) => { do { x.font = `bold ${px}px Oswald, Impact, sans-serif`; px -= 2 } while (x.measureText(t).width > 440); x.fillText(t, 256, y) }
      fit('BANK OF THE', 74, 100); fit('GULF OF AMERICA', 60, 176)
      for (const [i, c] of ['#c8302b', '#14306b', '#c8302b'].entries()) { x.strokeStyle = c; x.lineWidth = 14; x.beginPath(); for (let k = 0; k <= 24; k++) { const px = 176 + k * 6.7, py = 230 + i * 30 + Math.sin(k * 0.55) * 9; k ? x.lineTo(px, py) : x.moveTo(px, py) } x.stroke() }
      x.fillStyle = '#14306b'; x.font = 'bold 30px Oswald, sans-serif'; x.fillText('Mo-Fee-ATM  →', 256, 352)
    } })
    box(M('#c9c2b0'), sx, 0.6, sz, 0.55, 1.2, 2.5)
    box(white, sx, 2.15, sz, 0.3, 2.0, 2.8)
    for (const e of [-1, 1]) plane(face, sx + e * 0.16, 2.15, sz, 2.7, 1.95, e * Math.PI / 2, { emissive: '#ffffff', emissiveMap: face, emissiveIntensity: 0.15 })
    const shrub = M('#3f6b3a', { roughness: 1 }), redLeaf = M('#8e2b3a', { roughness: 1 })
    for (const [dx, dz, r, m] of [[0, -1.9, 0.45, shrub], [0, 1.9, 0.4, redLeaf]]) { const sh = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), m); sh.scale.y = 0.7; sh.position.set(sx + dx, 0.3, sz + dz); sh.castShadow = true; g.add(sh) }
  }
  
  // The OOPS Store: the south end of the south building (the short leg at -87.65, 372.6),
  // with a storefront on its south wall, facing the bank and the gas station.
  {
    const cxm = -87.65 * U, zf = (372.6 + 1.9) * U + 0.22, lot = 0.045 * U, W = 4.7 * U
    const sign = label('', { w: 1024, h: 192, draw: (x) => {
      x.fillStyle = '#dcbf86'; x.fillRect(0, 0, 1024, 192)
      x.fillStyle = '#5a3a1e'; x.beginPath(); x.moveTo(60, 30); x.lineTo(170, 30); x.lineTo(170, 110); x.quadraticCurveTo(115, 175, 60, 110); x.fill()
      x.fillStyle = '#f1b62f'; x.font = 'bold 50px Oswald, Impact, sans-serif'; x.textAlign = 'center'; x.fillText('oops', 115, 98)
      x.fillStyle = '#c8302b'; x.textAlign = 'left'; let px = 110; do { x.font = `bold ${px}px Oswald, Impact, sans-serif`; px -= 2 } while (x.measureText('The OOPS Store').width > 780); x.fillText('The OOPS Store', 210, 130)
    } })
    plane(sign, cxm, lot + 4.7, zf, 11.5, 2.15, 0)
    const glass = M('#31424a', { roughness: 0.15, metalness: 0.5 }), pier = M('#cdb07a')
    for (let i = 0; i < 4; i++) {
      const x = cxm - W / 2 + (i + 0.5) * W / 4
      box(glass, x, lot + 1.55, zf - 0.03, W / 4 - 1.1, 2.5, 0.08, false)
      if (i === 1) box(M('#2b2d31'), x, lot + 1.15, zf + 0.02, 1.0, 2.3, 0.06, false)
    }
    for (let i = 0; i <= 4; i++) box(pier, cxm - W / 2 + i * W / 4, lot + 1.7, zf - 0.05, 0.7, 3.4, 0.5)
    const posters = [['SHIP IT', '#5a3a1e', '#f1b62f'], ['WE LOSE NOTHING*', '#c8302b', '#fff'], ['FAX', '#2f6fc4', '#fff']]
    posters.forEach(([t, bg, fg], i) => plane(label(t, { w: 256, h: 128, bg, fg, font: 'bold 34px Oswald, Impact, sans-serif' }), cxm - W / 2 + ([0, 2, 3][i] + 0.5) * W / 4, lot + 1.9, zf + 0.03, 1.5, 0.75))
    box(M('#d9d5c8'), cxm, lot + 0.08, zf + 0.9, W, 0.16, 1.8, false)
    // The holiday banner strung across the front.
    const banner = label('', { w: 1024, h: 256, draw: (x) => {
      // Same look as the turkey banner on publick: cream, red bars, a green frame.
      x.fillStyle = '#f7e9c4'; x.fillRect(0, 0, 1024, 256); x.fillStyle = '#c8302b'; x.fillRect(0, 0, 1024, 16); x.fillRect(0, 240, 1024, 16)
      x.strokeStyle = '#2f7d32'; x.lineWidth = 7; x.strokeRect(22, 30, 980, 196)
      x.textAlign = 'center'; x.fillStyle = '#2f7d32'; x.font = 'bold 44px Oswald, Impact, sans-serif'; x.fillText('HOLIDAY SHIPPING ALERT', 512, 82)
      x.fillStyle = '#c8302b'; x.font = 'bold 76px Oswald, Impact, sans-serif'; x.fillText("SANTA'S SLEIGH BROKE", 512, 156)
      x.font = 'bold 42px Oswald, Impact, sans-serif'; x.fillText('PACKAGES POSTPONED TILL JANUARY', 512, 208)
    } })
    const bg = new THREE.PlaneGeometry(9.6, 2.4, 20, 4), bp = bg.attributes.position
    for (let i = 0; i < bp.count; i++) { const u = bp.getX(i) / 4.8; bp.setY(i, bp.getY(i) - (1 - u * u) * 0.16); bp.setZ(i, Math.sin(u * 6) * 0.04) }
    bg.computeVertexNormals()
    const bm = new THREE.Mesh(bg, new THREE.MeshStandardMaterial({ map: banner, roughness: 0.8, side: THREE.DoubleSide })); bm.position.set(cxm, lot + 2.75, zf + 0.34); bm.castShadow = true; g.add(bm)
    for (const e of [-1, 1]) for (const v of [-1, 1]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 5), M('#d8d2c0')); r.position.set(cxm + e * 5.05, lot + 2.75 + v * 1.25, zf + 0.25); r.rotation.z = -e * v * 0.9; g.add(r) }
  }
  
  // South half of the plaza, from Chris's Street Views: shop awnings along the west strip, lattice
  // screens in Megabucks' windows, black awnings and posters on the salon, a planted corner with a stop sign.
  {
    const lot = 0.045 * U
    const frame = (cx0, cz0, t) => { const c = Math.cos(t), sn = Math.sin(t); return { t, at: (lx, lz) => [(cx0 + lx * c + lz * sn) * U, (cz0 - lx * sn + lz * c) * U] } }
    const awning = (f, lx, lz, y, w, color, depth = 0.9) => {
      const [x, z] = f.at(lx, lz), a = new THREE.Group(); a.position.set(x, y, z); a.rotation.y = f.t; g.add(a)
      const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, depth), M(color, { side: THREE.DoubleSide })); top.rotation.x = 0.55; top.position.set(0, 0, depth * 0.42); top.castShadow = true; a.add(top)
      const lip = new THREE.Mesh(new THREE.BoxGeometry(w, 0.22, 0.03), M(color)); lip.position.set(0, -0.33, depth * 0.84); a.add(lip)
    }
    // West strip: an awning over every other bay that has no name on it.
    const strip = frame(-93.25, 364.09, Math.atan2(0.968, -0.249)), bay = 14.7 / 12
    const cols = ['#2f7d5a', '#2f6fc4', '#22305c', '#2f7d5a', '#e8a020'] // navy over Joisey Mick's
    ;[1, 3, 5, 10].forEach((k, i) => awning(strip, -7.35 + (k + 0.5) * bay, 1.65 + 0.03, lot + 1.0 * U, bay * U - 1.6, cols[i]))
    // The ice-cream shop next door to Megabucks, on the bay that had no name.
    { const ice = label('', { w: 512, h: 160, draw: (x) => {
        x.fillStyle = '#cfb07a'; x.fillRect(0, 0, 512, 160)
        x.fillStyle = '#f1c62f'; x.beginPath(); x.arc(58, 80, 40, 0, 7); x.fill(); x.fillStyle = '#7a3a8a'; x.beginPath(); x.arc(58, 66, 17, 0, 7); x.fill(); x.fillStyle = '#b98a4f'; x.beginPath(); x.moveTo(44, 76); x.lineTo(72, 76); x.lineTo(58, 112); x.fill()
        x.fillStyle = '#7a3a8a'; x.textAlign = 'center'; x.font = 'bold 62px Oswald, Impact, sans-serif'; x.fillText('GRANITE SLAB', 310, 72); x.font = 'bold 54px Oswald, Impact, sans-serif'; x.fillText('CREAMERY', 310, 134)
      } })
      const [x, z] = strip.at(-7.35 + 8.5 * bay, 1.65 + 0.085); plane(ice, x, lot + 1.25 * U, z, bay * U - 0.9, (bay * U - 0.9) * 0.3125, strip.t) }
    // Megabucks: white lattice screens across its windows, under the arcade.
    const lattice = label('', { w: 256, h: 256, bg: '#31424a', draw: (x) => {
      x.fillStyle = '#31424a'; x.fillRect(0, 0, 256, 256); x.strokeStyle = '#f4f1e8'; x.lineWidth = 5
      for (let i = -256; i < 512; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 256, 256); x.moveTo(i + 256, 0); x.lineTo(i, 256); x.stroke() }
      for (let i = 16; i < 256; i += 64) for (let j = 16; j < 256; j += 64) { x.beginPath(); x.arc(i + 16, j + 16, 14, 0, 7); x.stroke() }
    } })
    for (const k of [10]) { const [x, z] = strip.at(-7.35 + (k + 0.5) * bay, 1.65 - 0.75 + 0.06); plane(lattice, x, lot + 0.42 * U, z, bay * U - 1.7, 0.6 * U, strip.t) }
    // The planted corner off the strip's north end: mulch, shrubs, a stop sign.
    { const [bx, bz] = strip.at(7.45 + 0.75, 1.0)
      const bed = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.6, 0.22, 16), M('#d9d5c8')); bed.position.set(bx, lot + 0.11, bz); g.add(bed)
      const mulch = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.24, 16), M('#6b4f3a')); mulch.position.set(bx, lot + 0.12, bz); g.add(mulch)
      for (const [dx, dz, r] of [[0.5, 0.3, 0.55], [-0.5, 0.2, 0.5], [0, -0.6, 0.55], [0.1, 0.75, 0.4]]) { const sh = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), M('#3f6b3a', { roughness: 1 })); sh.scale.y = 0.7; sh.position.set(bx + dx, lot + 0.45, bz + dz); sh.castShadow = true; g.add(sh) }
      cyl(steel, bx + 1.0, lot + 1.2, bz + 0.6, 0.035, 2.2, 6)
      const stop = label('', { w: 128, h: 128, draw: (c) => { c.clearRect(0, 0, 128, 128); c.fillStyle = '#c8302b'; c.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; c[i ? 'lineTo' : 'moveTo'](64 + Math.cos(a) * 62, 64 + Math.sin(a) * 62) } c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 5; c.stroke(); c.fillStyle = '#fff'; c.font = 'bold 40px Oswald, Impact, sans-serif'; c.textAlign = 'center'; c.fillText('STOP', 64, 79) } })
      for (const ry of [strip.t + Math.PI / 2, strip.t - Math.PI / 2]) plane(stop, bx + 1.0, lot + 2.1, bz + 0.6, 0.8, 0.8, ry, { transparent: true, alphaTest: 0.5, side: THREE.DoubleSide })
      g.userData.cornerBed = [bx, bz, 1.6]
    }
    // The salon in the south building: its front faces north to the lot, with a second name on the east end.
    const leg = frame(-87.65, 372.6, Math.PI)
    for (let i = 0; i < 4; i++) awning(leg, -4.7 / 2 + (i + 0.5) * 4.7 / 4, 1.9 + 0.03, lot + 0.95 * U, 4.7 / 4 * U - 1.0, '#141414', 1.1)
    const faces = ['#c98a6a', '#e0b090', '#a86a4a', '#d9a27e']
    for (let i = 0; i < 4; i++) {
      const poster = label('', { w: 128, h: 192, draw: (x) => { x.fillStyle = ['#f3e6ea', '#e6eef3', '#f3efe0', '#e9f0e6'][i]; x.fillRect(0, 0, 128, 192); x.fillStyle = ['#3a2a20', '#c9a24a', '#6b3a2a', '#1b1b1b'][i]; x.beginPath(); x.ellipse(64, 78, 46, 58, 0, 0, 7); x.fill(); x.fillStyle = faces[i]; x.beginPath(); x.ellipse(64, 88, 30, 40, 0, 0, 7); x.fill(); x.fillStyle = '#8a3a7a'; x.font = 'bold 20px Oswald, sans-serif'; x.textAlign = 'center'; x.fillText('PIZZAZZ', 64, 178) } })
      const [x, z] = leg.at(-4.7 / 2 + (i + 0.5) * 4.7 / 4, 1.9 - 0.75 + 0.07); plane(poster, x, lot + 0.42 * U, z, 1.5, 2.25, leg.t)
    }
    const salon = label('PIZZAZZ', { w: 512, h: 128, bg: '#dcbf86', fg: '#141414', font: 'bold 96px Georgia, serif' })
    plane(salon, (-87.65 + 4.7 / 2) * U + 0.22, lot + 1.2 * U, 372.3 * U, 7.5, 1.9, Math.PI / 2)
  }
  
  // East end of the north strip, as seen from A1A Beach Blvd: a utility enclosure on the blank
  // end wall, a dark fence, hedges, and sabal palms on the grass by the road.
  {
    const lot = 0.045 * U, ex = -76.1 * U, zc = 339.8 * U
    box(M('#e3dfd2'), ex + 1.3, lot + 1.3, zc - 2.5, 2.6, 2.6, 5.5)
    box(M('#cfcabb'), ex + 1.3, lot + 2.65, zc - 2.5, 2.8, 0.12, 5.7)
    box(M('#1c1d1f'), ex + 1.0, lot + 1.0, zc - 6.3, 2.0, 2.0, 0.1)
    const hedge = M('#3f6b3a', { roughness: 1 })
    for (const [dz, len] of [[2.2, 3.4], [5.6, 1.8]]) box(hedge, ex + 1.1, lot + 0.5, zc + dz, 1.3, 1.0, len)
    const trunk = M('#8a7a5e', { roughness: 1 }), frond = M('#4f7a45', { roughness: 1, side: THREE.DoubleSide })
    const palmAt = (x, z, h, lean) => {
      const p = new THREE.Group(); p.position.set(x, 0.05, z); p.rotation.z = lean; g.add(p)
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, h, 7), trunk); t.position.y = h / 2; t.castShadow = true; p.add(t)
      const boot = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), trunk); boot.position.y = h - 0.2; boot.scale.y = 1.3; p.add(boot)
      for (let i = 0; i < 12; i++) {
        // Each frond is a flat blade running out and down from the crown.
        const a = (i / 12) * Math.PI * 2, dir = new THREE.Vector3(Math.cos(a), -0.25 - (i % 3) * 0.3, Math.sin(a)).normalize()
        const f = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.6, 4), frond); f.scale.z = 0.12
        f.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
        f.position.set(0, h + 0.3, 0).addScaledVector(dir, 1.3); f.castShadow = true; p.add(f)
      }
    }
    // On the grass strip between the lot and the road (the road itself is drivable).
    for (const [px, pz, h, lean] of [[-72.0, 341.6, 6.5, 0.06], [-73.05, 345.0, 7.4, -0.05], [-74.2, 348.6, 6.8, 0.08], [-76.5, 356.0, 7.8, -0.04], [-78.1, 361.5, 6.2, 0.05], [-80.2, 368.5, 7.0, 0.04]]) palmAt(px * U, pz * U, h, lean)
  }

  // Joisey Mick's Subs, in an empty bay of the south strip between the stretch shop and the pizza place,
  // with a window banner taking a shot at the competition and two patio tables out front.
  {
    const t = Math.atan2(0.968, -0.249), X = [Math.cos(t), -Math.sin(t)], Z = [Math.sin(t), Math.cos(t)]
    const at = (lx, lz) => [(-93.25 + lx * X[0] + lz * Z[0]) * U, (364.09 + lx * X[1] + lz * Z[1]) * U]
    const bay = -14.9 / 2 + 0.1 + 5.5 * (14.9 - 0.2) / 12, front = 3.3 / 2
    const sign = label('', { w: 512, h: 192, draw: (x) => {
      x.fillStyle = '#1d2a4a'; x.beginPath(); x.roundRect(6, 10, 500, 172, 40); x.fill(); x.strokeStyle = '#c8302b'; x.lineWidth = 8; x.stroke()
      x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.font = 'bold 26px Oswald, sans-serif'; x.fillText('SINCE 1957', 256, 48)
      let px = 84; do { x.font = `italic bold ${px}px Georgia, serif`; px -= 2 } while (x.measureText("Joisey Mick's").width > 440); x.fillText("Joisey Mick's", 256, 126)
      x.font = 'bold 30px Oswald, sans-serif'; x.fillText('S U B S', 256, 168)
    } })
    { const [x, z] = at(bay, front + 0.035); plane(sign, x, (1.45 - 0.2) * U, z, 3.6, 1.35, t, { emissive: '#ffffff', emissiveMap: sign, emissiveIntensity: 0.18 }) }
    // A vinyl banner stretched across the pilasters, between the awning and the umbrellas.
    const banner = label('', { w: 1024, h: 232, draw: (x) => {
      x.fillStyle = '#fffdf3'; x.fillRect(0, 0, 1024, 232); x.strokeStyle = '#c8302b'; x.lineWidth = 16; x.strokeRect(8, 8, 1008, 216)
      x.textAlign = 'center'; const fit = (t, px, y, c) => { x.fillStyle = c; do { x.font = `bold ${px}px Oswald, Impact, sans-serif`; px -= 2 } while (x.measureText(t).width > 940); x.fillText(t, 512, y) }
      fit('BEST SUBS AROUND', 108, 120, '#1d2a4a'); fit("DON'T GO TO THAT OTHER PLACE", 62, 192, '#c8302b')
    } })
    { const W = (14.9 - 0.2) / 12 * U + 0.5, [x, z] = at(bay, front + 0.045); plane(banner, x, 0.82 * U, z, W, W * 232 / 1024, t)
      const rope = M('#d8d2c0'); for (const e of [-1, 1]) { const [rx, rz] = at(bay + e * (W / U / 2 + 0.03), front + 0.04); cyl(rope, rx, 0.82 * U, rz, 0.02, W * 232 / 1024, 4) } }
    // Patio: two blue umbrellas over little tables with red stools.
    const pole = M('#3b3f44', { metalness: 0.5 }), cloth = M('#22305c', { side: THREE.DoubleSide }), top = M('#2a4f9e'), red = M('#c8302b')
    for (const e of [-0.42, 0.42]) {
      const [x, z] = at(bay + e, front - 0.12)
      cyl(pole, x, 1.25, z, 0.04, 2.45, 6)
      const um = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.5, 8, 1, true), cloth); um.position.set(x, 2.35, z); um.castShadow = true; g.add(um)
      cyl(top, x, 0.0451 * U + 0.72, z, 0.38, 0.04, 14)
      for (let k = 0; k < 3; k++) { const a = k * 2.1 + e, sx = x + Math.cos(a) * 0.62, sz = z + Math.sin(a) * 0.62; cyl(red, sx, 0.0451 * U + 0.42, sz, 0.17, 0.05, 10); for (const d of [[-1, -1], [1, 1], [-1, 1], [1, -1]]) cyl(red, sx + d[0] * 0.1, 0.0451 * U + 0.2, sz + d[1] * 0.1, 0.015, 0.42, 4) }
    }
  }

  // The pylon sign at the A1A Beach Blvd entrance, re-faced: PONCE PLAZA up top, publick and two tenants below.
  {
    const x = -74.9 * U, z = 349.5 * U
    const head = label('', { w: 512, h: 448, draw: (c) => { c.fillStyle = '#f4efe2'; c.fillRect(0, 0, 512, 448); c.fillStyle = '#2b5a3f'; c.textAlign = 'center'
      c.font = 'bold 150px Oswald, Impact, sans-serif'; c.fillText('PONCE', 256, 200); c.font = 'bold 150px Oswald, Impact, sans-serif'; c.fillText('PLAZA', 256, 370) } })
    const body = label('', { w: 256, h: 840, draw: (c) => {
      c.fillStyle = '#dcbf86'; c.fillRect(0, 0, 256, 840); c.textAlign = 'center'
      c.fillStyle = '#fffdf5'; c.fillRect(14, 262, 228, 150); c.fillStyle = '#4fae2c'; let px = 66; do { c.font = `italic bold ${px}px Georgia, serif`; px -= 2 } while (c.measureText('publick').width > 196); c.fillText('publick', 128, 352)
      c.fillStyle = '#1d2a4a'; c.fillRect(14, 432, 228, 150); c.fillStyle = '#fff'; let jp = 44; do { c.font = `italic bold ${jp}px Georgia, serif`; jp -= 2 } while (c.measureText("Mick's").width > 196); c.fillText("Joisey", 128, 492); c.fillText("Mick's", 128, 540); c.font = 'bold 20px Oswald, sans-serif'; c.fillText('S U B S', 128, 568)
      c.fillStyle = '#fffdf5'; c.fillRect(14, 602, 228, 150); c.fillStyle = '#3a8a3a'; c.font = 'bold 54px Oswald, Impact, sans-serif'; c.fillText('DOLLAR', 128, 667); c.fillText('PALM', 128, 727)
    } })
    for (const sd of [-1, 1]) {
      plane(head, x + sd * 0.2 * U, 1.55 * U, z, 0.62 * U, 0.55 * U, sd * Math.PI / 2, { emissive: '#ffffff', emissiveMap: head, emissiveIntensity: 0.15 })
      plane(body, x + sd * 0.175 * U, 0.9 * U, z, 0.55 * U, 1.8 * U, sd * Math.PI / 2)
    }
  }

  // Farmers Defending Farmers: the Tuscan-style insurance office on the corner of A1A S and Floridian Ave.
  // Tan stucco, terracotta hip roofs, a corner clock tower with blue arched windows, red feather flags,
  // and two farmers guarding the door with pitchforks.
  {
    const F = new THREE.Group(); F.position.set(-100.2 * U, 0.045 * U, 384.9 * U); F.rotation.y = 0.19; g.add(F)
    const W = 3.9 * U - 0.8, D = 2.7 * U - 0.8, H = 4.3
    const stucco = M('#e2bb7d', { roughness: 0.95 }), trim = M('#c99a5a'), tile = M('#b5532e', { roughness: 0.8 }), dk = M('#4a2a1c'), glass = M('#25343a', { roughness: 0.15, metalness: 0.4 })
    const add = (geo, mat, x, y, z, ry = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; F.add(m); return m }
    const hip = (w, d, h, x, y, z) => { const r = add(new THREE.ConeGeometry(Math.SQRT1_2, 1, 4), tile, x, y + h / 2, z, Math.PI / 4); r.scale.set(w + 0.9, h, d + 0.9); r.rotation.y = 0; r.geometry = r.geometry.clone().rotateY(Math.PI / 4); return r }
    // Two wings stepped like the real one, each under its own hip roof.
    add(new THREE.BoxGeometry(W, H, D * 0.62), stucco, 0, H / 2, -D * 0.19); hip(W, D * 0.62, 2.4, 0, H, -D * 0.19)
    add(new THREE.BoxGeometry(W * 0.62, H, D * 0.5), stucco, -W * 0.12, H / 2, D * 0.22); hip(W * 0.62, D * 0.5, 2.0, -W * 0.12, H, D * 0.22)
    add(new THREE.BoxGeometry(W + 0.2, 0.35, D * 0.62 + 0.2), dk, 0, H - 0.2, -D * 0.19)
    // Brackets under the eaves along the two street sides.
    for (let x = -W / 2 + 0.6; x < W / 2; x += 1.1) add(new THREE.BoxGeometry(0.18, 0.35, 0.35), dk, x, H - 0.55, D * 0.12 + 0.17)
    for (let z = -D * 0.5 + 0.6; z < D * 0.1; z += 1.1) add(new THREE.BoxGeometry(0.35, 0.35, 0.18), dk, W / 2 + 0.17, H - 0.55, z)
    // Storefront glass toward A1A and toward Floridian.
    for (const z of [-D * 0.38, -D * 0.05]) add(new THREE.BoxGeometry(0.06, 2.2, 2.6), glass, W / 2 + 0.03, 1.6, z)
    for (const x of [-W * 0.32, W * 0.02]) add(new THREE.BoxGeometry(2.6, 2.2, 0.06), glass, x, 1.6, D * 0.47 + 0.03)
    add(new THREE.BoxGeometry(0.08, 2.6, 1.6), dk, W / 2 + 0.04, 1.3, D * 0.02) // front door
    // The corner clock tower.
    const tx = W / 2 - 1.6, tz = D * 0.47 - 1.6, TH = 9.5
    add(new THREE.BoxGeometry(3.4, TH, 3.4), stucco, tx, TH / 2, tz)
    add(new THREE.BoxGeometry(3.7, 0.4, 3.7), dk, tx, TH - 0.1, tz)
    const tr = add(new THREE.ConeGeometry(2.75, 1.9, 4), tile, tx, TH + 0.95, tz, Math.PI / 4)
    // Belfry: three arched openings on each face, drawn as one clean panel (cream surround, dark arches, sills).
    const belfry = label('', { w: 512, h: 384, draw: (c) => {
      c.fillStyle = '#e2bb7d'; c.fillRect(0, 0, 512, 384)
      for (let k = 0; k < 3; k++) { const x = 70 + k * 150, w = 88
        c.fillStyle = '#f4e6c6'; c.beginPath(); c.moveTo(x - 12, 330); c.lineTo(x - 12, 130); c.arc(x + w / 2, 130, w / 2 + 12, Math.PI, 0); c.lineTo(x + w + 12, 330); c.fill()
        c.fillStyle = '#1d2a30'; c.beginPath(); c.moveTo(x, 322); c.lineTo(x, 130); c.arc(x + w / 2, 130, w / 2, Math.PI, 0); c.lineTo(x + w, 322); c.fill()
        c.fillStyle = '#2f4f63'; c.fillRect(x + w / 2 - 3, 90, 6, 232); c.fillStyle = '#c99a5a'; c.fillRect(x - 18, 322, w + 36, 16) }
    } })
    for (const [nx, nz, ry] of [[1, 0, Math.PI / 2], [0, 1, 0], [-1, 0, -Math.PI / 2], [0, -1, Math.PI]]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 2.48), new THREE.MeshStandardMaterial({ map: belfry, roughness: 0.9 })); p.position.set(tx + nx * 1.71, TH - 1.45, tz + nz * 1.71); p.rotation.y = ry; F.add(p)
    }
    // Pitchfork logo: one bold red pitchfork inside a ring.
    const logo = (c, cx, cy, r) => {
      c.fillStyle = '#fbf4e4'; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill()
      c.strokeStyle = '#c8241a'; c.lineWidth = r * 0.12; c.beginPath(); c.arc(cx, cy, r * 0.92, 0, 7); c.stroke()
      c.fillStyle = '#c8241a'; const u = r / 10
      c.fillRect(cx - u * 0.55, cy - u * 1.5, u * 1.1, u * 8.2)            // handle
      c.beginPath(); c.moveTo(cx - u * 3.6, cy - u * 1.5); c.lineTo(cx + u * 3.6, cy - u * 1.5); c.lineTo(cx + u * 3.2, cy); c.lineTo(cx - u * 3.2, cy); c.fill() // crossbar
      for (const dx of [-3.0, 0, 3.0]) { c.beginPath(); c.moveTo(cx + (dx - 0.6) * u, cy - u * 1.4); c.lineTo(cx + (dx - 0.6) * u, cy - u * 6); c.lineTo(cx + dx * u, cy - u * 7.6); c.lineTo(cx + (dx + 0.6) * u, cy - u * 6); c.lineTo(cx + (dx + 0.6) * u, cy - u * 1.4); c.fill() } // tines
    }
    // The tower carries the name all the way down: logo, then each word stacked big.
    const towerSign = label('', { w: 512, h: 1126, draw: (c) => { c.fillStyle = '#e2bb7d'; c.fillRect(0, 0, 512, 1126); logo(c, 256, 150, 118)
      c.textAlign = 'center'; c.fillStyle = '#c8241a'
      const words = [['FARMERS', 150], ['WITH', 96], ['PITCHFORKS', 150], ['DEFENDING', 150], ['FARMERS', 150]]
      const sizes = words.map(([t, cap]) => { let px = cap; do { c.font = `bold ${px}px Georgia, serif`; px -= 2 } while (c.measureText(t).width > 476); return px + 2 })
      const gap = (1126 - 300 - 30 - sizes.reduce((a, b) => a + b * 0.78, 0)) / (words.length + 1)
      let y = 300 + gap
      words.forEach(([t], k) => { c.font = `bold ${sizes[k]}px Georgia, serif`; y += sizes[k] * 0.78; c.fillText(t, 256, y); y += gap })
    } })
    for (const [nx, nz, ry] of [[1, 0, Math.PI / 2], [0, 1, 0]]) {
      const p2 = new THREE.Mesh(new THREE.PlaneGeometry(2.85, 6.25), new THREE.MeshStandardMaterial({ map: towerSign, emissive: '#ffffff', emissiveMap: towerSign, emissiveIntensity: 0.12 })); p2.position.set(tx + nx * 1.72, 3.55, tz + nz * 1.72); p2.rotation.y = ry; F.add(p2)
    }
    // ...and along the main building's fascia, facing A1A.
    const fascia = label('', { w: 2048, h: 160, draw: (c) => { c.fillStyle = '#f6ead0'; c.fillRect(0, 0, 2048, 160); c.fillStyle = '#c8241a'; c.textAlign = 'center'; let px = 120; do { c.font = `bold ${px}px Georgia, serif`; px -= 4 } while (c.measureText('FARMERS WITH PITCHFORKS DEFENDING FARMERS').width > 1960); c.fillText('FARMERS WITH PITCHFORKS DEFENDING FARMERS', 1024, 112) } })
    { const fl = D * 0.62 - 0.4, f = new THREE.Mesh(new THREE.PlaneGeometry(fl, fl * 160 / 2048), new THREE.MeshStandardMaterial({ map: fascia })); f.position.set(W / 2 + 0.06, H - 1.15, -D * 0.19); f.rotation.y = Math.PI / 2; F.add(f) }
    { const fl = W * 0.62 - 0.4, f = new THREE.Mesh(new THREE.PlaneGeometry(fl, fl * 160 / 2048), new THREE.MeshStandardMaterial({ map: fascia })); f.position.set(-W * 0.12, H - 1.15, D * 0.47 + 0.06); F.add(f) }
    // Monument sign on the corner lawn and two red feather flags.
    const mono = label('', { w: 512, h: 192, draw: (c) => { c.fillStyle = '#fbf4e4'; c.fillRect(0, 0, 512, 192); logo(c, 90, 96, 62); c.fillStyle = '#d62b1f'; c.font = 'bold 40px Georgia, serif'; c.fillText('FARMERS WITH', 172, 70); c.fillText('PITCHFORKS', 172, 116); c.font = 'bold 27px Georgia, serif'; c.fillText('DEFENDING FARMERS', 172, 158) } })
    const ms = add(new THREE.BoxGeometry(0.5, 1.2, 3.0), trim, W / 2 + 2.6, 0.6, D * 0.3)
    for (const e of [-1, 1]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 1.09), new THREE.MeshStandardMaterial({ map: mono })); f.position.set(W / 2 + 2.6 + e * 0.26, 0.62, D * 0.3); f.rotation.y = e * Math.PI / 2; F.add(f) }
    const flagTex = label('', { w: 128, h: 512, draw: (c) => { c.fillStyle = '#c8241a'; c.fillRect(0, 0, 128, 512); c.save(); c.translate(64, 256); c.rotate(-Math.PI / 2); c.fillStyle = '#fff'; c.font = 'italic bold 64px Georgia, serif'; c.textAlign = 'center'; c.fillText('Farmers', 0, 22); c.restore() } })
    const fm = new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide })
    for (const z of [-D * 0.45, D * 0.15]) {
      add(new THREE.CylinderGeometry(0.04, 0.04, 3.6, 6), M('#555'), W / 2 + 3.6, 1.8, z)
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 2.6), fm); fl.position.set(W / 2 + 3.6, 2.2, z + 0.4); fl.rotation.y = Math.PI / 2; fl.rotation.z = 0.05; F.add(fl)
    }
    // Two farmers guarding the door, pitchforks up.
    const skin = M('#c98a6a'), denim = M('#3b5b8a'), plaid = M('#b23a2a'), straw = M('#d8b15a'), wood = M('#8a5a2b'), tine = M('#8d9396', { metalness: 0.7 })
    for (const e of [-1, 1]) {
      const fx = W / 2 + 1.1, fz = D * 0.02 + e * 1.5, m = new THREE.Group(); m.position.set(fx, 0, fz); m.rotation.y = Math.PI / 2; F.add(m)
      const part = (geo, mat, x, y, z) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = true; m.add(o); return o }
      for (const l of [-0.13, 0.13]) part(new THREE.CylinderGeometry(0.09, 0.08, 0.85, 8), denim, l, 0.43, 0)
      part(new THREE.CylinderGeometry(0.24, 0.22, 0.7, 10), plaid, 0, 1.2, 0); part(new THREE.BoxGeometry(0.42, 0.5, 0.05), denim, 0, 1.12, 0.21)
      part(new THREE.SphereGeometry(0.16, 12, 10), skin, 0, 1.7, 0)
      part(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 16), straw, 0, 1.84, 0); part(new THREE.CylinderGeometry(0.15, 0.17, 0.14, 12), straw, 0, 1.92, 0)
      const arm = part(new THREE.CylinderGeometry(0.06, 0.06, 0.55, 6), plaid, e * 0.3, 1.3, 0.12); arm.rotation.x = -0.9
      const fork = new THREE.Group(); fork.position.set(e * 0.34, 0.05, 0.3); m.add(fork)
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 6), wood); shaft.position.y = 1.1; fork.add(shaft)
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.04), tine); bar.position.y = 2.2; fork.add(bar)
      for (const t of [-0.15, 0, 0.15]) { const tn = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.4, 5), tine); tn.position.set(t, 2.42, 0); fork.add(tn) }
    }
  }

  // 280 Floridian Ave: a one-storey stucco office in the same Tuscan dress, low terracotta hip roof,
  // dark window bands with a red brick sill, banded pilasters, mulch beds, a magnolia and tall palms.
  {
    const O = new THREE.Group(); O.position.set(-97.8 * U, 0.045 * U, 393.0 * U); g.add(O)
    const W = 4.5 * U - 1.0, D = 3.7 * U - 1.0, H = 3.9
    const stucco = M('#e6c48c', { roughness: 0.95 }), base = M('#d9a24e'), band = M('#b04a2e'), tile = M('#b5532e', { roughness: 0.8 }), glass = M('#1f2c30', { roughness: 0.15, metalness: 0.4 }), cream = M('#f1e3c4')
    const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; O.add(m); return m }
    add(new THREE.BoxGeometry(W, H, D), stucco, 0, H / 2, 0)
    add(new THREE.BoxGeometry(W + 0.06, 0.9, D + 0.06), base, 0, 0.45, 0)
    add(new THREE.BoxGeometry(W + 0.1, 0.12, D + 0.1), band, 0, 0.95, 0)
    add(new THREE.BoxGeometry(W + 1.4, 0.18, D + 1.4), cream, 0, H, 0) // deep eaves
    const roof = add(new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4), tile, 0, H + 1.09, 0); roof.scale.set(W + 1.6, 2.0, D + 1.6)
    for (const [nx, nz] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const len = nz ? W : D, n = Math.max(2, Math.round(len / 4.2))
      for (let i = 0; i < n; i++) {
        const t = -len / 2 + (i + 0.5) * len / n, x = nz ? t : nx * (W / 2 + 0.03), z = nz ? nz * (D / 2 + 0.03) : t
        add(new THREE.BoxGeometry(nz ? len / n - 1.0 : 0.06, 1.9, nz ? 0.06 : len / n - 1.0), glass, x, 2.0, z)
        if (i) { const px = nz ? -len / 2 + i * len / n : nx * (W / 2 + 0.12), pz = nz ? nz * (D / 2 + 0.12) : -len / 2 + i * len / n
          add(new THREE.BoxGeometry(nz ? 0.55 : 0.3, H - 0.2, nz ? 0.3 : 0.55), base, px, H / 2, pz); for (const y of [2.6, 2.85]) add(new THREE.BoxGeometry(nz ? 0.62 : 0.36, 0.06, nz ? 0.36 : 0.62), band, px, y, pz) }
      }
    }
    const mulch = M('#6b3a24', { roughness: 1 }), leaf = M('#3d6a32', { roughness: 1 }), mag = M('#2f4f2a', { roughness: 1 }), rust = M('#7a4a26', { roughness: 1 }), trunk = M('#8a7a62')
    add(new THREE.BoxGeometry(W + 3, 0.08, 2.4), mulch, 0, 0.045, -D / 2 - 1.7)
    add(new THREE.BoxGeometry(2.4, 0.08, D + 3), mulch, W / 2 + 1.7, 0.047, 0)
    for (let i = 0; i < 7; i++) { const b = add(new THREE.SphereGeometry(0.55 + (i % 3) * 0.15, 8, 6), leaf, -W / 2 + 1 + i * (W - 2) / 6, 0.45, -D / 2 - 1.3); b.scale.y = 0.8 }
    { const mx = -W / 2 + 2.2, mz = -D / 2 - 2.2; add(new THREE.CylinderGeometry(0.15, 0.2, 2.2, 6), trunk, mx, 1.1, mz)
      for (const [dx, dy, dz, r, m] of [[0, 3.4, 0, 1.6, mag], [0.7, 4.3, 0.3, 1.1, rust], [-0.6, 2.7, -0.4, 1.2, mag]]) add(new THREE.IcosahedronGeometry(r, 1), m, mx + dx, dy, mz + dz) }
    for (const [x, z, h] of [[W / 2 + 1.4, -D / 2 - 1.2, 11], [W / 2 + 1.6, D / 2 - 1.5, 9]]) {
      add(new THREE.CylinderGeometry(0.17, 0.25, h, 8), trunk, x, h / 2, z)
      for (let k = 0; k < 9; k++) { const fr = add(new THREE.ConeGeometry(0.35, 2.6, 4), leaf, x + Math.cos(k * 0.7) * 0.9, h + 0.1, z + Math.sin(k * 0.7) * 0.9); fr.rotation.set(Math.sin(k * 0.7) * 1.9, 0, -Math.cos(k * 0.7) * 1.9) }
    }
    add(new THREE.BoxGeometry(1.3, 0.8, 0.9), M('#c9cbc6'), W / 2 + 1.2, 0.4, 1.0) // AC unit
  }

  // Megabucks' drive-thru: a DRIVE THRU sign over each end of the lane, a pickup window, and one barista.
  {
    const t = Math.atan2(0.968, -0.249), c = Math.cos(t), sn = Math.sin(t)
    const at = (lx, lz) => [(-93.25 + lx * c + lz * sn) * U, (364.09 - lx * sn + lz * c) * U]
    const green = '#1f6b45', lot = 0.045 * U
    const dt = label('', { w: 512, h: 128, draw: (x) => { x.fillStyle = green; x.fillRect(0, 0, 512, 128); x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = 'bold 76px Oswald, Impact, sans-serif'; x.fillText('DRIVE THRU', 256, 94) } })
    for (const e of [-1, 1]) { const [x, z] = at(6.5, e * (1.65 + 0.04)); plane(dt, x, lot + 0.9 * U, z, 0.95 * U, 0.24 * U, t + (e > 0 ? 0 : Math.PI), { emissive: '#ffffff', emissiveMap: dt, emissiveIntensity: 0.2 }) }
    // The lane: dark ceiling, a light, and the pickup window on the south side wall.
    { const [x, z] = at(6.5, 0); const ceil = new THREE.Mesh(new THREE.PlaneGeometry(1.0 * U, 3.3 * U), M('#4a4038', { side: THREE.DoubleSide })); ceil.rotation.set(Math.PI / 2, 0, -t); ceil.position.set(x, 0.8 * U - 0.02, z); g.add(ceil) }
    const win = label('', { w: 256, h: 192, draw: (x) => { x.fillStyle = '#2b2f31'; x.fillRect(0, 0, 256, 192); x.fillStyle = '#e8d9b8'; x.fillRect(14, 14, 228, 164); x.fillStyle = '#c9b48a'; x.fillRect(14, 120, 228, 58); x.fillStyle = green; x.fillRect(14, 14, 228, 26); x.fillStyle = '#fff'; x.font = 'bold 20px Oswald, sans-serif'; x.textAlign = 'center'; x.fillText('PICK UP HERE', 128, 34) } })
    { const [x, z] = at(6.0 + 0.012, -0.3); plane(win, x, lot + 1.75, z, 1.6, 1.2, t + Math.PI / 2) }
    // The barista, leaning out of the window.
    {
      const [x, z] = at(6.0 + 0.03, -0.3), b = new THREE.Group(); b.position.set(x, lot, z); b.rotation.y = t + Math.PI / 2; g.add(b) // standing in the window, not out in the lane
      const skin = M('#c98a6a'), apron = M(green), shirt = M('#2a2a2a'), hair = M('#3a2416')
      const add = (geo, mat, px, py, pz) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.castShadow = true; b.add(m); return m }
      add(new THREE.CylinderGeometry(0.2, 0.22, 0.6, 12), shirt, 0, 1.55, -0.05)
      add(new THREE.BoxGeometry(0.36, 0.5, 0.04), apron, 0, 1.5, 0.16)
      add(new THREE.SphereGeometry(0.15, 14, 12), skin, 0, 2.02, 0.02)
      add(new THREE.SphereGeometry(0.155, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), hair, 0, 2.05, 0)
      const bun = add(new THREE.SphereGeometry(0.08, 10, 8), hair, 0, 2.08, -0.15)
      const visor = add(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 14, 1, false, -1.1, 2.2), apron, 0, 2.1, 0.06)
      // One arm out over the sill with a coffee cup.
      const arm = add(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8), shirt, 0.18, 1.55, 0.25); arm.rotation.x = 1.25
      add(new THREE.CylinderGeometry(0.06, 0.045, 0.16, 10), M('#f4f1e8'), 0.18, 1.62, 0.5)
      add(new THREE.CylinderGeometry(0.062, 0.062, 0.02, 10), M('#4a3020'), 0.18, 1.71, 0.5)
      add(new THREE.BoxGeometry(1.6, 0.08, 0.32), M('#c9c2b0'), 0, 1.15, 0.16) // sill
    }
    // Menu board at the lane's back entrance.
    { const menu = label('', { w: 256, h: 384, draw: (x) => { x.fillStyle = '#1d2a24'; x.fillRect(0, 0, 256, 384); x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = 'bold 34px Oswald, sans-serif'; x.fillText('MEGABUCKS', 128, 50)
        x.font = '22px Oswald, sans-serif'; ['PUMPKIN SPICE  $9', 'TURKEY LATTE  $11', 'GRAVY MOCHA  $10', 'CRANBERRY COLD BREW $12', 'BLACK COFFEE  $8'].forEach((l, i) => x.fillText(l, 128, 110 + i * 52)) } })
      const [x, z] = at(6.0 - 0.15, -1.65 - 0.9); cyl(M('#2b2d31'), x, lot + 0.7, z, 0.06, 1.4, 6)
      plane(menu, x, lot + 1.9, z, 1.0, 1.5, t + Math.PI / 2 + 0.6) }
  }

  // The drive-thru's open north side: square stucco pillars on stone bases carry the roof over the lane.
  {
    const t = Math.atan2(0.968, -0.249), c = Math.cos(t), sn = Math.sin(t)
    const at = (lx, lz) => [(-93.25 + lx * c + lz * sn) * U, (364.09 - lx * sn + lz * c) * U]
    const lot = 0.045 * U, H = 0.8 * U
    for (const lz of [-1.45, 0, 1.45]) {
      const [x, z] = at(7.25, lz)
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.72, H, 0.72), M('#dcbf86', { roughness: 0.95 })); p.position.set(x, lot + H / 2, z); p.rotation.y = t; p.castShadow = true; p.receiveShadow = true; g.add(p)
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.9, 0.86), M('#b3a38b')); b.position.set(x, lot + 0.45, z); b.rotation.y = t; g.add(b)
      const k = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.14, 0.86), M('#cfb07a')); k.position.set(x, lot + H - 0.07, z); k.rotation.y = t; g.add(k)
    }
  }
  return g
}
