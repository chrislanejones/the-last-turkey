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
    const menu = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.5, 1.1), M('#2b2d31')); menu.position.set(-1.68 * U - 1.6, 1.3, 2.4); menu.castShadow = true; d.add(menu)
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
    for (const lx of [5.6, 6.6]) {
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
    // Bike rack with three bikes, right of the door.
    const bikeM = [M('#2f6fc4'), M('#c8302b'), M('#2b2d31')], tyre = M('#1b1b1b')
    for (let i = 0; i < 3; i++) {
      const [x, z] = gAt(6.35 + i * 0.13, 4.8 + 0.42), b = new THREE.Group(); b.position.set(x, lot + 0.06, z); b.rotation.y = t + 0.25; b.rotation.z = 0.12; g.add(b)
      for (const e of [-0.5, 0.5]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.03, 6, 16), tyre); w.rotation.y = Math.PI / 2; w.position.set(0, 0.36, e); b.add(w) }
      for (const [y, zz, len, rx] of [[0.62, 0, 0.95, Math.PI / 2], [0.5, -0.22, 0.6, 0.9], [0.5, 0.25, 0.62, -0.75], [0.85, 0.42, 0.5, 0]]) { const tb = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, len, 5), bikeM[i]); tb.position.set(0, y, zz); tb.rotation.x = rx; b.add(tb) }
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.25), tyre); seat.position.set(0, 0.92, -0.38); b.add(seat)
    }
    { const [x, z] = gAt(6.5, 4.8 + 0.28); const r = cyl(steel, x, lot + 0.45, z, 0.03, 1.7, 6); r.rotation.x = Math.PI / 2; r.rotation.z = -t }
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
    // The planted bed at the inside corner, with the pedestrian-crossing sign.
    { const bx = -87.7 * U, bz = 342.5 * U
      const bed = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.35, 0.22, 16), M('#d9d5c8')); bed.position.set(bx, lot + 0.11, bz); g.add(bed)
      const mulch = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.24, 16), M('#6b4f3a')); mulch.position.set(bx, lot + 0.12, bz); g.add(mulch)
      for (const [dx, dz, r] of [[0.4, 0.2, 0.5], [-0.4, 0.3, 0.45], [0, -0.45, 0.5]]) { const sh = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), M('#3f6b3a', { roughness: 1 })); sh.scale.y = 0.7; sh.position.set(bx + dx, lot + 0.45, bz + dz); sh.castShadow = true; g.add(sh) }
      cyl(steel, bx, lot + 1.3, bz, 0.035, 2.4, 6)
      const ped = label('', { w: 128, h: 128, bg: 'rgba(0,0,0,0)', draw: (c) => { c.clearRect(0, 0, 128, 128); c.fillStyle = '#f1c62f'; c.beginPath(); c.moveTo(64, 4); c.lineTo(124, 64); c.lineTo(64, 124); c.lineTo(4, 64); c.fill(); c.strokeStyle = '#111'; c.lineWidth = 4; c.stroke(); c.fillStyle = '#111'; c.beginPath(); c.arc(66, 36, 8, 0, 7); c.fill(); c.lineWidth = 8; c.lineCap = 'round'; c.beginPath(); c.moveTo(64, 48); c.lineTo(60, 76); c.lineTo(46, 100); c.moveTo(60, 76); c.lineTo(78, 98); c.moveTo(62, 54); c.lineTo(44, 68); c.moveTo(63, 54); c.lineTo(82, 66); c.stroke() } })
      for (const ry of [t, t + Math.PI]) plane(ped, bx, lot + 2.2, bz, 0.85, 0.85, ry, { transparent: true, alphaTest: 0.5, side: THREE.DoubleSide })
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
    const cols = ['#2f7d5a', '#2f6fc4', '#c8302b', '#2f7d5a', '#e8a020']
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
    for (const k of [10, 11]) { const [x, z] = strip.at(-7.35 + (k + 0.5) * bay, 1.65 - 0.75 + 0.06); plane(lattice, x, lot + 0.42 * U, z, bay * U - 1.7, 0.6 * U, strip.t) }
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
  return g
}
