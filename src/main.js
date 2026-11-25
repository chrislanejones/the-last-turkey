import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { Sky } from 'three/examples/jsm/objects/Sky.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { buildGalaxie, buildSUV, CAR, SUV } from './car.js'
import { dressStation } from './station.js'
import BILLBOARD from './billboard-img.js'

import DATA from './plaza-data.json'

// The arena is the wedge between A1A S and A1A Beach Blvd in chrislanejones/3d-world:
// the Square K gas station at the south tip, "publick" and its lot to the north.
// One town unit is 13.4 ft; everything here is meters, in the town's own coordinates.
const U = DATA.unit
const GY = 0.045 * U + 0.005 // top of the lot's asphalt: tires rest here
const V2 = THREE.Vector2, V3 = THREE.Vector3
const u2 = (x, z) => new V2(x * U, z * U)
// The grocery: center, a = along the front, n = the way the front faces (south-east).
const G = u2(-93.41, 345.63), GA = new V2(0.6, -0.8), GN = new V2(0.8, 0.6)
const gAt = (lx, lz) => G.clone().addScaledVector(GA, lx * U).addScaledVector(GN, lz * U)
const DOOR = gAt(4.9, 4.8 + 2.3)      // where the last turkey is handed out
const PEDESTAL = gAt(4.9, 4.8 + 1.15)
const ZONE_R = 6.5
// The two drivers are next-door neighbors on Floridian Ave, west of Rosewood St: two of the map's
// own houses. Both cars start nose-in on their driveways (the map's drives) and have to back out.
const driveNear = (hx) => DATA.drives.filter((d) => d[1] / U < 388.5 && d[1] / U > 386).reduce((b, d) => (Math.abs(d[0] / U - hx) < Math.abs(b[0] / U - hx) ? d : b))
const HOME = { me: driveNear(-115.34), them: driveNear(-118.84) }
const P_START = { pos: new V2(HOME.me[0], HOME.me[1]), heading: Math.PI }
const R_START = { pos: new V2(HOME.them[0], HOME.them[1] + 0.3), heading: Math.PI }
// The wagon's way: down the street to A1A S, south past the wall to the station's tip, north up the
// west side of the station and round the back of the Square K, through the gap by the bank, up the lot.
const PATH = [u2(-113.5, 389.3), u2(-105, 389.2), u2(-97.5, 389.6), u2(-94.4, 390.4), u2(-93.6, 392.8), u2(-91.3, 394.0), u2(-90.7, 391.2), u2(-91.2, 386.5), u2(-91.0, 384.3), u2(-90.4, 383.3), u2(-86.4, 383.3), u2(-85.3, 380.6), u2(-84.8, 377.4), u2(-84.7, 375), u2(-84.75, 370.5), u2(-84.8, 364)]
// The pump apron is a slab a little higher than the lot.
const APRON = { x0: -91.6 * U, x1: -85.4 * U, z0: 386.9 * U, z1: 393.1 * U, y: 0.065 * U + 0.005 }
const groundAt = (p) => (p.x > APRON.x0 && p.x < APRON.x1 && p.y > APRON.z0 && p.y < APRON.z1 ? APRON.y : GY)
const WAYPOINTS = [u2(-79.4, 349.5), u2(-77.5, 343.8), u2(-88.4, 357), u2(-84.8, 366), u2(-81.2, 358)]

// A1A S along the west side (both carriageways and the median), blocked at the same two places.
const ROAD_W = [[-90.96, 395.5], [-92.44, 390.15], [-95.5, 378.85], [-99.18, 365.1], [-101.31, 357.12], [-104.07, 346.83], [-105.6, 341]]
const $ = (id) => document.getElementById(id)
const params = new URLSearchParams(location.search)

// --- renderer, scene, sky ---------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: params.has('shot') })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 0.6
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
$('stage').appendChild(renderer.domElement)

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.3, 1500)

// Morning sun from the south-east, onto the store front.
const sunDir = new V3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 34), THREE.MathUtils.degToRad(62))
const makeSky = () => {
  const sky = new Sky(); sky.scale.setScalar(10000)
  const u = sky.material.uniforms
  u.turbidity.value = 2.6; u.rayleigh.value = 1.5; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.86
  u.sunPosition.value.copy(sunDir)
  return sky
}
scene.background = new THREE.Color('#bcd6e6') // plain sky; the Sky shader only lights the chrome
const pmrem = new THREE.PMREMGenerator(renderer)
const envScene = new THREE.Scene(); envScene.add(makeSky())
scene.environment = pmrem.fromScene(envScene, 0, 0.1, 20000).texture
scene.environmentIntensity = 0.75
scene.fog = new THREE.Fog('#bcd6e6', 120, 420)

scene.add(new THREE.HemisphereLight('#d6e6ff', '#8c8468', 1.2))
const sun = new THREE.DirectionalLight('#fff1dc', 3.4)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, near: 1, far: 400 })
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03
scene.add(sun, sun.target)

const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshStandardMaterial({ color: '#8fa07a', roughness: 1 }))
ground.rotation.x = -Math.PI / 2; ground.position.set(G.x, 0.02, G.y); ground.receiveShadow = true; scene.add(ground)

// --- loading (models ship as base64 modules: the host serves no .glb/.fbx) -----------------
const gltf = new GLTFLoader(); gltf.setMeshoptDecoder(MeshoptDecoder)
const fbx = new FBXLoader()
let loaded = 0
const bytes = async (name) => {
  const b64 = (await import(new URL(`assets/${name}.js`, import.meta.url).href)).default
  const out = Uint8Array.fromBase64 ? Uint8Array.fromBase64(b64) : Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  $('bar').style.width = `${(++loaded / 4) * 100}%`
  return out.buffer
}
const parseGltf = (buf) => new Promise((res, rej) => gltf.parse(buf, '', res, rej))
const [world, chrisGltf, drivingFbx, womanGltf] = await Promise.all([
  bytes('plaza-glb').then(parseGltf),
  bytes('chrislanejones-glb').then(parseGltf),
  bytes('CLJDriving-fbx').then((b) => fbx.parse(b, '')),
  bytes('golf-woman-glb').then(parseGltf),
])
world.scene.traverse((o) => {
  if (!o.isMesh) return
  o.castShadow = o.name !== 'ground'
  o.receiveShadow = true
})
scene.add(world.scene)
const dressing = dressStation(scene, U, APRON.y)

const BB_POLES = [], BB_VIEW = {}
// "Call Christy Homes" billboard hugging the lot's west barrier north of Bumpkin', facing the road and Floridian.
{
  const bb = new THREE.Group(); bb.position.set(-92.42 * U, 0, 377.5 * U); bb.rotation.y = Math.atan2(-0.962, 0.273) + Math.PI / 2; scene.add(bb)
  const W = 12, H = W * 476 / 1024, base = 4.2
  const tex = new THREE.TextureLoader().load(BILLBOARD); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4
  const dark = new THREE.MeshStandardMaterial({ color: '#23262b', roughness: 0.7, metalness: 0.3 })
  const face = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.12 }))
  face.position.set(0, base + H / 2, 0.16); bb.add(face)
  const frame = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, H + 0.4, 0.3), dark); frame.position.set(0, base + H / 2, 0); frame.castShadow = true; bb.add(frame)
  const catwalk = new THREE.Mesh(new THREE.BoxGeometry(W + 0.6, 0.08, 0.9), dark); catwalk.position.set(0, base - 0.25, 0.5); bb.add(catwalk)
  for (const x of [-W / 2 + 0.3, W / 2 - 0.3]) { // poles at the ends so cars drive under
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, base + H / 2, 10), dark); pole.position.set(x, (base + H / 2) / 2, -0.25); pole.castShadow = true; bb.add(pole)
    bb.updateMatrixWorld(true); const wp = pole.getWorldPosition(new THREE.Vector3()); BB_POLES.push([wp.x, wp.z])
  }
  bb.updateMatrixWorld(true); BB_VIEW.look = bb.localToWorld(new THREE.Vector3(0, base + H / 2, 0)); BB_VIEW.pos = bb.localToWorld(new THREE.Vector3(0, base + H / 2 - 1.2, 14))
  for (let i = 0; i < 4; i++) {
    const x = -W / 2 + W * (i + 0.5) / 4
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.1), dark); arm.position.set(x, base + H + 0.35, 0.45); bb.add(arm)
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, 0.35), dark); lamp.position.set(x, base + H + 0.35, 1.0); bb.add(lamp)
  }
}

