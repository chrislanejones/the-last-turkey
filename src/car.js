// A '64 Ford Galaxie 500 style convertible, built in code. Car frame: +Z forward,
// +X is the driver's (left) side, Y up, meters, origin on the ground at mid-wheelbase.
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

export const CAR = {
  length: 5.45, width: 2.0, wheelbase: 3.0, track: 1.5, wheelR: 0.36,
  driverSeat: new THREE.Vector3(0.40, 0.80, -0.22),
  passengerSeat: new THREE.Vector3(-0.40, 0.80, -0.22),
}

export function makeMaterials(paintColor = '#8e1018') {
  return {
    paint: new THREE.MeshPhysicalMaterial({ color: paintColor, metalness: 0.35, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#f4f4f4', metalness: 1, roughness: 0.1 }),
    vinyl: new THREE.MeshStandardMaterial({ color: '#efe8d8', roughness: 0.55 }),
    vinylDark: new THREE.MeshStandardMaterial({ color: '#c9bfa9', roughness: 0.6 }),
    carpet: new THREE.MeshStandardMaterial({ color: '#5a1014', roughness: 1 }),
    dash: new THREE.MeshPhysicalMaterial({ color: paintColor, metalness: 0.2, roughness: 0.45, clearcoat: 0.6 }),
    black: new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.7 }),
    tire: new THREE.MeshStandardMaterial({ color: '#1b1b1b', roughness: 0.92 }),
    whitewall: new THREE.MeshStandardMaterial({ color: '#f2f0ea', roughness: 0.6 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#cfe6ee', metalness: 0, roughness: 0.02, transmission: 0, transparent: true, opacity: 0.28 }),
    headlight: new THREE.MeshStandardMaterial({ color: '#fff9e8', emissive: '#fff2cc', emissiveIntensity: 0.6, roughness: 0.15, metalness: 0.3 }),
    taillight: new THREE.MeshStandardMaterial({ color: '#c0141a', emissive: '#ff1d10', emissiveIntensity: 0.25, roughness: 0.25 }),
    gauge: new THREE.MeshStandardMaterial({ color: '#e9e2cc', roughness: 0.4, emissive: '#3a2a10', emissiveIntensity: 0.2 }),
    grille: new THREE.MeshStandardMaterial({ color: '#2a2a2a', metalness: 0.8, roughness: 0.35 }),
  }
}

/** A side profile drawn in (z, y) and extruded across the car to the given width at x center. */
function profile(points, width, xc, mat, { bevel = 0.025, holes = [] } = {}) {
  const s = new THREE.Shape()
  points.forEach((p, i) => {
    if (p.arc) { s.absarc(p.arc[0], p.arc[1], p.arc[2], p.arc[3], p.arc[4], p.arc[5]); return }
    i === 0 ? s.moveTo(p[0], p[1]) : s.lineTo(p[0], p[1])
  })
  for (const h of holes) s.holes.push(h)
  const depth = Math.max(0.001, width - bevel * 2)
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 18 })
  g.rotateY(-Math.PI / 2) // shape x -> car z, extrusion -> car -x
  g.translate(xc + depth / 2, 0, 0)
  g.computeVertexNormals()
  const m = new THREE.Mesh(g, mat)
  m.castShadow = m.receiveShadow = true
  return m
}

const rbox = (w, h, d, r, mat, x, y, z) => {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat)
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true
  return m
}
const cyl = (r0, r1, h, mat, seg = 24) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), mat); m.castShadow = true; return m }

/** The wheel-arch cut in a profile's bottom edge. */
const arch = (zc, r = 0.47) => ({ arc: [zc, 0.36, r, Math.PI, 0, true] })

function makeWheel(M) {
  const w = new THREE.Group()
  const spin = new THREE.Group(); w.add(spin)
  const tire = cyl(CAR.wheelR, CAR.wheelR, 0.22, M.tire, 32); tire.rotation.z = Math.PI / 2; spin.add(tire)
  // Rounded shoulders so the tread doesn't read as a flat-edged drum.
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Mesh(new THREE.TorusGeometry(CAR.wheelR - 0.035, 0.035, 8, 32), M.tire)
    shoulder.rotation.y = Math.PI / 2; shoulder.position.x = side * 0.075; spin.add(shoulder)
    const ww = new THREE.Mesh(new THREE.RingGeometry(0.245, 0.285, 40), M.whitewall)
    ww.position.x = side * 0.118; ww.rotation.y = side * Math.PI / 2; spin.add(ww)
    // A flat dog-dish hubcap that sits inside the tire's face, with lug slots so the roll shows.
    const cap = cyl(0.235, 0.245, 0.012, M.chrome, 28); cap.rotation.z = Math.PI / 2; cap.position.x = side * 0.122; spin.add(cap)
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.chrome)
    dish.rotation.z = -side * Math.PI / 2; dish.scale.y = 0.22; dish.position.x = side * 0.128; spin.add(dish)
    const dot = cyl(0.035, 0.035, 0.02, new THREE.MeshStandardMaterial({ color: '#b3161c', roughness: 0.4 }), 12); dot.rotation.z = Math.PI / 2; dot.position.x = side * 0.15; spin.add(dot)
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      const slot = rbox(0.012, 0.05, 0.022, 0.004, M.black, side * 0.128, Math.cos(a) * 0.17, Math.sin(a) * 0.17)
      slot.rotation.x = -a; slot.castShadow = false; spin.add(slot)
    }
  }
  return { group: w, spin }
}