// --- the big sign, the turkey, the marker -----------------------------------------------
function turkeyArt(x, cx, cy, s) {
  const feathers = ['#b5651d', '#e0a030', '#7a3b12', '#f0c060', '#b5651d', '#e0a030', '#7a3b12']
  feathers.forEach((c, i) => {
    const a = -Math.PI + (i + 0.5) * (Math.PI / feathers.length)
    x.save(); x.translate(cx, cy); x.rotate(a + Math.PI / 2); x.fillStyle = c
    x.beginPath(); x.ellipse(0, -s * 0.95, s * 0.2, s * 0.62, 0, 0, Math.PI * 2); x.fill(); x.restore()
  })
  x.fillStyle = '#5b3418'; x.beginPath(); x.ellipse(cx, cy + s * 0.1, s * 0.62, s * 0.55, 0, 0, Math.PI * 2); x.fill()
  x.fillStyle = '#6e4220'; x.beginPath(); x.ellipse(cx, cy - s * 0.5, s * 0.24, s * 0.3, 0, 0, Math.PI * 2); x.fill()
  x.fillStyle = '#fff'; for (const e of [-1, 1]) { x.beginPath(); x.arc(cx + e * s * 0.09, cy - s * 0.56, s * 0.065, 0, 7); x.fill() }
  x.fillStyle = '#111'; for (const e of [-1, 1]) { x.beginPath(); x.arc(cx + e * s * 0.09, cy - s * 0.55, s * 0.03, 0, 7); x.fill() }
  x.fillStyle = '#f2b01e'; x.beginPath(); x.moveTo(cx - s * 0.07, cy - s * 0.46); x.lineTo(cx + s * 0.07, cy - s * 0.46); x.lineTo(cx, cy - s * 0.32); x.fill()
  x.fillStyle = '#d2281e'; x.beginPath(); x.ellipse(cx + s * 0.05, cy - s * 0.3, s * 0.05, s * 0.12, 0.2, 0, 7); x.fill()
}
const signTex = (() => {
  const c = document.createElement('canvas'); c.width = 1536; c.height = 512
  const x = c.getContext('2d')
  x.fillStyle = '#f7e9c4'; x.fillRect(0, 0, 1536, 512)
  x.fillStyle = '#c8302b'; x.fillRect(0, 0, 1536, 26); x.fillRect(0, 486, 1536, 26)
  x.strokeStyle = '#2f7d32'; x.lineWidth = 10; x.strokeRect(40, 48, 1456, 416)
  turkeyArt(x, 250, 310, 150)
  x.textAlign = 'center'; x.fillStyle = '#2f7d32'
  { let px = 92; do { x.font = `700 ${px}px Oswald, Impact, sans-serif`; px -= 4 } while (x.measureText('THANKSGIVING ALERT').width > 1010); x.fillText('THANKSGIVING ALERT', 950, 150) }
  // Shrink to fit whatever font the browser ends up with, so nothing runs off the banner.
  const fit = (t, px, y, max) => { do { x.font = `700 ${px}px Oswald, Impact, sans-serif`; px -= 4 } while (x.measureText(t).width > max); x.fillText(t, 950, y) }
  x.fillStyle = '#c8302b'; fit('ONLY 1 TURKEY', 172, 310, 1010); fit('LEFT!', 172, 450, 1010)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t
})()
{
  // Draped across the store front, sagging between its ropes.
  const W = 7.8, H = 2.6, geo = new THREE.PlaneGeometry(W, H, 24, 6), pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / (W / 2), y = pos.getY(i) / (H / 2)
    pos.setY(i, pos.getY(i) - (1 - x * x) * 0.22 * (0.6 + 0.4 * (1 - y) / 2))
    pos.setZ(i, Math.sin(x * 5) * 0.05 + (1 - x * x) * 0.1 * (1 - y) / 2)
  }
  geo.computeVertexNormals()
  const sign = new THREE.Group()
  const face = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.75, side: THREE.DoubleSide }))
  face.castShadow = true; sign.add(face)
  const rope = new THREE.MeshStandardMaterial({ color: '#d8d2c0' })
  for (const e of [-1, 1]) for (const v of [-1, 1]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 5), rope); r.position.set(e * (W / 2 + 0.3), v * (H / 2 - 0.05) + v * 0.2, -0.1); r.rotation.z = -e * v * 0.9; sign.add(r) }
  const at = gAt(-0.6, 4.8 + 0.38 + 0.07) // on the name bay, right under "publick"
  sign.position.set(at.x, 2.0, at.y); sign.rotation.y = Math.atan2(0.8, 0.6) // on the blank wall below FOOD & PHARMACY
  scene.add(sign)
}
function makeTurkey() {
  const g = new THREE.Group()
  const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 })
  const bodyM = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), mat('#5b3418')); bodyM.scale.set(1, 0.9, 1.25); bodyM.position.y = 0.55; g.add(bodyM)
  const cols = ['#b5651d', '#e0a030', '#7a3b12', '#f0c060', '#b5651d', '#e0a030', '#7a3b12', '#f0c060', '#b5651d']
  cols.forEach((c, i) => {
    const a = (i - 4) * 0.3
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.62, 0.03), mat(c)); f.position.set(Math.sin(a) * 0.36, 0.72 + Math.cos(a) * 0.36, -0.36); f.rotation.z = -a; f.rotation.x = -0.25; g.add(f)
  })
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.4, 8), mat('#6e4220')); neck.position.set(0, 0.92, 0.3); neck.rotation.x = 0.3; g.add(neck)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), mat('#7b4a26')); head.position.set(0, 1.14, 0.37); g.add(head)
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.14, 6), mat('#f2b01e')); beak.rotation.x = Math.PI / 2; beak.position.set(0, 1.13, 0.5); g.add(beak)
  const wattle = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), mat('#d2281e')); wattle.scale.y = 1.8; wattle.position.set(0, 1.03, 0.46); g.add(wattle)
  for (const e of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), mat('#111')); eye.position.set(e * 0.07, 1.17, 0.45); g.add(eye)
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 6), mat('#e0a030')); leg.position.set(e * 0.13, 0.15, 0.02); g.add(leg)
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), mat('#4a2a12')); wing.scale.set(0.35, 0.8, 1.1); wing.position.set(e * 0.33, 0.56, 0); g.add(wing)
  }
  g.traverse((m) => { if (m.isMesh) m.castShadow = true })
  return g
}
const prize = new THREE.Group(); prize.position.set(PEDESTAL.x, GY, PEDESTAL.y); scene.add(prize)
{
  const crate = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.9, 1.5), new THREE.MeshStandardMaterial({ color: '#b98a4f', roughness: 0.9 })); crate.position.y = 0.45; crate.castShadow = true; prize.add(crate)
  const band = new THREE.Mesh(new THREE.BoxGeometry(1.54, 0.2, 1.54), new THREE.MeshStandardMaterial({ color: '#c8302b' })); band.position.y = 0.55; prize.add(band)
}
const prizeTurkey = makeTurkey(); prizeTurkey.scale.setScalar(1.7); prizeTurkey.position.y = 0.9; prize.add(prizeTurkey)
// Road closed for the Turkey Day Parade, at the north end of both roads: barricades, a banner,
// and floats with people on them waiting behind.
function parade(px, pz, ry, half, line2, nFloats) {
  const par = new THREE.Group(); par.position.set(px, 0.12, pz); par.rotation.y = ry; scene.add(par)
  const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t }
  const fit = (x, t, px0, y, max, weight = 'bold') => { let q = px0; do { x.font = `${weight} ${q}px Oswald, Impact, sans-serif`; q -= 2 } while (x.measureText(t).width > max); x.fillText(t, 512, y) }
  const banner = tex(1024, 224, (x) => {
    x.fillStyle = '#f7e9c4'; x.fillRect(0, 0, 1024, 224); x.fillStyle = '#e8742c'; x.fillRect(0, 0, 1024, 18); x.fillRect(0, 206, 1024, 18)
    turkeyArt(x, 110, 140, 78); turkeyArt(x, 914, 140, 78)
    x.textAlign = 'center'; x.fillStyle = '#c8302b'; fit(x, 'TURKEY DAY PARADE', 84, 108, 600)
    x.fillStyle = '#5a3a1e'; fit(x, line2, 50, 176, 610)
  })
  const pole = new THREE.MeshStandardMaterial({ color: '#d9d5c8' })
  for (const e of [-1, 1]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 5.4, 8), pole); m.position.set(e * half, 2.7, 0); m.castShadow = true; par.add(m) }
  const bw = Math.min(half * 2 - 0.2, 12)
  const bm = new THREE.Mesh(new THREE.PlaneGeometry(bw, bw * 0.219), new THREE.MeshStandardMaterial({ map: banner, roughness: 0.8, side: THREE.DoubleSide })); bm.position.set(0, 4.1, 0); bm.castShadow = true; par.add(bm)
  const stripe = tex(256, 32, (x) => { for (let i = -2; i < 12; i++) { x.fillStyle = i % 2 ? '#f4f1e8' : '#ee6a1a'; x.beginPath(); x.moveTo(i * 26, 32); x.lineTo(i * 26 + 26, 32); x.lineTo(i * 26 + 42, 0); x.lineTo(i * 26 + 16, 0); x.fill() } })
  const board = new THREE.MeshStandardMaterial({ map: stripe, roughness: 0.6 }), leg = new THREE.MeshStandardMaterial({ color: '#d9d4c4' })
  const nb = Math.round((half * 2) / 2.4)
  for (let k = 0; k < nb; k++) {
    const i = k - (nb - 1) / 2, b = new THREE.Group(); b.position.set(i * 2.4, 0, 1.3 + (k % 2) * 0.25); par.add(b)
    for (const y of [0.55, 0.95]) { const m = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.22, 0.04), board); m.position.y = y; m.castShadow = true; b.add(m) }
    for (const sx of [-0.85, 0.85]) for (const t of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, 0.06), leg); m.position.set(sx, 0.52, t * 0.18); m.rotation.x = t * 0.18; b.add(m) }
  }
  const cols = ['#e8742c', '#f1c62f', '#c8302b', '#2f7d32', '#7a3b12'], shirts = ['#2f6fc4', '#c8302b', '#f1c62f', '#2f7d32', '#8a3a7a', '#f4f1e8'], skins = ['#e0b090', '#a86a4a', '#c98a6a', '#7a4a32']
  const person = (x, z, i) => {
    const g = new THREE.Group(); g.position.set(x, 1.05, z); g.rotation.y = (i % 5) * 0.5 - 1
    const shirt = new THREE.MeshStandardMaterial({ color: shirts[i % shirts.length], roughness: 0.9 }), skin = new THREE.MeshStandardMaterial({ color: skins[i % skins.length], roughness: 0.8 })
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.8, 0.22), new THREE.MeshStandardMaterial({ color: '#34425a' })); legs.position.y = 0.4; g.add(legs)
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.42, 3, 8), shirt); torso.position.y = 1.12; torso.castShadow = true; g.add(torso)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), skin); head.position.y = 1.68; g.add(head)
    // One arm up, waving. Nobody remembers why.
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.5, 3, 6), skin); arm.position.set(0.3, 1.62, 0); arm.rotation.z = -0.5; g.add(arm); g.userData.arm = arm
    const arm2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.5, 3, 6), skin); arm2.position.set(-0.27, 1.08, 0); arm2.rotation.z = -0.15; g.add(arm2)
    wavers.push(arm); return g
  }
  // Behind the barricades: floats with people on them, bunting and balloons.
  for (let fI = 0; fI < nFloats; fI++) {
    const float = new THREE.Group(); float.position.set((fI - (nFloats - 1) / 2) * 6.5 + 0.6, 0, -8.5 - fI * 3.5); float.rotation.y = 0.5 - fI * 0.8; par.add(float)
    const bed = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.9, 6), new THREE.MeshStandardMaterial({ color: cols[(fI * 2 + 2) % 5], roughness: 0.8 })); bed.position.y = 0.6; bed.castShadow = true; float.add(bed)
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.3, 6.1), new THREE.MeshStandardMaterial({ color: '#f1c62f' })); skirt.position.y = 0.2; float.add(skirt)
    const big = makeTurkey(); big.scale.setScalar(fI ? 2.2 : 3.4); big.position.set(0, 1.05, fI ? -1.2 : 0); float.add(big)
    for (const [x, z, i] of [[-1.2, 2.3, 0], [1.2, 2.2, 1], [-1.25, -2.3, 2], [1.2, -2.4, 3], [0, 2.6, 4]]) float.add(person(x, z, i + fI * 3))
  }
  const nf = Math.round((half * 2 - 1.2) / 0.84)
  for (let i = 0; i < nf; i++) {
    const flag = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 3), new THREE.MeshStandardMaterial({ color: cols[(i + 2) % 5], side: THREE.DoubleSide })); flag.rotation.z = Math.PI; flag.scale.z = 0.1
    flag.position.set(-half + 0.6 + i * 0.84, 2.75 - Math.sin((i / (nf - 1)) * Math.PI) * 0.3, 0.02); par.add(flag)
  }
  for (let i = 0; i < 12; i++) {
    const bal = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), new THREE.MeshStandardMaterial({ color: cols[i % 5], roughness: 0.3 })); bal.scale.y = 1.2
    bal.position.set((i % 2 ? 1 : -1) * half + (i % 3 - 1) * 0.4, 5.6 + (i % 4) * 0.45, (i % 3 - 1) * 0.3); par.add(bal)
  }
}
const wavers = []
parade(-69.9 * U, 339.3 * U, Math.atan2(-0.3, 0.954), 5.2, 'ROAD CLOSED · DETOUR', 1)
parade(-105.3 * U, 341 * U, Math.atan2(0.254, 0.967), 13.5, 'WE STILL HAVEN’T FIGURED OUT WHY WE DO THIS', 2)
// The wooded east side of A1A Beach Blvd: a tree line behind the invisible wall.
{
  const leaf = [new THREE.MeshStandardMaterial({ color: '#3d6b3c', roughness: 1 }), new THREE.MeshStandardMaterial({ color: '#4f7f45', roughness: 1 }), new THREE.MeshStandardMaterial({ color: '#2f5a34', roughness: 1 })]
  const geo = new THREE.IcosahedronGeometry(1, 1)
  let k = 0
  for (const [pts, side] of [[[[-82.2, 396], [-82.4, 387], [-81.2, 379.6], [-75.0, 358.7], [-68.6, 338.4]], 1], [ROAD_W.map(([x, z]) => [x - 3.1, z]), -1]]) for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], n = Math.ceil(Math.hypot(bx - ax, bz - az) / 1.1)
    for (let j = 0; j < n; j++, k++) for (const row of [0, 1]) {
      const r = (v) => { const q = Math.sin((k * 2 + row) * 12.9898 + v * 78.233) * 43758.5453; return q - Math.floor(q) }
      const t = (j + r(1)) / n, sc = 2.2 + r(2) * 1.6 + row
      const tz = az + (bz - az) * t; if (side < 0 && tz > 386.3 && tz < 391.6) continue // leave the mouth of Floridian Ave open
      const px = (ax + (bx - ax) * t + side * (0.75 + row * 0.9 + r(4) * 0.4)) * U, pz = tz * U
      if (DATA.homes.some(([hx, hz, w, d, a]) => { const dx = px - hx, dz = pz - hz, c = Math.cos(a), sn = Math.sin(a); return Math.abs(dx * c - dz * sn) < w / 2 + sc * 1.3 && Math.abs(dx * sn + dz * c) < d / 2 + sc * 1.3 })) continue // not through a neighbor's roof
      const m = new THREE.Mesh(geo, leaf[(k + row) % 3]); m.scale.set(sc, sc * (0.8 + r(3) * 0.5), sc)
      m.position.set((ax + (bx - ax) * t + side * (0.75 + row * 0.9 + r(4) * 0.4)) * U, sc * 0.75 + row * 1.2, (az + (bz - az) * t) * U); m.castShadow = row === 0; scene.add(m)
    }
  }
}
const tableSpots = []
// The pond south of Floridian Ave, grown to fill the open field up to the houses' back yards.
const POND = { x0: -111.4, x1: -100.6, z0: 392.5, z1: 401.5 }
{
  const cx = (POND.x0 + POND.x1) / 2 * U, cz = (POND.z0 + POND.z1) / 2 * U, w = (POND.x1 - POND.x0) * U, d = (POND.z1 - POND.z0) * U
  const sh = new THREE.Shape(); const r = 9; sh.moveTo(-w / 2 + r, -d / 2); sh.lineTo(w / 2 - r, -d / 2); sh.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r); sh.lineTo(w / 2, d / 2 - r); sh.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2); sh.lineTo(-w / 2 + r, d / 2); sh.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r); sh.lineTo(-w / 2, -d / 2 + r); sh.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2)
  const bank = new THREE.Mesh(new THREE.ShapeGeometry(sh, 10), new THREE.MeshStandardMaterial({ color: '#5a5f45', roughness: 1 })); bank.rotation.x = -Math.PI / 2; bank.scale.setScalar(1.06); bank.position.set(cx, 0.06, cz); scene.add(bank)
  const water = new THREE.Mesh(new THREE.ShapeGeometry(sh, 10), new THREE.MeshStandardMaterial({ color: '#1f4f66', roughness: 0.08, metalness: 0.3 })); water.rotation.x = -Math.PI / 2; water.position.set(cx, 0.1, cz); scene.add(water)
  const reed = new THREE.MeshStandardMaterial({ color: '#6f8a4a', roughness: 1 })
  for (let i = 0; i < 26; i++) { const a = i * 2.4, m = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.6 + (i % 3) * 0.4, 5), reed); m.position.set(cx + Math.cos(a) * (w / 2 - 1.5) * (0.92 + (i % 4) * 0.03), 0.8, cz + Math.sin(a) * (d / 2 - 1.5) * (0.92 + (i % 5) * 0.02)); scene.add(m) }
}
// An opening in the west wall by publick's corner: picnic tables fill it, so only people on foot
// get through. Each table is solid.
{
  const wood = new THREE.MeshStandardMaterial({ color: '#9a6a3f', roughness: 0.9 }), leg = new THREE.MeshStandardMaterial({ color: '#5b5f63', metalness: 0.4, roughness: 0.6 })
  const turn = Math.atan2(2.2, 9.4) // along the wall
  for (const z of [349.35, 349.95, 350.55, 351.15]) {
    const x = -102.7 + (z - 345.9) * (2.2 / 9.4), t = new THREE.Group(); t.position.set(x * U, 0.12, z * U); t.rotation.y = turn + Math.PI / 2; scene.add(t)
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.07, 0.8), wood); top.position.y = 0.76; top.castShadow = true; t.add(top)
    for (const e of [-1, 1]) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.06, 0.3), wood); bench.position.set(0, 0.45, e * 0.62); bench.castShadow = true; t.add(bench)
      for (const f of [-0.75, 0.75]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.78, 1.5), leg); l.position.set(f, 0.39, 0); l.rotation.x = e * 0.25; t.add(l) }
    }
    tableSpots.push([x * U, z * U, 1.15])
  }
  // A walk across the grass and a crossing sign for the people who can use it.
  const walk = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.04, 2.6), new THREE.MeshStandardMaterial({ color: '#d9d5c8', roughness: 1 }))
  walk.position.set(-101.6 * U, 0.08, 350.25 * U); walk.rotation.y = turn + Math.PI / 2; walk.receiveShadow = true; scene.add(walk)
}
const marker = new THREE.Group(); marker.position.set(DOOR.x, GY + 0.03, DOOR.y); scene.add(marker)
const markerMat = new THREE.MeshBasicMaterial({ color: '#ffd23a', transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false })
{
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(ZONE_R, ZONE_R, 1.1, 48, 1, true), markerMat); wall.position.y = 0.55; marker.add(wall)
  const ring = new THREE.Mesh(new THREE.RingGeometry(ZONE_R - 0.5, ZONE_R, 48), new THREE.MeshBasicMaterial({ color: '#ffd23a', transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; marker.add(ring)
}

// --- the cars -----------------------------------------------------------------
const { car, body, wheels, steering } = buildGalaxie('#8e1018')
scene.add(car)
const backSeatTurkey = makeTurkey(); backSeatTurkey.scale.setScalar(0.95); backSeatTurkey.position.set(0, 0.7, -1.05); backSeatTurkey.visible = false; body.add(backSeatTurkey)

// The rival: a boxy wagon with every side window down.
const rival = buildSUV('#7d8a3c')
const rivalCar = rival.car, rivalBody = rival.body; scene.add(rivalCar)

// --- people in the cars -----------------------------------------------------------
const galaxieBody = body
/** Put a rig in a seat: fix its up/forward from its own pose, then drop its hips on the cushion. */
function seat(root, mixer, hipsName, kneeName, headName, target, body = galaxieBody) {
  const fix = new THREE.Group(); fix.add(root); body.add(fix)
  mixer.update(0); fix.updateMatrixWorld(true)
  const at = (n) => { const b = root.getObjectByName(n); const v = new THREE.Vector3(); b.getWorldPosition(v); return fix.worldToLocal(v) }
  // Upright: hips -> head should point up (leaning back a touch).
  const up = at(headName).sub(at(hipsName)).normalize()
  fix.quaternion.setFromUnitVectors(up, new THREE.Vector3(0, 0.97, -0.24).normalize())
  fix.updateMatrixWorld(true)
  // Facing: knees go forward (+Z) of the hips.
  const toLocal = (n) => { const b = root.getObjectByName(n); const v = new THREE.Vector3(); b.getWorldPosition(v); return body.worldToLocal(v) }
  if (toLocal(kneeName).z < toLocal(hipsName).z) { fix.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)); fix.updateMatrixWorld(true) }
  const hips = toLocal(hipsName)
  fix.position.add(target.clone().sub(hips))
  fix.updateMatrixWorld(true)
  return fix
}
const castAll = (o) => o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false } })

// Chris: the Ready Player Me avatar from Truck-Animation, on its driving clip.
const chris = chrisGltf.scene; castAll(chris)
const clip = drivingFbx.animations[0]
clip.tracks = clip.tracks.filter((t) => t.name.endsWith('.quaternion'))
for (const t of clip.tracks) t.name = t.name.replace(/^mixamorig[:_]?/, '')
const chrisMixer = new THREE.AnimationMixer(chris)
chrisMixer.clipAction(clip).play()
seat(chris, chrisMixer, 'Hips', 'LeftLeg', 'Head', CAR.driverSeat)

/** Put a steering wheel where a driver's hands are, averaged over the driving clip. */
function fitWheel(steering, root, mixer, body) {
  const L = new THREE.Vector3(), R = new THREE.Vector3(), mid = new THREE.Vector3(), spread = []
  const lh = root.getObjectByName('LeftHand'), rh = root.getObjectByName('RightHand'), n = 8
  for (let i = 0; i < n; i++) {
    mixer.setTime((clip.duration * i) / n); body.updateMatrixWorld(true)
    lh.getWorldPosition(L); rh.getWorldPosition(R); body.worldToLocal(L); body.worldToLocal(R)
    mid.add(L.clone().add(R).multiplyScalar(0.5 / n)); spread.push(L.distanceTo(R))
  }
  mixer.setTime(0)
  const r = THREE.MathUtils.clamp(spread.reduce((a, b) => a + b, 0) / n / 2, 0.17, 0.23)
  steering.position.copy(mid).add(new THREE.Vector3(0, -0.02, 0.05))
  steering.rotation.x = 0.42
  steering.userData.rim.scale.setScalar(r / 0.2)
}
fitWheel(steering, chris, chrisMixer, galaxieBody)

// The other driver: Chris again, with bleached hair, in the wagon.
const twin = cloneSkinned(chris); castAll(twin)
twin.traverse((m) => {
  if (!m.isMesh || m.name !== 'Wolf3D_Hair') return
  m.material = m.material.clone(); m.material.map = null; m.material.color.set('#f0d264'); m.material.roughness = 0.6; m.material.needsUpdate = true
})
const twinMixer = new THREE.AnimationMixer(twin)
twinMixer.clipAction(clip).play()
seat(twin, twinMixer, 'Hips', 'LeftLeg', 'Head', SUV.driverSeat, rivalBody)
fitWheel(rival.steering, twin, twinMixer, rivalBody)
const twinHead = twin.getObjectByName('Head')
const chrisHead = chris.getObjectByName('Head')

// The cart driver from pga-golf-game, riding shotgun.
const woman = womanGltf.scene; castAll(woman)
const womanMixer = new THREE.AnimationMixer(woman)
const sitting = womanGltf.animations.find((a) => a.name === 'Sitting')
womanMixer.clipAction(sitting).play()
seat(woman, womanMixer, 'Hips', 'Knee_L', 'Head', CAR.passengerSeat)
const womanHead = woman.getObjectByName('Head'), womanNeck = woman.getObjectByName('Neck')
// Her clip has no head track, so set the head from a fixed rest pose every frame (never accumulate).
const womanHeadRest = womanHead.quaternion.clone(), womanNeckRest = womanNeck ? womanNeck.quaternion.clone() : null

// Blinking, where the rigs have it.
const blinkMeshes = []
for (const r of [chris, woman]) r.traverse((m) => {
  const d = m.morphTargetDictionary; if (!d) return
  const keys = Object.keys(d).filter((k) => /blink|eyesClosed/i.test(k))
  if (keys.length) blinkMeshes.push({ m, idx: keys.map((k) => d[k]) })
})