export function buildGalaxie(paintColor) {
  const M = makeMaterials(paintColor)
  const car = new THREE.Group(); car.name = 'Galaxie'
  const body = new THREE.Group(); car.add(body) // body rolls and pitches on its springs
  const L2 = 2.72

  // Lower tub, under the floor: wheel wells cut in.
  // The floor pan in three pieces that stop at the wheel wells (a tire needs the space above it).
  body.add(profile([[-1.03, 0.33], [1.03, 0.33], [1.03, 0.48], [-1.03, 0.48]], 1.84, 0, M.paint))
  body.add(profile([[1.97, 0.33], [2.62, 0.33], [2.66, 0.48], [1.97, 0.48]], 1.84, 0, M.paint))
  body.add(profile([[-L2, 0.33], [-1.97, 0.33], [-1.97, 0.48], [-L2 + 0.02, 0.48]], 1.84, 0, M.paint))
  // Wheel wells: a dark tub inboard of each pair of tires.
  for (const z of [1.5, -1.5]) body.add(rbox(1.26, 0.56, 1.0, 0.02, M.black, 0, 0.58, z))
  // A thin tray beside the rear bench closes the top of each rear wheel well from inside the car.
  for (const side of [1, -1]) body.add(rbox(0.3, 0.03, 0.56, 0.01, M.black, side * 0.75, 0.87, -1.26))
  // Quarter panels / doors / fenders, each side, up to the beltline with the little '60s fin.
  for (const side of [1, -1]) {
    const pts = [[-L2 - 0.02, 0.36], [-1.97, 0.36], arch(-1.5), [1.03, 0.36], arch(1.5), [2.64, 0.36], [2.71, 0.62], [2.70, 0.84], [2.56, 0.915],
      [0.4, 0.935], [-1.9, 0.945], [-2.55, 0.975], [-L2 - 0.05, 0.99], [-L2 - 0.06, 0.62]]
    body.add(profile(pts, 0.11, side * 0.945, M.paint, { bevel: 0.03 }))
  }
  // Hood and front clip.
  const lift = Math.asin(0.1 / 0.47) // where a wheel arch meets the underside of the hood and trunk
  body.add(profile([[0.72, 0.46], [1.04, 0.46], { arc: [1.5, 0.36, 0.47, Math.PI - lift, lift, true] }, [2.6, 0.46], [2.68, 0.78], [2.58, 0.885], [1.6, 0.905], [0.72, 0.925]], 1.86, 0, M.paint, { bevel: 0.03 }))
  // Cowl and dash (its rear face is the dashboard).
  body.add(profile([[0.36, 0.46], [0.76, 0.46], [0.76, 0.93], [0.52, 0.975], [0.36, 0.93], [0.31, 0.80]], 1.78, 0, M.dash, { bevel: 0.03 }))
  // Rear deck and trunk lid.
  body.add(profile([[-1.48, 0.83], [-1.48, 0.955], [-2.5, 0.955], [-L2 - 0.02, 0.88], [-L2 - 0.03, 0.46], [-1.96, 0.46], { arc: [-1.5, 0.36, 0.47, Math.PI - lift, 1.528, true] }], 1.84, 0, M.paint, { bevel: 0.03 }))
  // Floor carpet and inner door panels.
  body.add(rbox(1.70, 0.04, 1.85, 0.015, M.carpet, 0, 0.485, -0.55))
  for (const side of [1, -1]) {
    body.add(rbox(0.05, 0.38, 1.46, 0.02, M.vinyl, side * 0.875, 0.73, -0.27))
    body.add(rbox(0.07, 0.035, 2.05, 0.015, M.chrome, side * 0.93, 0.955, -0.55)) // chrome door top
    body.add(rbox(0.012, 0.03, 4.9, 0.01, M.chrome, side * 1.003, 0.875, -0.08))   // side spear, above both wheel openings
    body.add(rbox(0.012, 0.045, 1.96, 0.01, M.chrome, side * 1.003, 0.40, 0))      // rocker trim, between the wheel arches only
  }

  // Bench seats, white pleated vinyl.
  const bench = (z, backH, w = 1.66) => {
    const g = new THREE.Group()
    g.add(rbox(w, 0.17, 0.58, 0.06, M.vinyl, 0, 0.62, z))
    const back = rbox(w, backH, 0.15, 0.06, M.vinyl, 0, 0.70 + backH / 2, z - 0.3)
    back.rotation.x = -0.2; g.add(back)
    for (let i = -3; i <= 3; i++) {
      if (Math.abs(i * 0.22) > w / 2 - 0.08) continue
      g.add(rbox(0.012, 0.012, 0.5, 0.004, M.vinylDark, i * 0.22, 0.708, z))
      const pleat = rbox(0.012, backH * 0.85, 0.012, 0.004, M.vinylDark, i * 0.22, 0.70 + backH / 2, z - 0.22)
      pleat.rotation.x = -0.2; g.add(pleat)
    }
    return g
  }
  body.add(bench(-0.20, 0.50))
  body.add(bench(-1.05, 0.44, 1.2)) // narrow: the rear wheel wells are either side of it
  // Top folded down under a white boot.
  body.add(rbox(1.74, 0.14, 0.42, 0.06, M.vinyl, 0, 0.99, -1.62))

  // Windshield: chrome frame, raked back.
  const ws = new THREE.Group(); ws.position.set(0, 0.95, 0.42); ws.rotation.x = -0.52; body.add(ws)
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.64, 0.44), M.glass); glass.position.y = 0.23; glass.rotation.y = Math.PI; ws.add(glass)
  ws.add(rbox(1.72, 0.035, 0.04, 0.012, M.chrome, 0, 0.465, 0))
  ws.add(rbox(1.72, 0.03, 0.04, 0.012, M.chrome, 0, 0.0, 0))
  for (const side of [1, -1]) ws.add(rbox(0.04, 0.48, 0.045, 0.015, M.chrome, side * 0.84, 0.235, 0))
  const mirror = rbox(0.18, 0.06, 0.03, 0.02, M.chrome, 0, 0.40, -0.06); ws.add(mirror)

  // Dash: gauge pod, chrome strip; the steering wheel is placed later at the driver's hands.
  body.add(rbox(0.46, 0.13, 0.06, 0.03, M.black, CAR.driverSeat.x, 0.88, 0.33))
  for (const dx of [-0.13, 0, 0.13]) {
    const g = cyl(0.045, 0.045, 0.02, M.gauge, 20); g.rotation.x = Math.PI / 2; g.position.set(CAR.driverSeat.x + dx, 0.885, 0.297); body.add(g)
  }
  body.add(rbox(1.7, 0.025, 0.025, 0.01, M.chrome, 0, 0.80, 0.31))
  const steering = new THREE.Group(); steering.name = 'steering'; body.add(steering)
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.016, 12, 48), M.vinyl); rim.castShadow = true
  const hub = cyl(0.045, 0.06, 0.05, M.chrome); hub.rotation.x = Math.PI / 2
  const horn = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.006, 6, 40, Math.PI), M.chrome)
  const wheelSpin = new THREE.Group(); wheelSpin.add(rim, hub, horn)
  for (const a of [0, 2.1, -2.1]) {
    const spoke = rbox(0.18, 0.018, 0.012, 0.005, M.chrome, Math.cos(a - Math.PI / 2) * 0.1, Math.sin(a - Math.PI / 2) * 0.1, 0)
    spoke.rotation.z = a - Math.PI / 2; wheelSpin.add(spoke)
  }
  steering.add(wheelSpin)
  const column = cyl(0.025, 0.03, 0.3, M.black); column.rotation.x = Math.PI / 2; column.position.z = 0.15; steering.add(column)
  steering.userData.spin = wheelSpin
  steering.userData.rim = rim

  // Nose: grille, quad headlights, bumper, hood ornament.
  body.add(rbox(1.62, 0.25, 0.05, 0.03, M.chrome, 0, 0.665, 2.69))
  body.add(rbox(1.54, 0.19, 0.04, 0.02, M.grille, 0, 0.665, 2.705))
  for (let i = 0; i < 6; i++) body.add(rbox(1.5, 0.008, 0.012, 0.003, M.chrome, 0, 0.59 + i * 0.03, 2.725))
  for (const side of [1, -1]) for (const dx of [0.6, 0.83]) {
    const bez = new THREE.Mesh(new THREE.TorusGeometry(0.083, 0.02, 10, 28), M.chrome); bez.position.set(side * dx, 0.70, 2.725); body.add(bez)
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.078, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.headlight)
    lamp.rotation.x = Math.PI / 2; lamp.scale.y = 0.35; lamp.position.set(side * dx, 0.70, 2.715); body.add(lamp)
  }
  body.add(rbox(2.04, 0.15, 0.2, 0.06, M.chrome, 0, 0.43, 2.76))
  for (const side of [1, -1]) body.add(rbox(0.12, 0.17, 0.12, 0.05, M.chrome, side * 0.55, 0.43, 2.86)) // bumper guards
  const orn = rbox(0.03, 0.05, 0.24, 0.012, M.chrome, 0, 0.925, 2.42); orn.rotation.x = 0.12; body.add(orn)

  // Tail: round taillights, bumper, chrome trunk trim, plate.
  for (const side of [1, -1]) for (const dx of [0.5, 0.76]) {
    const bez = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.018, 10, 28), M.chrome); bez.position.set(side * dx, 0.71, -L2 - 0.075); body.add(bez)
    const t = cyl(0.08, 0.08, 0.03, M.taillight, 28); t.rotation.x = Math.PI / 2; t.position.set(side * dx, 0.71, -L2 - 0.07); body.add(t)
  }
  body.add(rbox(1.9, 0.03, 0.03, 0.01, M.chrome, 0, 0.86, -L2 - 0.03))
  body.add(rbox(2.04, 0.15, 0.2, 0.06, M.chrome, 0, 0.43, -L2 - 0.06))
  const plateTex = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128
    const x = c.getContext('2d')
    x.fillStyle = '#f6f2e4'; x.fillRect(0, 0, 256, 128)
    x.fillStyle = '#1e5a3a'; x.font = 'bold 22px sans-serif'; x.textAlign = 'center'; x.fillText('FLORIDA', 128, 30)
    x.fillStyle = '#c0471a'; x.font = 'bold 64px sans-serif'; x.fillText('CLJ 64', 128, 98)
    x.fillStyle = '#1e5a3a'; x.font = '15px sans-serif'; x.fillText('Sunshine State', 128, 120)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
  })()
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.155), new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.5 }))
  plate.position.set(0, 0.6, -L2 - 0.08); plate.rotation.y = Math.PI; body.add(plate)
  // Two bumper stickers either side of the plate.
  const sticker = (draw, x) => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128
    draw(c.getContext('2d'))
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.09), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }))
    m.position.set(x, 0.56, -L2 - 0.079); m.rotation.y = Math.PI; body.add(m)
  }
  // On the car's left (driver's side, +x) seen from behind it reads on the right; plates face -z.
  sticker((x) => {
    x.fillStyle = '#14306b'; x.fillRect(0, 0, 512, 128); x.fillStyle = '#ffffff'; x.fillRect(8, 8, 496, 112); x.fillStyle = '#14306b'; x.fillRect(16, 16, 480, 96)
    x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.font = 'bold 64px Oswald, Impact, sans-serif'; x.fillText('VOTE GEORGE', 256, 86)
  }, 0.38)
  sticker((x) => {
    x.fillStyle = '#f4f1e8'; x.fillRect(0, 0, 512, 128); x.fillStyle = '#c8302b'; x.fillRect(0, 0, 512, 14); x.fillRect(0, 114, 512, 14)
    x.fillStyle = '#111'; x.textAlign = 'center'; x.font = 'bold 44px Oswald, Impact, sans-serif'; x.fillText('PUBLIC RADIO FOOLS', 256, 62)
    x.fillStyle = '#c8302b'; x.font = 'bold 38px Oswald, Impact, sans-serif'; x.fillText('WPPR', 256, 104)
  }, -0.38)
  const antenna = cyl(0.004, 0.006, 0.9, M.chrome, 6); antenna.position.set(-0.85, 1.4, 1.2); antenna.rotation.x = -0.12; body.add(antenna)

  // --- Trim and detail, after Chris's reference photos -----------------------------------------
  const seam = new THREE.MeshStandardMaterial({ color: '#3a0508', roughness: 0.9 })
  const amber = new THREE.MeshStandardMaterial({ color: '#f0a020', emissive: '#f08a00', emissiveIntensity: 0.3 })
  for (const side of [1, -1]) {
    const x = side * 1.004
    for (const z of [0.36, -0.82]) body.add(rbox(0.008, 0.5, 0.014, 0.003, seam, x, 0.68, z))       // door cut lines
    body.add(rbox(0.008, 0.012, 1.18, 0.003, seam, x, 0.435, -0.23))
    body.add(rbox(0.03, 0.022, 0.13, 0.008, M.chrome, x + side * 0.012, 0.8, -0.66))                // door handle
    body.add(rbox(0.014, 0.026, 1.9, 0.008, M.chrome, x, 0.64, 0))                                   // lower side spear, between the wheels
    for (let i = 0; i < 5; i++) body.add(rbox(0.014, 0.085, 0.016, 0.004, M.chrome, x, 0.68, -2.3 - i * 0.045)) // quarter-panel hash marks
    body.add(rbox(0.03, 0.03, 0.42, 0.012, M.chrome, side * 0.8, 0.925, 2.0))                        // fender-top wind splits
    const wiper = rbox(0.5, 0.012, 0.02, 0.005, M.black, side * 0.36, 0.992, 0.5); wiper.rotation.y = side * 0.22; body.add(wiper)
    body.add(rbox(0.15, 0.05, 0.02, 0.008, amber, side * 0.62, 0.43, 2.865))                         // parking lamps in the bumper
    const pipe = cyl(0.04, 0.04, 0.24, M.chrome, 10); pipe.rotation.x = Math.PI / 2; pipe.position.set(side * 0.55, 0.3, -L2 - 0.08); body.add(pipe)
    const vent = rbox(0.02, 0.36, 0.02, 0.006, M.chrome, side * 0.86, 1.1, 0.12); vent.rotation.x = 0.12; body.add(vent) // vent-window post
    const ventTop = rbox(0.02, 0.02, 0.36, 0.006, M.chrome, side * 0.86, 1.25, 0.26); ventTop.rotation.x = 0.5; body.add(ventTop)
  }
  // Driver's mirror, hood and trunk center creases, grille badge and mesh, trunk lock, taillight centers.
  body.add(rbox(0.02, 0.1, 0.02, 0.006, M.chrome, 1.02, 0.99, 0.2))
  const mirror2 = cyl(0.075, 0.075, 0.03, M.chrome, 16); mirror2.rotation.x = Math.PI / 2; mirror2.position.set(1.04, 1.07, 0.2); body.add(mirror2)
  const crease = rbox(0.045, 0.016, 1.8, 0.006, M.paint, 0, 0.912, 1.62); crease.rotation.x = 0.0115; body.add(crease)
  body.add(rbox(0.045, 0.016, 1.0, 0.006, M.paint, 0, 0.962, -2.0))
  const mesh = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 32
    const x = c.getContext('2d'); x.fillStyle = '#17181a'; x.fillRect(0, 0, 256, 32)
    x.strokeStyle = '#cfd3d6'; x.lineWidth = 1.5
    for (let i = 0; i <= 256; i += 8) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 32); x.stroke() }
    for (let j = 0; j <= 32; j += 8) { x.beginPath(); x.moveTo(0, j); x.lineTo(256, j); x.stroke() }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t
  })()
  const meshPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.52, 0.19), new THREE.MeshStandardMaterial({ map: mesh, metalness: 0.7, roughness: 0.35 })); meshPlane.position.set(0, 0.665, 2.734); body.add(meshPlane)
  body.add(rbox(0.26, 0.05, 0.03, 0.012, M.chrome, 0, 0.665, 2.745))
  body.add(rbox(0.07, 0.035, 0.02, 0.008, new THREE.MeshStandardMaterial({ color: '#b3161c' }), 0, 0.665, 2.762))
  const lock = cyl(0.022, 0.022, 0.02, M.chrome, 10); lock.rotation.x = Math.PI / 2; lock.position.set(0, 0.76, -L2 - 0.045); body.add(lock)
  for (const side of [1, -1]) for (const dx of [0.5, 0.76]) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), M.chrome); c.position.set(side * dx, 0.71, -L2 - 0.088); body.add(c) }

  // Wheels (outside the body so they don't roll with it).
  const wheels = []
  for (const [x, z, front] of [[CAR.track / 2, CAR.wheelbase / 2, true], [-CAR.track / 2, CAR.wheelbase / 2, true], [CAR.track / 2, -CAR.wheelbase / 2, false], [-CAR.track / 2, -CAR.wheelbase / 2, false]]) {
    const w = makeWheel(M); w.group.position.set(x, CAR.wheelR, z); car.add(w.group)
    wheels.push({ ...w, front })
  }
  // Soft contact shadow.
  const blob = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128
    const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 10, 64, 64, 64)
    g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)')
    x.fillStyle = g; x.fillRect(0, 0, 128, 128)
    return new THREE.CanvasTexture(c)
  })()
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 6.2), new THREE.MeshBasicMaterial({ map: blob, transparent: true, depthWrite: false }))
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02; shadow.renderOrder = 1; car.add(shadow)

  return { car, body, wheels, steering, M }
}