// --- obstacles ------------------------------------------------------------------
const circles = [[PEDESTAL.x, PEDESTAL.y, 1.1]]
for (const [x, z, turn] of DATA.cars) for (const e of [-1.2, 0, 1.2]) circles.push([x + Math.sin(turn) * e, z + Math.cos(turn) * e, 1.0])
for (const [x, z] of DATA.palms) circles.push([x, z, 0.45])
for (const [x, z] of DATA.poles) circles.push([x, z, 0.3])
for (const [x, z] of BB_POLES) circles.push([x, z, 0.4])
// Buildings: [center, unit vector along local x, half x, half z]. The grocery's box also covers its front walk.
const wingBox = (cx, cz, t, L, D) => ({ c: u2(cx, cz), a: new V2(Math.cos(t), -Math.sin(t)), hx: (L / 2) * U, hz: (D / 2) * U })
const boxes = [
  { c: gAt(0, 0.45), a: GA.clone(), hx: 6.05 * U, hz: 5.25 * U },
  wingBox(-81.65, 339.8, 0, 11.1, 3.4),
  wingBox(-93.25, 364.09, Math.atan2(0.968, -0.249), 14.9, 3.3),
  { c: u2(-87.65, 372.6).add(new V2(0, 0.9)), a: new V2(1, 0), hx: 2.35 * U, hz: 1.9 * U + 0.9 }, // with its south walk
]
// The Square K: the store (with its front walk), two pump islands, the canopy posts, the price pylon.
boxes.push(wingBox(-88.76, 385.71, 0.035, 3.46, 2.6), wingBox(-88.6, 389.65, 0, 2.6, 0.2), wingBox(-88.6, 390.55, 0, 2.6, 0.2), wingBox(-86.4, 394.4, 0, 0.3, 0.8))
for (const e of [-1, 1]) for (const v of [-1, 1]) circles.push([(-88.6 + e * 1.15) * U, (390.1 + v * 0.45) * U, 0.3])
// Bank of the Gulf of America (with its front hedge) and the four posts of its drive-thru canopy.
boxes.push({ c: new V2(-88.5 * U + 0.5, 380.0 * U + 0.4), a: new V2(1, 0), hx: 1.3 * U + 0.7, hz: 2.3 * U + 0.6 })
for (const e of [-1, 1]) for (const v of [-1, 1]) circles.push([-88.5 * U + e * 4.7, (380.0 - 2.3) * U - 3.25 + v * 2.6, 0.45])
circles.push([-88.5 * U, (380.0 - 2.3) * U - 3.25, 0.6])
circles.push([-87.7 * U, 342.5 * U, 1.35]) // the planted bed with the crossing sign
boxes.push({ c: new V2(-76.1 * U + 1.3, 339.8 * U - 0.2), a: new V2(1, 0), hx: 1.5, hz: 6.6 }) // enclosure and hedges on the north strip's east end
circles.push(dressing.userData.cornerBed) // and the one off the end of the west strip
// The drivable wedge is two convex areas that overlap: the plaza lot and the station pad.
const mkRegion = (pts) => {
  const poly = pts.map(([x, z]) => new V2(x, z)), centroid = poly.reduce((s, p) => s.add(p), new V2()).divideScalar(poly.length)
  const walls = poly.map((a, i) => {
    const d = poly[(i + 1) % poly.length].clone().sub(a).normalize(), n = new V2(-d.y, d.x)
    if (centroid.clone().sub(a).dot(n) < 0) n.negate()
    return { a, n }
  })
  return { poly, walls }
}
// A1A Beach Blvd along the east side: one rectangle per stretch of its centerline, blocked at both
// ends, with an invisible wall on the wooded side. Two driveways join it to the station and the plaza.
const ROAD = [[-83.3, 395.5], [-83.5, 387], [-82.3, 379.75], [-76.1, 359], [-69.9, 339.3]]
/** One rectangle per stretch of a road's centerline (south to north). hE / hW: how far it reaches east / west. */
const roadStrip = (pts, hE, hW) => pts.slice(1).map((b, i) => {
  const a = pts[i], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len
  const e0 = i === 0 ? 0 : 0.5, e1 = i === pts.length - 2 ? 0 : 0.5 // overlap at the bends, square at the two blocks
  const A = [a[0] - ux * e0, a[1] - uz * e0], B = [b[0] + ux * e1, b[1] + uz * e1], he = hE(i), hw = hW(i)
  return mkRegion([[A[0] - uz * he, A[1] + ux * he], [B[0] - uz * he, B[1] + ux * he], [B[0] + uz * hw, B[1] - ux * hw], [A[0] + uz * hw, A[1] - ux * hw]].map(([x, z]) => [x * U, z * U]))
})
// The drivable area is one shape from the far edge of A1A S to the far edge of A1A Beach Blvd,
// cut into thin overlapping bands (each convex). There are no invisible walls inside it: the
// barriers you can see are the barriers you hit (they collide below), and the roads' far
// edges are the only invisible ones.
const along = (pts, z, off) => {
  const p = pts.slice().sort((a, b) => a[1] - b[1])
  if (z <= p[0][1]) { const [a, b] = p; return a[0] + (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + off }
  for (let i = 0; i + 1 < p.length; i++) if (z <= p[i + 1][1]) { const [a, b] = [p[i], p[i + 1]]; return a[0] + (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + off }
  const [a, b] = p.slice(-2); return a[0] + (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + off
}
const regions = []
for (let z = 333; z < 397; z += 1) {
  const z0 = z - 0.3, z1 = z + 1.3
  regions.push(mkRegion([[along(ROAD_W, z0, -2.9), z0], [along(ROAD, z0, 1.0), z0], [along(ROAD, z1, 1.0), z1], [along(ROAD_W, z1, -2.9), z1]].map(([x, zz]) => [x * U, zz * U])))
}
// Every barrier you can see: a thin solid box along it.
// Floridian Ave, from A1A S to the barrier at its west end.
regions.push(mkRegion([[-124.5, 387.95], [-93.2, 387.95], [-93.2, 391.3], [-124.5, 391.3]].map(([x, z]) => [x * U, z * U])))
// ...and the two neighbors' driveways, each reaching past the middle of the street.
for (const d of [HOME.me, HOME.them]) { const x = d[0] / U; regions.push(mkRegion([[x - 0.46, 387.2], [x + 0.46, 387.2], [x + 0.46, 389.7], [x - 0.46, 389.7]].map(([x, z]) => [x * U, z * U]))) }
circles.push(...tableSpots)
boxes.push({ c: u2((POND.x0 + POND.x1) / 2, (POND.z0 + POND.z1) / 2), a: new V2(1, 0), hx: (POND.x1 - POND.x0) / 2 * U - 1, hz: (POND.z1 - POND.z0) / 2 * U - 1 }) // no swimming
// The neighborhood: drive anywhere through the yards; the houses themselves are solid.
regions.push(mkRegion([[-124.5, 382.6], [-95.6, 382.6], [-95.6, 391.5], [-124.5, 391.5]].map(([x, z]) => [x * U, z * U])))
for (const [x, z, w, d, t] of DATA.homes) boxes.push({ c: new V2(x, z), a: new V2(Math.cos(t), -Math.sin(t)), hx: w / 2 + 0.3, hz: d / 2 + 0.3 })
for (const [x, z, sx, sz, h] of DATA.walls) boxes.push({ c: new V2(x, z), a: new V2(sx, sz), hx: h, hz: 0.45 })
circles.push([-74.9 * U, 349.5 * U, 1.3]) // the plaza's pylon sign by its entrance
circles.push([-83.72 * U, 379.6 * U, 1.6]) // the bank's sign
for (const [x, z] of [[-72.0, 341.6], [-73.05, 345.0], [-74.2, 348.6], [-76.5, 356.0], [-78.1, 361.5], [-80.2, 368.5]]) circles.push([x * U, z * U, 0.45]) // roadside palms

class Vehicle {
  constructor(o) {
    Object.assign(this, { pos: new V2(), heading: 0, vel: new V2(), steer: 0, wheelRot: 0, pitch: 0, pitchV: 0, roll: 0, rollV: 0, bounce: 0, bounceV: 0, loose: 0, rpm: 0, skid: 0, fwd: 0,
      half: 1.55, r: 1.05, hl: 2.78, hw: 1.0, accel: 8.5, vmax: 34, mass: 1.7, wheelbase: 3 }, o)
  }
  get f() { return new V2(Math.sin(this.heading), Math.cos(this.heading)) }
  /** The body as three circles for hitting the scenery: [center, +1 front | 0 middle | -1 rear]. */
  ends() { const f = this.f; return [[this.pos.clone().addScaledVector(f, this.half), 1], [this.pos.clone(), 0], [this.pos.clone().addScaledVector(f, -this.half), -1]] }
  /** A shove on one end swings the nose the way it was pushed. */
  twist(n, end, depth) { const e = new V2(Math.cos(this.heading), -Math.sin(this.heading)); this.heading += end * n.dot(e) * Math.min(depth, 0.6) * 0.22 }
  step(dt, inp) {
    const f = this.f, r = new V2(f.y, -f.x)
    let fwd = this.vel.dot(f), lat = this.vel.dot(r)
    let accel = 0
    if (inp.throttle > 0) accel = fwd < -0.3 ? 14 : this.accel * inp.throttle * (1 - Math.max(0, fwd) / this.vmax)
    else if (inp.throttle < 0) accel = fwd > 0.3 ? -15 : -4.5 * (1 + fwd / 9)
    fwd += accel * dt
    fwd -= fwd * 0.18 * dt + Math.sign(fwd) * Math.min(Math.abs(fwd), (inp.throttle ? 0.4 : 2.2) * dt)
    if (inp.handbrake) fwd -= Math.sign(fwd) * Math.min(Math.abs(fwd), 7 * dt)
    const maxSteer = 0.62 / (1 + Math.abs(fwd) * 0.06)
    this.steer += (inp.steer * maxSteer - this.steer) * (1 - Math.exp(-7 * dt))
    this.heading += (fwd * Math.tan(this.steer)) / this.wheelbase * (inp.handbrake ? 1.45 : 1) * dt
    this.loose = Math.max(0, this.loose - dt)
    lat *= Math.exp(-(inp.handbrake || this.loose > 0 ? 1.6 : 9) * dt)
    const f2 = this.f, r2 = new V2(f2.y, -f2.x), prev = this.vel.clone()
    this.vel.copy(f2.multiplyScalar(fwd)).add(r2.multiplyScalar(lat))
    this.pos.addScaledVector(this.vel, dt)
    const bumped = collideStatic(this)
    const a = this.vel.clone().sub(prev).divideScalar(Math.max(dt, 1e-4))
    const along = THREE.MathUtils.clamp(a.dot(f), -30, 30), across = THREE.MathUtils.clamp(a.dot(r), -30, 30)
    const spring = (x, v, target, k, c) => { v += (-(x - target) * k - v * c) * dt; return [x + v * dt, v] }
    ;[this.pitch, this.pitchV] = spring(this.pitch, this.pitchV, THREE.MathUtils.clamp(-along * 0.006, -0.06, 0.06), 60, 7)
    ;[this.roll, this.rollV] = spring(this.roll, this.rollV, THREE.MathUtils.clamp(across * 0.008, -0.08, 0.08), 55, 6)
    ;[this.bounce, this.bounceV] = spring(this.bounce, this.bounceV, 0, 90, 8)
    if (bumped > 3) this.bounceV += Math.min(bumped, 12) * 0.03
    this.wheelRot += (fwd / 0.36) * dt
    this.rpm += ((inp.throttle > 0 ? 0.35 : 0.12) + Math.abs(fwd) / 30 - this.rpm) * (1 - Math.exp(-4 * dt))
    this.skid = inp.handbrake && Math.abs(fwd) > 6 ? 1 : Math.min(1, Math.abs(lat) / 6)
    this.fwd = fwd
    return bumped
  }
}
function collideStatic(v) {
  let bumped = 0
  const hit = (n, depth, end) => {
    v.pos.addScaledVector(n, depth); v.twist(n, end, depth)
    const vn = v.vel.dot(n); if (vn < 0) { v.vel.addScaledVector(n, -1.25 * vn); bumped = Math.max(bumped, -vn) }
  }
  for (const [c0, end] of v.ends()) {
    const c = c0
    for (const [x, z, r] of circles) {
      const dx = c.x - x, dz = c.y - z, d = Math.hypot(dx, dz), min = r + v.r
      if (d < min && d > 1e-4) { const n = new V2(dx / d, dz / d); hit(n, min - d, end); c.addScaledVector(n, min - d) }
    }
    for (const b of boxes) {
      const rel = c.clone().sub(b.c), lx = rel.x * b.a.x + rel.y * b.a.y, lz = rel.x * b.a.y - rel.y * b.a.x // local z axis = (a.y, -a.x)·(-1)
      const zx = -b.a.y, zy = b.a.x, lz2 = rel.x * zx + rel.y * zy
      const qx = THREE.MathUtils.clamp(lx, -b.hx, b.hx), qz = THREE.MathUtils.clamp(lz2, -b.hz, b.hz)
      let dx = lx - qx, dz = lz2 - qz, d = Math.hypot(dx, dz)
      if (d >= v.r) continue
      let n, depth
      if (d > 1e-4) { n = new V2((dx * b.a.x + dz * zx) / d, (dx * b.a.y + dz * zy) / d); depth = v.r - d }
      else { // center inside: leave by the nearest face
        const px = b.hx - Math.abs(lx), pz = b.hz - Math.abs(lz2)
        if (px < pz) { n = b.a.clone().multiplyScalar(Math.sign(lx) || 1); depth = px + v.r } else { n = new V2(zx, zy).multiplyScalar(Math.sign(lz2) || 1); depth = pz + v.r }
      }
      hit(n, depth, end); c.addScaledVector(n, depth); void lz
    }
    // Stay inside whichever area needs the smaller shove (none, if the car is inside one).
    let push = null
    for (const { walls } of regions) {
      const q = c.clone()
      for (const w of walls) { const d = q.clone().sub(w.a).dot(w.n); if (d < v.r) q.addScaledVector(w.n, v.r - d) }
      q.sub(c); if (!push || q.lengthSq() < push.lengthSq()) push = q
    }
    if (push.lengthSq() > 1e-8) { const depth = push.length(), n = push.divideScalar(depth); hit(n, depth, end); c.addScaledVector(n, depth) }
  }
  return bumped
}
/** Car against car: returns the closing speed of the hit (0 if none). */
/** Car against car, as two oriented boxes (so nothing slides into a door or through a corner).
 * Returns the closing speed, where they touched, and who drove into whom. */
function collideCars(A, B) {
  const ax = (v) => { const f = v.f; return [f, new V2(f.y, -f.x)] }
  const [fA, lA] = ax(A), [fB, lB] = ax(B), d = B.pos.clone().sub(A.pos)
  let over = Infinity, n = null
  for (const axis of [fA, lA, fB, lB]) {
    const rA = A.hl * Math.abs(fA.dot(axis)) + A.hw * Math.abs(lA.dot(axis)), rB = B.hl * Math.abs(fB.dot(axis)) + B.hw * Math.abs(lB.dot(axis))
    const dist = d.dot(axis), o = rA + rB - Math.abs(dist)
    if (o <= 0) return null
    if (o < over) { over = o; n = axis.clone().multiplyScalar(dist < 0 ? -1 : 1) } // from A toward B
  }
  // Where they touch: the corners of each box that are inside the other.
  const corners = (v, f, l) => [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([i, j]) => v.pos.clone().addScaledVector(f, i * v.hl).addScaledVector(l, j * v.hw))
  const inside = (p, v, f, l) => { const r = p.clone().sub(v.pos); return Math.abs(r.dot(f)) <= v.hl + 0.02 && Math.abs(r.dot(l)) <= v.hw + 0.02 }
  const touch = [...corners(A, fA, lA).filter((p) => inside(p, B, fB, lB)), ...corners(B, fB, lB).filter((p) => inside(p, A, fA, lA))]
  const at = touch.length ? touch.reduce((s, p) => s.add(p), new V2()).divideScalar(touch.length) : A.pos.clone().lerp(B.pos, 0.5)
  // Push them fully apart (the heavier car moves less), then trade momentum.
  const total = A.mass + B.mass
  A.pos.addScaledVector(n, -(over + 0.01) * B.mass / total); B.pos.addScaledVector(n, (over + 0.01) * A.mass / total)
  const rel = A.vel.clone().sub(B.vel), closing = rel.dot(n), aIn = A.vel.dot(n), bIn = -B.vel.dot(n)
  if (closing > 0) {
    const j = 1.35 * closing / (1 / A.mass + 1 / B.mass)
    A.vel.addScaledVector(n, -j / A.mass); B.vel.addScaledVector(n, j / B.mass)
    // Scrub some of the sideways sliding where the metal meets.
    const t = new V2(-n.y, n.x), slide = rel.dot(t), jt = THREE.MathUtils.clamp(0.3 * slide / (1 / A.mass + 1 / B.mass), -0.5 * j, 0.5 * j)
    A.vel.addScaledVector(t, -jt / A.mass); B.vel.addScaledVector(t, jt / B.mass)
    // An off-center hit spins the car: torque = lever arm x impulse.
    const spin = (v, imp) => { const r = at.clone().sub(v.pos), torque = r.x * imp.y - r.y * imp.x; v.heading += THREE.MathUtils.clamp(-torque * 0.007 / v.mass, -0.3, 0.3); if (Math.abs(torque) > 6) v.loose = Math.max(v.loose, 0.5) }
    spin(A, n.clone().multiplyScalar(-j)); spin(B, n.clone().multiplyScalar(j))
    // The bodies rock on their springs: away from the hit, with a hop.
    const rock = (v, f, l, dir) => { const k = Math.min(closing, 14) * 0.012; v.pitchV += -dir.dot(f) * k * 6; v.rollV += dir.dot(l) * k * 8; v.bounceV += k * 1.6 }
    rock(A, fA, lA, n.clone().negate()); rock(B, fB, lB, n)
  }
  return { closing: Math.max(0, closing), at, n, bHitA: bIn > aIn + 1 }
}

// --- game state -------------------------------------------------------------------
const P = new Vehicle()
const R = new Vehicle({ half: SUV.half, r: 1.0, hl: 2.5, hw: 0.97, accel: 6.2, vmax: 13.5, mass: 1.15, wheelbase: 2.8 })
const game = { state: 'intro', t: 0, health: 100, grab: 0, hitCool: 0, ai: 'seek', aiT: 0, stuckT: 0, reverseT: 0, target: DOOR.clone(), bubbleT: 0, rams: 0, pathI: 0, armor: 100, attackCool: 6, people: 100, cans: 10, canHits: 0, lastCanT: 1.4, throwCool: 3, soda: 3, sodaReady: false, b2T: 0 }
const OUCH = ['HEY!', 'MY BUMPER!', "IT'S OUR TURKEY!", 'WATCH IT!', 'NOT THE FENDER!', 'WE CALLED DIBS!']
function reset(toCutscene) {
  $('mission').style.display = ''; $('sodaBtn').style.display = ''
  Object.assign(P, { heading: P_START.heading, steer: 0, pitch: 0, roll: 0, bounce: 0, loose: 0, fwd: 0 }); P.pos.copy(P_START.pos); P.vel.set(0, 0)
  Object.assign(R, { heading: R_START.heading, steer: 0, pitch: 0, roll: 0, bounce: 0, loose: 0, fwd: 0 }); R.pos.copy(R_START.pos); R.vel.set(0, 0)
  Object.assign(game, { state: toCutscene ? 'cutscene' : 'intro', t: 0, health: 100, grab: 0, hitCool: 0, ai: 'seek', aiT: 0, stuckT: 0, reverseT: 0, bubbleT: 0, rams: 0, pathI: 0, touchT: 0, armor: 100, attackCool: 6, people: 100, cans: 10, canHits: 0, lastCanT: 1.4, throwCool: 3, soda: 3, sodaReady: false, b2T: 0, backedOut: false, backT: 0 })
  for (const c of sodas) { c.live = false; c.mesh.visible = false }
  $('bubble2').textContent = 'WE HAVE TO GET THAT LAST TURKEY!'
  for (const c of cans) { c.live = false; c.mesh.visible = false }
  splatI = 0; splats.count = 0
  game.target.copy(PATH[0])
  backSeatTurkey.visible = false; prizeTurkey.visible = true; marker.visible = true
  rival.M.paint.color.set('#7d8a3c')
  $('banner').classList.remove('show'); $('bubble').classList.remove('show'); $('bubble2').classList.remove('show'); $('bubble3').classList.remove('show'); game.b3T = 0
  skidIdx = 0; skidMesh.count = 0
  camPos.set(0, 0, 0)
  hud()
}
const say = (text, secs) => { $('bubbleText').textContent = text; $('bubble').classList.add('show'); game.bubbleT = secs }
const objective = (html) => { $('objective').innerHTML = html }
function banner(title, sub, cls) { $('bannerTitle').textContent = title; $('bannerSub').textContent = sub; $('banner').className = `show ${cls}` }

const keys = new Set()
addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault()
  const k = e.key.toLowerCase(); keys.add(k)
  if (k === 'v') cycleCam()
  if (k === 'h') audio.horn(true)
  if (k === 'f') throwSoda()
  if (k === 'm') audio.toggle()
  if (k === 'r' && game.state !== 'intro') reset(true)
  // Secret: 0 stops the game and lets you just drive around.
  if (k === '0' && !e.ctrlKey && !e.metaKey && game.state !== 'intro') freeDrive()
  if ((k === 'enter' || k === ' ') && game.state === 'cutscene' && game.t > 0.6) game.t = Math.max(game.t, 4.3)
  if (game.state === 'intro' && (k === 'enter' || k === ' ' || k === 'w' || k === 'arrowup')) start()
})
addEventListener('keyup', (e) => { keys.delete(e.key.toLowerCase()); if (e.key.toLowerCase() === 'h') audio.horn(false) })
const touch = { gas: 0, brake: 0, left: 0, right: 0 }
for (const b of document.querySelectorAll('[data-touch]')) {
  const k = b.dataset.touch
  const on = (e) => { e.preventDefault(); touch[k] = 1; b.classList.add('on') }
  const off = (e) => { e.preventDefault(); touch[k] = 0; b.classList.remove('on') }
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off)
}
$('camBtn').addEventListener('click', cycleCam)
$('sodaBtn').addEventListener('click', throwSoda)
$('retryBtn').addEventListener('click', () => reset(true))
$('playBtn').addEventListener('click', start)
function start() { audio.start(); if (game.state !== 'intro') return; game.state = 'cutscene'; game.t = 0; camMode = 0; camPos.set(0, 0, 0); $('intro').classList.add('gone'); $('hud').classList.remove('hidden') }

const playerInput = () => ({
  throttle: (keys.has('w') || keys.has('arrowup') || touch.gas ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') || touch.brake ? 1 : 0),
  steer: (keys.has('a') || keys.has('arrowleft') || touch.left ? 1 : 0) - (keys.has('d') || keys.has('arrowright') || touch.right ? 1 : 0),
  handbrake: keys.has(' '),
})
const NONE = { throttle: 0, steer: 0, handbrake: true }
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a))

/** The rival heads for the turkey, runs when rammed, and backs out when stuck. */
function rivalInput(dt) {
  if (game.health <= 0) return NONE
  // First he has to back out of his driveway and swing the nose east.
  if (!game.backedOut) {
    game.backT = (game.backT ?? 0) + dt
    const turned = Math.abs(wrap(R.heading - Math.PI / 2)) < 0.4
    if (turned || game.backT > 6 || (game.backT > 1 && Math.abs(R.fwd) < 0.3 && R.pos.y > 389.5 * U)) game.backedOut = true
    else return { throttle: R.fwd > -2.8 ? -1 : 0, steer: R.pos.y > 388.4 * U ? 1 : 0, handbrake: false } // straight back to the street, then swing
  }
  if (game.reverseT > 0) { game.reverseT -= dt; return { throttle: -1, steer: game.reverseSteer, handbrake: false } }
  if (game.ai === 'evade') { game.aiT -= dt; if (game.aiT <= 0 || R.pos.distanceTo(game.target) < 6) game.ai = 'seek' }
  // Every so often, when the Galaxie is close, he turns and goes for it instead.
  game.attackCool -= dt
  if (game.ai === 'seek' && game.rams > 0 && game.pathI >= 13 && game.attackCool <= 0 && R.pos.distanceTo(P.pos) < 18) {
    game.attackCool = 5 + Math.random() * 5
    if (Math.random() < 0.6) { game.ai = 'attack'; game.aiT = 2.4 }
  }
  if (game.ai === 'attack') { game.aiT -= dt; game.target.copy(P.pos).addScaledVector(P.vel, 0.35); if (game.aiT <= 0) game.ai = 'seek' }
  if (game.ai === 'seek') {
    // Out of the station and up the lot, one waypoint at a time; then the door.
    while (game.pathI < PATH.length && (R.pos.distanceTo(PATH[game.pathI]) < 5 || (game.pathI >= 13 && R.pos.y < PATH[game.pathI].y))) game.pathI++
    game.target.copy(game.pathI < PATH.length ? PATH[game.pathI] : DOOR)
  }
  const to = game.target.clone().sub(R.pos), dist = to.length()
  const want = Math.atan2(to.x, to.y)
  let diff = wrap(want - R.heading)
  if (game.ai !== 'attack') {
    // Swing round the Galaxie if it's sitting in the way.
    const tp = P.pos.clone().sub(R.pos), d = tp.length(), b = wrap(Math.atan2(tp.x, tp.y) - R.heading)
    if (d < 11 && Math.abs(b) < 0.8) diff = wrap(diff - Math.sign(b || 1) * (1 - d / 11) * 1.7)
  }
  const atDoor = game.ai === 'seek' && game.pathI >= PATH.length
  const inZone = atDoor && dist < ZONE_R - 2.2
  const cruise = inZone ? 0 : Math.min(R.vmax, (game.ai !== 'attack' && (atDoor || game.ai === 'evade') ? dist * 0.7 : 30) + 1.5) * (Math.abs(diff) > 1 ? 0.55 : 1)
  const throttle = R.fwd < cruise - 0.5 ? 1 : R.fwd > cruise + 1.5 ? -1 : 0
  if (!inZone && throttle > 0 && Math.abs(R.fwd) < 0.7) { game.stuckT += dt; if (game.stuckT > 0.9) { game.stuckT = 0; game.reverseT = 0.9; game.reverseSteer = -Math.sign(diff || 1); if (R.pos.distanceTo(P.pos) < 7 && game.pathI >= PATH.length) { game.ai = 'evade'; game.aiT = 3; game.target.copy(WAYPOINTS[Math.floor(Math.random() * WAYPOINTS.length)]) } } } else game.stuckT = 0
  return { throttle, steer: THREE.MathUtils.clamp(diff * 2.2, -1, 1), handbrake: inZone && Math.abs(R.fwd) > 0.5 }
}