// --- The rival's SUV: a boxy '70s wagon, every side window down so you can see the driver. ---
export const SUV = { driverSeat: new THREE.Vector3(0.40, 0.93, -0.12), half: 1.25 }
export function buildSUV(paintColor = '#7d8a3c') {
  const M = makeMaterials(paintColor)
  const wood = new THREE.MeshStandardMaterial({ color: '#8a5a33', roughness: 0.7 })
  const seatM = new THREE.MeshStandardMaterial({ color: '#b08a5a', roughness: 0.7 })
  const car = new THREE.Group(); car.name = 'SUV'
  const body = new THREE.Group(); car.add(body)
  const A = (z) => arch(z, 0.48)
  body.add(profile([[-0.92, 0.4], [0.92, 0.4], [0.92, 0.7], [-0.92, 0.7]], 1.7, 0, M.paint))
  body.add(profile([[1.88, 0.4], [2.28, 0.4], [2.34, 0.86], [1.88, 0.86]], 1.7, 0, M.paint))
  body.add(profile([[-2.3, 0.4], [-1.88, 0.4], [-1.88, 0.7], [-2.3, 0.7]], 1.7, 0, M.paint))
  for (const z of [1.4, -1.4]) { body.add(rbox(1.2, 0.5, 0.98, 0.02, M.black, 0, 0.56, z)); body.add(rbox(1.76, 0.04, 0.98, 0.01, M.black, 0, 0.76, z)) }
  for (const side of [1, -1]) {
    body.add(profile([[-2.32, 0.42], [-1.88, 0.42], A(-1.4), [0.92, 0.42], A(1.4), [2.3, 0.42], [2.36, 0.62], [2.36, 1.0], [2.25, 1.08], [-2.3, 1.1], [-2.36, 1.0]], 0.1, side * 0.9, M.paint, { bevel: 0.03 }))
    body.add(rbox(0.02, 0.18, 3.3, 0.008, wood, side * 0.962, 0.95, -0.35)) // proud of the door skin, above both wheel arches
    for (const y of [0.85, 1.05]) body.add(rbox(0.024, 0.02, 3.34, 0.006, M.chrome, side * 0.968, y, -0.35))
    // Pillars only: no glass in any side opening.
    for (const z of [-0.3, -1.3, -2.26]) body.add(rbox(0.08, 0.74, 0.1, 0.02, M.paint, side * 0.9, 1.45, z))
    const a = rbox(0.08, 0.8, 0.08, 0.02, M.paint, side * 0.9, 1.44, 0.78); a.rotation.x = -0.44; body.add(a)
    body.add(rbox(0.03, 0.03, 2.3, 0.01, M.chrome, side * 0.72, 1.92, -0.85)) // roof rack rails
    body.add(rbox(0.1, 0.3, 0.04, 0.01, M.taillight, side * 0.84, 0.86, -2.375))
    const bez = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.02, 8, 24), M.chrome); bez.position.set(side * 0.66, 0.84, 2.385); body.add(bez)
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.095, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.headlight)
    lamp.rotation.x = Math.PI / 2; lamp.scale.y = 0.35; lamp.position.set(side * 0.66, 0.84, 2.375); body.add(lamp)
    const mir = rbox(0.14, 0.1, 0.04, 0.02, M.chrome, side * 1.03, 1.16, 0.7); body.add(mir)
  }
  body.add(profile([[0.85, 0.86], [2.3, 0.86], [2.34, 1.0], [2.22, 1.07], [0.85, 1.1]], 1.72, 0, M.paint, { bevel: 0.03 }))
  body.add(rbox(1.72, 0.66, 0.1, 0.03, M.paint, 0, 0.77, -2.29))
  body.add(rbox(1.66, 0.04, 3.0, 0.01, M.black, 0, 0.71, -0.7))
  for (const z of [-0.15, -1.15]) {
    body.add(rbox(1.52, 0.14, 0.5, 0.05, seatM, 0, 0.78, z))
    const back = rbox(1.52, 0.6, 0.13, 0.05, seatM, 0, 1.14, z - 0.3); back.rotation.x = -0.15; body.add(back)
  }
  body.add(rbox(1.7, 0.18, 0.32, 0.04, M.black, 0, 1.03, 0.72))
  body.add(rbox(1.9, 0.08, 3.1, 0.03, M.paint, 0, 1.85, -0.83))
  for (const z of [-1.8, -0.85, 0.1]) body.add(rbox(1.5, 0.025, 0.04, 0.01, M.chrome, 0, 1.92, z))
  // The windshield is the one piece of glass left.
  const ws = new THREE.Group(); ws.position.set(0, 1.1, 0.95); ws.rotation.x = -0.44; body.add(ws)
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.74), M.glass); glass.position.y = 0.38; glass.rotation.y = Math.PI; ws.add(glass)
  body.add(rbox(1.46, 0.3, 0.05, 0.02, M.grille, 0, 0.84, 2.365))
  for (let i = 0; i < 5; i++) body.add(rbox(1.0, 0.01, 0.012, 0.003, M.chrome, 0, 0.74 + i * 0.05, 2.395))
  for (const z of [2.42, -2.4]) body.add(rbox(1.96, 0.14, 0.16, 0.05, M.chrome, 0, 0.48, z))
  // --- Realism pass: seams, handles, flares, a spare, a loaded roof rack, lamps, plates, wear ---
  const seam = new THREE.MeshStandardMaterial({ color: '#2f3518', roughness: 0.9 })
  const amber = new THREE.MeshStandardMaterial({ color: '#f0a020', emissive: '#f08a00', emissiveIntensity: 0.3 })
  const flare = new THREE.MeshStandardMaterial({ color: '#1c1d1f', roughness: 0.85 })
  const mud = new THREE.MeshStandardMaterial({ color: '#6b5a40', roughness: 1, transparent: true, opacity: 0.55, depthWrite: false })
  const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t }
  for (const side of [1, -1]) {
    // Each layer sits a few millimetres outside the one under it, so nothing shares a surface.
    const x = side * 0.978
    for (const z of [0.86, -0.3, -1.3]) body.add(rbox(0.008, 0.62, 0.014, 0.003, seam, x, 0.76, z))           // door cuts
    for (const z of [0.6, -0.55]) body.add(rbox(0.03, 0.025, 0.14, 0.008, M.chrome, x + side * 0.012, 1.02, z - 0.75)) // handles
    body.add(rbox(0.03, 0.03, 3.1, 0.01, M.chrome, side * 0.95, 1.115, -0.72))                                 // window sill trim
    body.add(rbox(0.05, 0.035, 3.2, 0.012, M.paint, side * 0.92, 1.8, -0.75))                                  // drip rail
    for (const z of [1.4, -1.4]) {                                                                              // fender flares and mud
      const f = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.045, 6, 18, Math.PI), flare); f.rotation.y = Math.PI / 2; f.position.set(side * 0.955, 0.36, z); body.add(f)
      const flap = rbox(0.03, 0.26, 0.02, 0.005, flare, side * 0.86, 0.3, z - 0.52); body.add(flap)
      const splat = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.34), mud); splat.rotation.y = side * Math.PI / 2; splat.position.set(side * 0.985, 0.55, z - 0.72); body.add(splat)
    }
    body.add(rbox(0.1, 0.05, 1.8, 0.02, flare, side * 0.93, 0.36, 0))                                          // rock rail
    body.add(rbox(0.02, 0.05, 0.1, 0.008, amber, x, 0.9, 2.2)); body.add(rbox(0.02, 0.05, 0.1, 0.008, M.taillight, x, 0.9, -2.2)) // side markers
    body.add(rbox(0.16, 0.07, 0.03, 0.01, amber, side * 0.66, 0.66, 2.385))                                     // turn signals
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 6, 12), M.taillight); hook.position.set(side * 0.5, 0.42, 2.51); hook.rotation.x = Math.PI / 2; body.add(hook)
    const wiper = rbox(0.55, 0.012, 0.02, 0.005, M.black, side * 0.38, 1.14, 0.98); wiper.rotation.y = side * 0.2; body.add(wiper)
  }
  // Hood bulge, grille surround, antenna, dash top and mirror.
  body.add(rbox(0.7, 0.03, 1.2, 0.012, M.paint, 0, 1.095, 1.6))
  body.add(rbox(1.56, 0.36, 0.03, 0.02, M.chrome, 0, 0.84, 2.35))
  const ant = cyl(0.005, 0.007, 1.0, M.chrome, 6); ant.position.set(-0.8, 1.6, 1.0); body.add(ant)
  body.add(rbox(0.2, 0.07, 0.03, 0.02, M.chrome, 0, 1.72, 0.72))
  // Spare tire on the tailgate, under a tan cover.
  const spare = cyl(0.38, 0.38, 0.2, M.tire, 24); spare.rotation.x = Math.PI / 2; spare.position.set(0.25, 1.0, -2.47); body.add(spare)
  const cover = cyl(0.33, 0.36, 0.06, new THREE.MeshStandardMaterial({ color: '#c9b58a', roughness: 0.9 }), 24); cover.rotation.x = Math.PI / 2; cover.position.set(0.25, 1.0, -2.59); body.add(cover)
  // Plates and a bumper sticker.
  const plate = (text) => tex(256, 128, (x) => { x.fillStyle = '#f6f2e4'; x.fillRect(0, 0, 256, 128); x.fillStyle = '#1e5a3a'; x.font = 'bold 22px sans-serif'; x.textAlign = 'center'; x.fillText('FLORIDA', 128, 28); x.fillStyle = '#c0471a'; x.font = 'bold 58px sans-serif'; x.fillText(text, 128, 96) })
  const pm = new THREE.MeshStandardMaterial({ map: plate('GOBBL3'), roughness: 0.5 })
  const fp = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), pm); fp.position.set(0, 0.48, 2.505); body.add(fp)
  const rp = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), pm); rp.position.set(-0.5, 0.62, -2.345); rp.rotation.y = Math.PI; body.add(rp)
  const sticker = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.11), new THREE.MeshStandardMaterial({ map: tex(256, 64, (x) => { x.fillStyle = '#fff'; x.fillRect(0, 0, 256, 64); x.fillStyle = '#c8302b'; x.font = 'bold 34px sans-serif'; x.textAlign = 'center'; x.fillText('I BRAKE 4 PIE', 128, 44) }) }))
  sticker.position.set(-0.5, 0.86, -2.345); sticker.rotation.y = Math.PI; body.add(sticker)
  // Roof rack load: a cooler, a duffel under a strap, a folded chair.
  body.add(rbox(0.7, 0.36, 0.45, 0.04, new THREE.MeshStandardMaterial({ color: '#2f6fc4', roughness: 0.6 }), -0.25, 2.12, -0.3))
  body.add(rbox(0.72, 0.06, 0.47, 0.02, new THREE.MeshStandardMaterial({ color: '#f2f0ea', roughness: 0.6 }), -0.25, 2.32, -0.3))
  const duffel = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.9, 4, 10), new THREE.MeshStandardMaterial({ color: '#7a5a3a', roughness: 0.95 })); duffel.rotation.x = Math.PI / 2; duffel.position.set(0.3, 2.13, -1.1); duffel.castShadow = true; body.add(duffel)
  for (const z of [-0.8, -1.4]) body.add(rbox(0.5, 0.42, 0.04, 0.01, M.black, 0.3, 2.13, z))
  body.add(rbox(0.5, 0.06, 0.9, 0.02, new THREE.MeshStandardMaterial({ color: '#c8302b', roughness: 0.8 }), -0.3, 1.98, -1.25))

  // The paper grocery bag riding shotgun, full of cranberry sauce.
  const bag = new THREE.Group(); bag.position.set(-0.4, 0.86, -0.12); body.add(bag)
  const paper = new THREE.MeshStandardMaterial({ color: '#b58a55', roughness: 1 })
  const sack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.3), paper); sack.position.y = 0.25; sack.castShadow = true; bag.add(sack)
  for (const [x, z, t] of [[-0.21, 0, 0.12], [0.21, 0, -0.12]]) { const fold = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.16, 0.3), paper); fold.position.set(x, 0.56, z); fold.rotation.z = t; bag.add(fold) }
  const tin = new THREE.MeshStandardMaterial({ color: '#7a1230', roughness: 0.4, metalness: 0.3 }), lid = new THREE.MeshStandardMaterial({ color: '#c9cdd0', metalness: 0.9, roughness: 0.3 })
  for (const [x, z, r] of [[-0.1, -0.05, 0.3], [0.08, 0.05, -0.4], [0.0, -0.02, 1.2], [0.12, -0.08, 0.1]]) {
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.17, 10), [tin, lid, lid]); can.position.set(x, 0.55, z); can.rotation.set(r * 0.4, 0, r * 0.5); bag.add(can)
  }
  const steering = new THREE.Group(); body.add(steering)
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.016, 10, 36), M.black), spin = new THREE.Group(); spin.add(rim)
  const column = cyl(0.025, 0.03, 0.3, M.black); column.rotation.x = Math.PI / 2; column.position.z = 0.15
  steering.add(spin, column); steering.userData = { spin, rim }
  const wheels = []
  for (const [x, z, front] of [[0.76, 1.4, true], [-0.76, 1.4, true], [0.76, -1.4, false], [-0.76, -1.4, false]]) {
    // Chunkier blackwall tires on painted steel wheels.
    const w = makeWheel(M); w.group.scale.set(1.15, 1.1, 1.1); w.group.position.set(x, CAR.wheelR * 1.1, z); car.add(w.group); wheels.push({ ...w, front })
    w.spin.traverse((m) => { if (m.geometry?.type === 'RingGeometry') m.visible = false })
  }
  body.position.y = 0; car.userData.lift = 0.04
  return { car, body, wheels, steering, M }
}