function ram(hit, dt) {
  if (hit.closing > 1.5) { S.hit = Math.min(1, hit.closing / 14); audio.crash(Math.min(1, hit.closing / 12)) }
  if (hit.closing > 2) burst(hit.at, 6 + hit.closing, true)
  if (game.state !== 'chase') return
  if (hit.bHitA && hit.closing > 2.5 && game.rams > 0) {
    // He hit you. The Galaxie is a tank: it takes about a fifth of what it dishes out.
    if (game.hitCool > 0) return
    game.hitCool = 0.4
    game.armor = Math.max(0, game.armor - THREE.MathUtils.clamp((hit.closing - 2) * 0.9, 1.8, 10))
    hurt(THREE.MathUtils.clamp((hit.closing - 2) * 0.3, 0.5, 3))
    game.health = Math.max(1, game.health - (hit.closing - 2) * 0.8) // his wagon crumples a bit too
    $('armorBar').classList.remove('flashbar'); void $('armorBar').offsetWidth; $('armorBar').classList.add('flashbar')
    say('TAKE THAT!', 1.4); game.ai = 'seek'
    $('bubble2').textContent = 'THIS CAR IS ROCK HARD, PHILLIP. WE WILL CRUSH YOU.'; $('bubble2').classList.add('show'); game.b2T = 3.2
    if (game.armor <= 0) { game.state = 'lost'; banner('GALAXIE TOTALED', 'It took a lot, but he finally bent it.', 'bad') }
    return
  }
  if (hit.closing > 0.3) game.touchT = 1 // he can't load a turkey while you're on his bumper
  let dmg
  if (hit.closing < 2.5) {
    // Leaning on them and grinding still wears the wagon down, slowly.
    if (hit.closing < 0.3) return
    dmg = (0.6 + hit.closing) * 3 * dt
    game.health = Math.max(0, game.health - dmg)
  } else {
    if (game.hitCool > 0) return
    dmg = THREE.MathUtils.clamp((hit.closing - 2) * 2.7, 2, 34)
    game.health = Math.max(0, game.health - dmg); game.hitCool = 0.4; game.rams++
    R.loose = 0.9
    if (dmg > 8) game.grab = Math.max(0, game.grab - 0.3)
  }
  if (dmg > 2) { $('rivalBar').classList.remove('flashbar'); void $('rivalBar').offsetWidth; $('rivalBar').classList.add('flashbar') }
  if (game.health <= 0) {
    game.state = 'claim'; say('OKAY, OKAY! TAKE THE BIRD!', 4)
    flash('WRECKED!'); objective('Now grab the <b>last turkey</b> at the publick door.')
    rival.M.paint.color.set('#5b5f52')
    return
  }
  if (dmg > 6) {
    say(OUCH[game.rams % OUCH.length], 1.6)
    if (game.pathI < PATH.length) return // still threading out of the station: no room to run
    // Run from the Galaxie for a moment, to whichever corner of the lot is farthest from it.
    game.ai = 'evade'; game.aiT = 2 + Math.random() * 1.6
    game.target.copy(WAYPOINTS.reduce((b, w) => (w.distanceTo(P.pos) > b.distanceTo(P.pos) ? w : b)))
  }
}

// --- his weapon: ten cans of cranberry sauce, lobbed into the open-top Galaxie ------------------
// The car shrugs them off; the two of you don't. You have a smaller bar than the car does.
const canGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.3, 12)
const canMat = [new THREE.MeshStandardMaterial({ color: '#7a1230', roughness: 0.4, metalness: 0.3 }), new THREE.MeshStandardMaterial({ color: '#c9cdd0', metalness: 0.9, roughness: 0.3 }), new THREE.MeshStandardMaterial({ color: '#c9cdd0', metalness: 0.9, roughness: 0.3 })]
const cans = Array.from({ length: 10 }, () => { const mesh = new THREE.Mesh(canGeo, canMat); mesh.visible = false; mesh.castShadow = true; scene.add(mesh); return { mesh, vel: new V3(), live: false } })
const splatGeo = new THREE.CircleGeometry(0.7, 14); splatGeo.rotateX(-Math.PI / 2)
const splats = new THREE.InstancedMesh(splatGeo, new THREE.MeshBasicMaterial({ color: '#7a1230', transparent: true, opacity: 0.8, depthWrite: false }), 24)
splats.count = 0; splats.frustumCulled = false; scene.add(splats)
let splatI = 0
const CAN_G = 14
function hurt(amount) {
  if (game.state !== 'chase' && game.state !== 'claim') return
  game.people = Math.max(0, game.people - amount)
  $('peopleBar').classList.remove('flashbar'); void $('peopleBar').offsetWidth; $('peopleBar').classList.add('flashbar')
  if (game.people <= 0) { game.state = 'lost'; banner('CRANBERRIED', 'You two took one can too many.', 'bad') }
}
function throwCan() {
  const c = cans.find((c) => !c.live); if (!c) return
  const dist = R.pos.distanceTo(P.pos), T = THREE.MathUtils.clamp(dist / 20, 0.65, 1.25)
  // Lead the Galaxie, with some scatter: about half of them land.
  const aim = P.pos.clone().addScaledVector(P.vel, T * 0.9).add(new V2((Math.random() - 0.5) * 3.4, (Math.random() - 0.5) * 3.4))
  const y0 = GY + 1.9, y1 = GY + 0.9
  // Out of the driver's open window, forward or back: wherever the Galaxie is.
  const from = R.pos.clone().addScaledVector(new V2(Math.cos(R.heading), -Math.sin(R.heading)), 0.9)
  c.mesh.position.set(from.x, y0, from.y); c.mesh.visible = true; c.live = true
  c.vel.set((aim.x - from.x) / T, (y1 - y0 + 0.5 * CAN_G * T * T) / T, (aim.y - from.y) / T)
  // Every can hits the same: seven hits and you two are done.
  c.big = false; c.mesh.scale.setScalar(1)
  game.cans--; game.throwCool = 2 + Math.random() * 2.2
  if (game.cans === 0 && game.state === 'chase') say('I’M OUT OF SAUCE!', 2)
  if (game.cans === 9) { say('EAT CRANBERRY!', 1.5); game.sodaReady = true; $('bubble2').textContent = 'LET’S THROW SODA CANS AT HIM!'; $('bubble2').classList.add('show'); game.b2T = 3; objective(TOUCH ? '<b>Ram the wagon</b> — and tap <b>SODA</b> to throw soda cans at him.' : '<b>Ram the wagon</b> — and press <b>F</b> to throw soda cans at him.') }
}
function updateCans(dt) {
  const s = game.state
  if (s === 'chase' && game.health > 0) {
    game.throwCool -= dt
    const d = R.pos.distanceTo(P.pos)
    // He always keeps one can back for after his wagon is wrecked.
    if (game.cans > 1 && game.throwCool <= 0 && d < 28 && d > 5) throwCan()
  }
  // Wrecked, he still gets his saved can off: one spiteful throw from the dead wagon.
  if (s === 'claim' && game.cans > 0) {
    game.lastCanT = (game.lastCanT ?? 1.4) - dt
    if (game.lastCanT <= 0 && R.pos.distanceTo(P.pos) < 30) { say('ONE LAST CAN, YOU TURKEYS!', 2.2); throwCan() }
  }
  for (const c of cans) {
    if (!c.live) continue
    c.vel.y -= CAN_G * dt; c.mesh.position.addScaledVector(c.vel, dt); c.mesh.rotation.x += dt * 9; c.mesh.rotation.z += dt * 5
    const p = c.mesh.position, rel = new V2(p.x - P.pos.x, p.z - P.pos.y), f = P.f, along = rel.dot(f), across = rel.x * f.y - rel.y * f.x
    const inCar = Math.abs(along) < 2.75 && Math.abs(across) < 1.05
    if (c.vel.y < 0 && inCar && p.y < GY + 1.25) {
      c.live = false; c.mesh.visible = false
      burst(new V2(p.x, p.z), 4, true, false, '#8e1436'); S.hit = Math.max(S.hit, 0.45); audio.crash(0.35)
      game.canHits = (game.canHits || 0) + 1
      game.armor = Math.max(0, game.armor - 3.5); hurt(game.canHits >= 7 ? 999 : 100 / 7 + 0.01); flash('SPLAT! ' + game.canHits + '/7'); S.hit = 0.7
      $('bubble2').textContent = game.canHits >= 5 ? 'OUCH!!' : 'OUCH!'; $('bubble2').classList.add('show'); game.b2T = 1.3
    } else if (p.y < GY + 0.1) {
      c.live = false; c.mesh.visible = false
      burst(new V2(p.x, p.z), 4, false, false, '#8e1436')
      skidM.compose(new V3(p.x, GY + 0.04, p.z), skidQ.identity(), one); splats.setMatrixAt(splatI++ % 24, skidM); splats.count = Math.min(24, splatI); splats.instanceMatrix.needsUpdate = true
    }
  }
}

// --- her weapon: three soda cans, thrown back at the wagon once he has started it -------------
const sodaMat = [new THREE.MeshStandardMaterial({ color: '#1f6fd0', roughness: 0.35, metalness: 0.4 }), new THREE.MeshStandardMaterial({ color: '#c9cdd0', metalness: 0.9, roughness: 0.3 }), new THREE.MeshStandardMaterial({ color: '#c9cdd0', metalness: 0.9, roughness: 0.3 })]
const sodas = Array.from({ length: 3 }, () => { const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.26, 12), sodaMat); mesh.visible = false; mesh.castShadow = true; scene.add(mesh); return { mesh, vel: new V3(), live: false } })
function chrisSays(text, t) { $('bubble3').textContent = text; $('bubble3').classList.add('show'); game.b3T = t }
function freeDrive() {
  if (game.state === 'cutscene') { R.pos.copy(R_START.pos); R.heading = R_START.heading; R.vel.set(0, 0) }
  game.state = 'free'; camMode = 0; R.vel.set(0, 0)
  for (const id of ['bubble', 'bubble2', 'bubble3', 'banner']) $(id).classList.remove('show')
  for (const c of cans) { c.live = false; c.mesh.visible = false }
  $('mission').style.display = 'none'; $('sodaBtn').style.display = 'none'; flash('FREE DRIVE'); objective('<b>Free drive</b> — no turkey, no Phillip. <b>R</b> to play again.')
}
function throwSoda() {
  if (game.state !== 'chase' || !game.sodaReady || game.soda <= 0) return
  const c = sodas.find((c) => !c.live); if (!c) return
  const dist = R.pos.distanceTo(P.pos); if (dist > 32) { flash('TOO FAR!'); return }
  const T = THREE.MathUtils.clamp(dist / 22, 0.5, 1.2)
  const aim = R.pos.clone().addScaledVector(R.vel, T * 0.9).add(new V2((Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.6))
  const from = P.pos.clone().addScaledVector(new V2(Math.cos(P.heading), -Math.sin(P.heading)), -0.5), y0 = GY + 1.7, y1 = GY + 1.2
  c.mesh.position.set(from.x, y0, from.y); c.mesh.visible = true; c.live = true
  c.vel.set((aim.x - from.x) / T, (y1 - y0 + 0.5 * CAN_G * T * T) / T, (aim.y - from.y) / T)
  game.soda--
}
function updateSodas(dt) {
  if (game.b3T > 0) { game.b3T -= dt; if (game.b3T <= 0) $('bubble3').classList.remove('show') }
  if (game.b2T > 0) { game.b2T -= dt; if (game.b2T <= 0 && game.state !== 'cutscene') $('bubble2').classList.remove('show') }
  for (const c of sodas) {
    if (!c.live) continue
    c.vel.y -= CAN_G * dt; c.mesh.position.addScaledVector(c.vel, dt); c.mesh.rotation.x += dt * 10; c.mesh.rotation.z += dt * 6
    const p = c.mesh.position, rel = new V2(p.x - R.pos.x, p.z - R.pos.y), f = R.f
    if (c.vel.y < 0 && Math.abs(rel.dot(f)) < R.hl && Math.abs(rel.x * f.y - rel.y * f.x) < R.hw && p.y < GY + 2.0) {
      // Fizz: a good deal less than a ram.
      c.live = false; c.mesh.visible = false; burst(new V2(p.x, p.z), 7, true, false, '#bfe3ff'); audio.crash(0.25)
      if (game.state === 'chase') {
        game.health = Math.max(0, game.health - 6); say('HEY! THAT’S STICKY!', 1.4); chrisSays('GREAT THROW, HONEY!', 2)
        $('rivalBar').classList.remove('flashbar'); void $('rivalBar').offsetWidth; $('rivalBar').classList.add('flashbar')
        if (game.health <= 0) { game.state = 'claim'; say('OKAY, OKAY! TAKE THE BIRD!', 4); flash('WRECKED!'); objective('Now grab the <b>last turkey</b> at the publick door.'); rival.M.paint.color.set('#5b5f52') }
      }
    } else if (p.y < GY + 0.1) { c.live = false; c.mesh.visible = false; burst(new V2(p.x, p.z), 3, true, false, '#bfe3ff') }
  }
}

function update(dt) {
  game.t += dt; game.hitCool -= dt
  if (game.bubbleT > 0) { game.bubbleT -= dt; if (game.bubbleT <= 0) $('bubble').classList.remove('show') }
  const s = game.state
  if (s === 'intro') return
  if (s === 'cutscene') {
    // Bubbles only: he shouts from the next lane, she answers, and he's off a second before you.
    if (game.t < 4.3) { R.pos.copy(R_START.pos); R.heading = R_START.heading; R.vel.set(0, 0); R.fwd = 0 }
    else R.step(dt, rivalInput(dt))
    if (game.t > 0.5 && game.t < 0.7 && game.bubbleT <= 0) say('THERE’S ONLY ONE MORE TURKEY AT PUBLICK — GOT TO GET IT!', 3.5)
    $('bubble2').classList.toggle('show', game.t > 2.9 && game.t < 5.4)
    objective('…')
    if (game.t > 5.4) { game.state = 'chase'; $('bubble').classList.remove('show'); $('bubble2').classList.remove('show'); game.bubbleT = 0; flash('RAM HIM!'); objective((TOUCH ? '<b>Back out (BRAKE)</b>' : '<b>Back out (S)</b>') + ', then ram the wagon before he grabs the last turkey at publick.') }
    return
  }
  const live = s === 'chase' || s === 'claim'
  const bumped = P.step(dt, live || s === 'free' ? playerInput() : NONE)
  if (bumped > 3) { S.hit = Math.min(1, bumped / 15); audio.crash(Math.min(1, bumped / 16)) }
  // Hitting things hurts the Galaxie too: walls, buildings, pumps, parked cars, poles.
  game.wallCool = (game.wallCool ?? 0) - dt
  if (bumped > 4 && live && game.wallCool <= 0) {
    game.wallCool = 0.5
    game.armor = Math.max(0, game.armor - THREE.MathUtils.clamp((bumped - 3) * 1.0, 1.6, 14))
    hurt(THREE.MathUtils.clamp((bumped - 3) * 0.3, 0.5, 4))
    burst(P.pos.clone().addScaledVector(P.f, 2.4), 5, true)
    $('armorBar').classList.remove('flashbar'); void $('armorBar').offsetWidth; $('armorBar').classList.add('flashbar')
    if (game.armor <= 0 && (s === 'chase' || s === 'claim')) { game.state = 'lost'; banner('GALAXIE TOTALED', 'Even a Galaxie has limits. Mind the walls.', 'bad') }
  }
  R.step(dt, s === 'chase' ? rivalInput(dt) : s === 'lost' ? { throttle: 0, steer: 0, handbrake: true } : NONE)
  updateCans(dt); updateSodas(dt)
  const hit = collideCars(P, R)
  if (hit) ram(hit, dt)
  if (s === 'chase') {
    const at = R.pos.distanceTo(DOOR) < ZONE_R && Math.abs(R.fwd) < 3
    game.touchT = (game.touchT ?? 0) - dt
    if (at && game.touchT <= 0) game.grab = Math.min(1, game.grab + dt / 14)
    if (game.grab >= 1) {
      game.state = 'lost'; prizeTurkey.visible = false; marker.visible = false
      say('GOBBLE GOBBLE! IT’S OURS!', 6); banner('TURKEY LOST', 'They got the last one. It’s ham this year.', 'bad')
    }
  }
  if (s === 'claim' && P.pos.distanceTo(DOOR) < ZONE_R - 1 && Math.abs(P.fwd) < 9) {
    game.state = 'won'; prizeTurkey.visible = false; marker.visible = false; backSeatTurkey.visible = true
    audio.fanfare(); banner('LAST TURKEY SECURED', `Happy Thanksgiving — ${game.rams} ram${game.rams === 1 ? '' : 's'}`, 'good')
  }
  // Smoke from the wagon as it takes damage.
  if (game.health < 65 && Math.random() < (1 - game.health / 65) * 0.5 + (game.health <= 0 ? 0.4 : 0)) {
    burst(R.pos.clone().addScaledVector(R.f, 1.5), 1, false, game.health <= 0)
  }
  if (game.armor < 45 && Math.random() < (1 - game.armor / 45) * 0.4) burst(P.pos.clone().addScaledVector(P.f, 2.2), 1, false, false)
}

// S keeps the camera's shake; the vehicles carry the rest.
const S = { hit: 0 }
function placeCars(t) {
  const k = 0.25
  P.gy = P.gy === undefined ? groundAt(P.pos) : P.gy + (groundAt(P.pos) - P.gy) * k; R.gy = R.gy === undefined ? groundAt(R.pos) : R.gy + (groundAt(R.pos) - R.gy) * k
  car.position.set(P.pos.x, P.gy, P.pos.y); car.rotation.y = P.heading
  body.position.y = P.bounce; body.rotation.set(P.pitch, 0, P.roll)
  for (const w of wheels) { w.spin.rotation.x = P.wheelRot; if (w.front) w.group.rotation.y = P.steer * 0.7 }
  steering.userData.spin.rotation.z = -P.steer * 2.2
  rivalCar.position.set(R.pos.x, R.gy, R.pos.y); rivalCar.rotation.y = R.heading
  for (const w of rival.wheels) { w.spin.rotation.x = R.wheelRot; if (w.front) w.group.rotation.y = R.steer * 0.7 }
  rival.steering.userData.spin.rotation.z = -R.steer * 2.2
  rivalBody.position.y = R.bounce + (game.health <= 0 ? -0.06 : 0); rivalBody.rotation.set(R.pitch + (game.health <= 0 ? 0.03 : 0), 0, R.roll)
  prizeTurkey.rotation.y = t * 0.9; prizeTurkey.position.y = 0.9 + Math.sin(t * 2.4) * 0.07
  markerMat.opacity = 0.22 + Math.sin(t * 4) * 0.08
}

// --- skid marks, sparks and smoke --------------------------------------------------
const SKIDS = 500
const skidGeo = new THREE.PlaneGeometry(0.22, 0.5); skidGeo.rotateX(-Math.PI / 2)
const skidMesh = new THREE.InstancedMesh(skidGeo, new THREE.MeshBasicMaterial({ color: '#111', transparent: true, opacity: 0.5, depthWrite: false }), SKIDS)
skidMesh.count = 0; skidMesh.frustumCulled = false; scene.add(skidMesh)
let skidIdx = 0
const skidM = new THREE.Matrix4(), skidQ = new THREE.Quaternion(), skidP = new V3(), one = new V3(1, 1, 1), UP = new V3(0, 1, 0)
function laySkid() {
  for (const w of wheels.filter((w) => !w.front)) {
    w.group.getWorldPosition(skidP); skidP.y = (P.gy ?? GY) + 0.035
    skidQ.setFromAxisAngle(UP, P.heading)
    skidM.compose(skidP, skidQ, one); skidMesh.setMatrixAt(skidIdx++ % SKIDS, skidM)
  }
  skidMesh.count = Math.min(SKIDS, skidIdx); skidMesh.instanceMatrix.needsUpdate = true
}
const puffTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64
  const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 2, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
})()
const puffs = Array.from({ length: 90 }, () => {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false })); sp.visible = false; scene.add(sp)
  return { sp, life: 0, max: 1, v: new V3(), grow: 1 }
})
let puffI = 0
function burst(at, n, spark, dark, color) {
  for (let i = 0; i < n; i++) {
    const p = puffs[puffI++ % puffs.length]
    p.sp.visible = true; p.sp.position.set(at.x + (Math.random() - 0.5) * 0.6, GY + 0.9 + Math.random() * 0.3, at.y + (Math.random() - 0.5) * 0.6)
    if (spark) { p.v.set((Math.random() - 0.5) * 9, 2 + Math.random() * 5, (Math.random() - 0.5) * 9); p.max = p.life = 0.35 + Math.random() * 0.3; p.grow = 0; p.sp.scale.setScalar(0.22); p.sp.material.color.set(color ?? (Math.random() > 0.5 ? '#ffd27a' : '#ff8a2a')) }
    else { p.v.set((Math.random() - 0.5) * 0.6, 1.4 + Math.random(), (Math.random() - 0.5) * 0.6); p.max = p.life = 1.6 + Math.random(); p.grow = 1.6; p.sp.scale.setScalar(0.7); p.sp.material.color.set(color ?? (dark ? '#2b2b2b' : '#c9c9c9')) }
    p.spark = spark
  }
}
function updatePuffs(dt) {
  for (const p of puffs) {
    if (p.life <= 0) { p.sp.visible = false; continue }
    p.life -= dt; p.sp.position.addScaledVector(p.v, dt)
    if (p.spark) p.v.y -= 16 * dt; else p.sp.scale.addScalar(p.grow * dt)
    p.sp.material.opacity = Math.max(0, p.life / p.max) * (p.spark ? 1 : 0.55)
  }
}

// --- cameras --------------------------------------------------------------------
let camMode = 0 // 0 chase, 1 close; 3 manual (tests)
// Zoom for the chase cams: mouse wheel, or Ctrl/Cmd with + and -.
let camZoom = 1
const TOUCH = matchMedia('(hover:none),(pointer:coarse)').matches
const zoomBy = (k) => { camZoom = THREE.MathUtils.clamp(camZoom * k, 0.45, 2.4) }
addEventListener('wheel', (e) => { if (game.state === 'intro') return; e.preventDefault(); zoomBy(Math.exp(e.deltaY * 0.0012)) }, { passive: false })
addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey)) return
  if (e.key === '=' || e.key === '+') { e.preventDefault(); zoomBy(0.88) } else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomBy(1 / 0.88) } else if (e.key === '0') { e.preventDefault(); camZoom = 1 }
})
const CAM_NAMES = ['CHASE CAM', 'CLOSE CAM']
function cycleCam() { camMode = (camMode + 1) % 2; flash(CAM_NAMES[camMode]) }
let orbitYaw = 0, orbitPitch = 0, dragging = false, lastDrag = -10, lx = 0, ly = 0
// Pinch with two fingers to zoom on phones; one finger drags the camera around.
const pts = new Map(); let pinch = 0
const pinchDist = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y) }
renderer.domElement.addEventListener('pointerdown', (e) => { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 2) { pinch = pinchDist(); dragging = false } else { dragging = true; lx = e.clientX; ly = e.clientY } })
const lift = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = 0; if (!pts.size) dragging = false }
addEventListener('pointerup', lift); addEventListener('pointercancel', lift)
addEventListener('pointermove', (e) => {
  if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
  if (pinch && pts.size === 2) { const d = pinchDist(); if (d > 10) { zoomBy(pinch / d); pinch = d } return }
  if (!dragging) return
  orbitYaw -= (e.clientX - lx) * 0.006; orbitPitch = THREE.MathUtils.clamp(orbitPitch + (e.clientY - ly) * 0.004, -0.25, 0.9)
  lx = e.clientX; ly = e.clientY; lastDrag = clock.elapsedTime
})
const camPos = new V3(), camLook = new V3()
let introT = 0
function updateCamera(dt) {
  const carP = new V3(P.pos.x, GY, P.pos.y), f = new V3(Math.sin(P.heading), 0, Math.cos(P.heading)), left = new V3(f.z, 0, -f.x)
  let want, look, fov = 52, snap = false
  if (camMode === 3) {
    want = window.__game.manual.pos.clone(); look = window.__game.manual.look.clone(); fov = window.__game.manual.fov ?? 40; snap = true
  } else if (game.state === 'intro') {
    // Sweep around the Galaxie with the store and its sign behind.
    introT += dt * 0.1
    // Drift across the street in front of the Galaxie, the two houses behind it.
    const a = Math.sin(introT) * 0.55
    want = carP.clone().add(new V3(Math.sin(a) * 5 + 8, 2.4 + Math.sin(introT * 0.7) * 0.4, 7))
    look = carP.clone().add(new V3(-2.5, 1.5, -3)); fov = 50
  } else if (game.state === 'cutscene') {
    // From down the street: both cars nose-in on their driveways, the two houses behind.
    const k = Math.min(1, game.t / 5.4), mid = new V3((P_START.pos.x + R_START.pos.x) / 2 - 0.5, GY, (P_START.pos.y + R_START.pos.y) / 2)
    want = mid.clone().add(new V3(15 - k * 2, 2.6, 6.2))
    look = mid.clone().add(new V3(0, 1.4, -1.5)); fov = 50
    snap = game.t < 0.05
  } else {
    if (!dragging && clock.elapsedTime - lastDrag > 1.6 && Math.abs(P.fwd) > 1) { orbitYaw *= Math.exp(-2.5 * dt); orbitPitch *= Math.exp(-2.5 * dt) }
    const [d0, h0] = camMode === 0 ? [8.2, 2.9] : [4.8, 2.0], dist = d0 * camZoom, height = h0 * (0.45 + 0.55 * camZoom)
    const yaw = P.heading + Math.PI + orbitYaw
    want = carP.clone().add(new V3(Math.sin(yaw) * dist * Math.cos(orbitPitch), height + Math.sin(orbitPitch) * dist, Math.cos(yaw) * dist * Math.cos(orbitPitch)))
    look = carP.clone().addScaledVector(f, camMode === 0 ? 2.4 : 0.6).add(new V3(0, 1.1, 0))
    fov = 54 + Math.min(14, Math.abs(P.fwd) * 0.45)
  }
  if (!camPos.lengthSq() || snap) { camPos.copy(want); camLook.copy(look) }
  camPos.lerp(want, 1 - Math.exp(-(game.state === 'intro' ? 2 : 5) * dt)); camLook.lerp(look, 1 - Math.exp(-9 * dt))
  camera.position.copy(camPos)
  if (S.hit > 0) { camera.position.add(new V3((Math.random() - 0.5) * S.hit * 0.3, (Math.random() - 0.5) * S.hit * 0.3, 0)); S.hit = Math.max(0, S.hit - dt * 3) }
  camera.lookAt(camLook)
  camera.fov += (fov - camera.fov) * (1 - Math.exp(-3 * dt)); camera.updateProjectionMatrix()
  sun.position.copy(carP).add(sunDir.clone().multiplyScalar(200)); sun.target.position.copy(carP)
}

// --- audio: a big V8 burble, horn, crunches ---------------------------------------
const audio = (() => {
  let ctx, eng, eng2, filt, gain, master, hornOsc, noise, muted = false
  return {
    start() {
      if (ctx) { ctx.state === 'suspended' && ctx.resume(); return }
      try {
        ctx = new AudioContext(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination)
        filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 400; filt.Q.value = 4
        gain = ctx.createGain(); gain.gain.value = 0.0; filt.connect(gain); gain.connect(master)
        eng = ctx.createOscillator(); eng.type = 'sawtooth'; eng2 = ctx.createOscillator(); eng2.type = 'square'
        eng.connect(filt); const g2 = ctx.createGain(); g2.gain.value = 0.35; eng2.connect(g2); g2.connect(filt)
        eng.start(); eng2.start()
        noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate)
        const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2
      } catch { ctx = null }
    },
    update(rpm, throttle) {
      if (!ctx) return
      const t = ctx.currentTime, hz = 32 + rpm * 95
      eng.frequency.setTargetAtTime(hz, t, 0.05); eng2.frequency.setTargetAtTime(hz * 0.5 + Math.sin(t * 31) * 2, t, 0.05)
      filt.frequency.setTargetAtTime(260 + rpm * 900 + throttle * 300, t, 0.08)
      gain.gain.setTargetAtTime(muted ? 0 : 0.12 + rpm * 0.16, t, 0.1)
    },
    horn(on) {
      if (!ctx) return
      if (on && !hornOsc && !muted) {
        hornOsc = [370, 466].map((f) => { const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f; const g = ctx.createGain(); g.gain.value = 0.06; o.connect(g); g.connect(master); o.start(); return o })
      } else if (!on && hornOsc) { hornOsc.forEach((o) => o.stop()); hornOsc = null }
    },
    crash(s) {
      if (!ctx || muted || s < 0.1) return
      const src = ctx.createBufferSource(); src.buffer = noise; const g = ctx.createGain(); g.gain.value = 0.9 * s
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900 + s * 2500
      src.connect(lp); lp.connect(g); g.connect(master); src.start()
      const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = 62; og.gain.value = 0.5 * s
      og.gain.setTargetAtTime(0, ctx.currentTime, 0.09); o.connect(og); og.connect(master); o.start(); o.stop(ctx.currentTime + 0.5)
    },
    fanfare() {
      if (!ctx || muted) return
      ;[392, 494, 587, 784].forEach((f, i) => { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f; const g = ctx.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(0.18, ctx.currentTime + i * 0.14, 0.01); g.gain.setTargetAtTime(0, ctx.currentTime + i * 0.14 + 0.25, 0.08); o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + 1.5) })
    },
    toggle() { muted = !muted; flash(muted ? 'SOUND OFF' : 'SOUND ON') },
  }
})()

// --- HUD ------------------------------------------------------------------------
const mm = $('minimap').getContext('2d')
function drawMinimap() {
  const W = 200, s = 0.62, rot = P.heading - Math.PI
  mm.clearRect(0, 0, W, W)
  mm.save(); mm.beginPath(); mm.arc(W / 2, W / 2, W / 2 - 2, 0, Math.PI * 2); mm.clip()
  mm.fillStyle = 'rgba(52,74,52,0.9)'; mm.fillRect(0, 0, W, W)
  mm.translate(W / 2, W / 2 + 24); mm.rotate(rot); mm.scale(s, s); mm.translate(-P.pos.x, -P.pos.y)
  mm.fillStyle = '#7f868a'; for (const { poly } of regions) { mm.beginPath(); poly.forEach((p, i) => (i ? mm.lineTo(p.x, p.y) : mm.moveTo(p.x, p.y))); mm.fill() }
  mm.fillStyle = '#e9dcb8'
  for (const b of boxes) {
    const zx = -b.a.y, zy = b.a.x
    mm.beginPath()
    ;[[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([ex, ez], i) => { const x = b.c.x + b.a.x * b.hx * ex + zx * b.hz * ez, y = b.c.y + b.a.y * b.hx * ex + zy * b.hz * ez; i ? mm.lineTo(x, y) : mm.moveTo(x, y) })
    mm.fill()
  }
  mm.fillStyle = '#5d666b'; for (const [x, z] of DATA.cars) { mm.beginPath(); mm.arc(x, z, 2, 0, 7); mm.fill() }
  mm.restore()
  const blip = (p, color, label, r = 8) => {
    const dx = p.x - P.pos.x, dz = p.y - P.pos.y
    let px = (dx * Math.cos(rot) - dz * Math.sin(rot)) * s, pz = (dx * Math.sin(rot) + dz * Math.cos(rot)) * s + 24
    const len = Math.hypot(px, pz), lim = W / 2 - 13
    if (len > lim) { px *= lim / len; pz *= lim / len }
    mm.fillStyle = color; mm.beginPath(); mm.arc(W / 2 + px, W / 2 + pz, r, 0, Math.PI * 2); mm.fill()
    mm.strokeStyle = '#000'; mm.lineWidth = 1.5; mm.stroke()
    if (label) { mm.fillStyle = '#111'; mm.font = 'bold 11px Oswald, sans-serif'; mm.textAlign = 'center'; mm.textBaseline = 'middle'; mm.fillText(label, W / 2 + px, W / 2 + pz + 1) }
  }
  if (prizeTurkey.visible) blip(DOOR, '#ffd23a', 'T', 9)
  blip(R.pos, game.health > 0 ? '#ff3b30' : '#777', '', 6)
  mm.fillStyle = '#fff'; mm.beginPath(); mm.moveTo(W / 2, W / 2 + 14); mm.lineTo(W / 2 - 7, W / 2 + 32); mm.lineTo(W / 2, W / 2 + 28); mm.lineTo(W / 2 + 7, W / 2 + 32); mm.fill()
  mm.strokeStyle = 'rgba(0,0,0,.7)'; mm.lineWidth = 3; mm.beginPath(); mm.arc(W / 2, W / 2, W / 2 - 2, 0, Math.PI * 2); mm.stroke()
}
let flashT = 0
function flash(t) { $('flash').textContent = t; $('flash').classList.add('show'); flashT = 1.6 }
const proj = new V3()
function hud() {
  $('mph').textContent = String(Math.round(Math.abs(P.fwd) * 2.237)).padStart(2, '0')
  $('rivalFill').style.width = `${game.health}%`
  $('armorFill').style.width = `${game.armor}%`
  $('peopleFill').style.width = `${game.people}%`
  $('sodas').textContent = game.sodaReady ? '●'.repeat(game.soda) : ''
  $('cans').textContent = '●'.repeat(game.cans)
  $('grabFill').style.width = `${game.grab * 100}%`
  $('grabRow').classList.toggle('warn', game.grab > 0.02 && game.state === 'chase')
  // The speech bubble rides over the wagon.
  proj.set(R.pos.x + Math.sin(R.heading) * 0.9, GY + 2.9, R.pos.y + Math.cos(R.heading) * 0.9).project(camera)
  const b = $('bubble')
  if (proj.z < 1) { b.style.left = `${(proj.x * 0.5 + 0.5) * innerWidth}px`; b.style.top = `${(-proj.y * 0.5 + 0.5) * innerHeight}px`; b.style.visibility = 'visible' } else b.style.visibility = 'hidden'
  // Over her head: the passenger seat is on the car's right.
  { const h = P.heading, sx = -0.4, sz = -0.22; proj.set(P.pos.x + sx * Math.cos(h) + sz * Math.sin(h), GY + 2.25, P.pos.y - sx * Math.sin(h) + sz * Math.cos(h)).project(camera) }
  const b2 = $('bubble2'); b2.style.left = `${(proj.x * 0.5 + 0.5) * innerWidth}px`; b2.style.top = `${(-proj.y * 0.5 + 0.5) * innerHeight}px`
  // Over Chris, in the driver's seat on the left.
  { const h = P.heading, sx = -0.4, sz = 0.22; proj.set(P.pos.x + sx * Math.cos(h) + sz * Math.sin(h), GY + 2.25, P.pos.y - sx * Math.sin(h) + sz * Math.cos(h)).project(camera) }
  const b3 = $('bubble3'); b3.style.left = `${(proj.x * 0.5 + 0.5) * innerWidth}px`; b3.style.top = `${(-proj.y * 0.5 + 0.5) * innerHeight - ($('bubble2').classList.contains('show') ? 64 : 0)}px`
  drawMinimap()
}

// --- loop -----------------------------------------------------------------------
const clock = new THREE.Clock()
let blinkT = 2, lastSkid = 0, lookYaw = 0
const yawQ = new THREE.Quaternion()
function frame() {
  const dt = Math.min(clock.getDelta(), 1 / 20), t = clock.elapsedTime
  update(dt)
  placeCars(t)
  chrisMixer.update(dt); womanMixer.update(dt); twinMixer.update(dt)
  // Heads. Both of them keep an eye on the wagon; he also looks into his turns.
  const toR = R.pos.clone().sub(P.pos), bearing = wrap(Math.atan2(toR.x, toR.y) - P.heading)
  const watch = game.state === 'intro' ? Math.sin(t * 0.5) * 0.3 : THREE.MathUtils.clamp(bearing, -1.15, 1.15)
  lookYaw += (watch - lookYaw) * (1 - Math.exp(-4 * dt))
  chrisHead.rotation.y += P.steer * 0.4 + lookYaw * (game.state === 'cutscene' ? 0.8 : 0.25)
  womanHead.quaternion.copy(womanHeadRest).multiply(yawQ.setFromAxisAngle(UP, lookYaw * 0.65))
  if (womanNeck) womanNeck.quaternion.copy(womanNeckRest).multiply(yawQ.setFromAxisAngle(UP, lookYaw * 0.3))
  // The twin leans out to talk at the pumps, and glares over when you get close.
  const toP = P.pos.clone().sub(R.pos), back = wrap(Math.atan2(toP.x, toP.y) - R.heading)
  twinHead.rotation.y += THREE.MathUtils.clamp(back, -1.2, 1.2) * (game.state === 'cutscene' ? 0.9 : toP.length() < 12 ? 0.5 : 0) + R.steer * 0.4
  for (let i = 0; i < wavers.length; i++) wavers[i].rotation.z = -0.5 + Math.sin(t * 5 + i * 1.7) * 0.45
  blinkT -= dt
  const blink = blinkT < 0.12 ? 1 : 0; if (blinkT < 0) blinkT = 2 + Math.random() * 3
  for (const b of blinkMeshes) for (const i of b.idx) b.m.morphTargetInfluences[i] = blink
  if (P.skid > 0.4 && t - lastSkid > 0.035 && game.state !== 'intro') { laySkid(); lastSkid = t }
  updatePuffs(dt)
  updateCamera(dt)
  audio.update(P.rpm, Math.max(0, playerInput().throttle))
  hud()
  if (flashT > 0) { flashT -= dt; if (flashT <= 0) $('flash').classList.remove('show') }
  renderer.render(scene, camera)
  requestAnimationFrame(frame)
}

addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight) })
reset(false)
$('loading').classList.add('gone'); $('intro').classList.remove('gone')
if (params.has('play')) start()
requestAnimationFrame(frame)

// Test hooks.
window.__game = { throwSoda, dbg: { circles, boxes, regions, DATA }, PATH, rival, twin, sim: (secs) => { for (let i = 0; i < secs * 60; i++) update(1 / 60) }, game, P, R, camera, scene, setCam: (m) => { camMode = m }, keys, start, reset, DOOR, V3, GY, wheels }
