import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { buildGalaxie, buildSUV, CAR, SUV } from './car.js'
import { makeCarParts } from '/home/claude/3d-world/st-aug-anastasia-beach/world/car-kit'
import { dressStation, PED_BED } from './station.js'
import BILLBOARD from './billboard-img.js'
import SHERIFF_IMG from './sheriff-img.js'
import FORT_IMG from './fort-img.js'

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
// The neighborhood's street meets A1A S at the tip now (moved +1.5, +5.6).
const HD = [3.4, 14.6]
const driveNear = (hx) => DATA.drives.filter((d) => d[1] / U < 388.5 + HD[1] && d[1] / U > 386 + HD[1]).reduce((b, d) => (Math.abs(d[0] / U - hx) < Math.abs(b[0] / U - hx) ? d : b))
const HOME = { me: driveNear(-115.34 + HD[0]), them: driveNear(-118.84 + HD[0]) }
const P_START = { pos: new V2(HOME.me[0], HOME.me[1]), heading: Math.PI }
const R_START = { pos: new V2(HOME.them[0], HOME.them[1] + 0.3), heading: Math.PI }
// The wagon's way: down the street, round the tip past the welcome sign, into the gas station from A1A Beach Blvd,
// up the back of the Square K and the bank, through the OOPS Store's boxes, out onto the boulevard and in at the plaza entrance.
const PATH = [u2(-110.1, 403.9), u2(-101.6, 403.8), u2(-94.1, 404.0), u2(-91.7, 405.2), u2(-90.7, 408.5), u2(-89.9, 412.2), u2(-88.7, 414.4), u2(-87.5, 412.6), u2(-86.5, 410.0), u2(-85.5, 407.6), u2(-85.0, 405.2), u2(-85.45, 402.9), u2(-84.9, 401.4), u2(-83.4, 399.6), u2(-83.5, 397.6), u2(-83.9, 395.6), u2(-84.9, 394.0), u2(-86.6, 392.8), u2(-89.6, 392.9), u2(-91.4, 391.0), u2(-91.8, 387.0), u2(-91.8, 384.4), u2(-91.2, 382.3), u2(-90.9, 379.5), u2(-90.3, 377.4), u2(-88.0, 376.6), u2(-85.6, 377.0), u2(-83.6, 376.4), u2(-81.6, 373.6), u2(-79.2, 367.0), u2(-77.0, 360.0), u2(-75.5, 355.0), u2(-75.0, 352.4), u2(-76.8, 350.6), u2(-80.0, 349.3), u2(-83.5, 348.2)]
// The pump apron is a slab a little higher than the lot.
const APRON = { x0: -91.6 * U, x1: -85.4 * U, z0: 386.9 * U, z1: 393.1 * U, y: 0.065 * U + 0.005 }
const groundAt = (p) => (p.x > APRON.x0 && p.x < APRON.x1 && p.y > APRON.z0 && p.y < APRON.z1 ? APRON.y : GY)
const WAYPOINTS = [u2(-79.4, 349.5), u2(-77.5, 343.8), u2(-88.4, 357), u2(-84.8, 366), u2(-81.2, 358)]

// A1A S along the west side (both carriageways and the median), blocked at the same two places.
// A1A S is one road now (two lanes and a centre turn lane); this line runs 1.1 east of its centre, so the drivable band (to 2.9 west of it) covers the whole road.
const ROAD_W = [[-106.34, 340], [-104.07, 350], [-101.79, 360], [-99.51, 370], [-97.23, 380], [-94.95, 390], [-92.68, 400], [-90.4, 410], [-88.58, 418], [-84.93, 434]].map(([x, z]) => [x + 1.1, z])
const $ = (id) => document.getElementById(id)
const params = new URLSearchParams(location.search)

// --- renderer, scene, sky ---------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, stencil: true, logarithmicDepthBuffer: true, powerPreference: 'high-performance', preserveDrawingBuffer: params.has('shot') })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 0.78
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
$('stage').appendChild(renderer.domElement)

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.3, 1500)

// Thanksgiving afternoon: the sun low in the south-west sky, warm and gold, throwing long shadows across the lot.
const sunDir = new V3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 27), THREE.MathUtils.degToRad(62))
// A painted sky dome: deep blue overhead fading to a pale hazy horizon, a warm glow round the sun and the sun's disc.
// It is drawn without tone mapping, so the blue stays blue instead of washing out grey.
const HORIZON = new THREE.Color('#d9e6ef')
const makeSky = () => new THREE.Mesh(new THREE.SphereGeometry(1200, 48, 24), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false, toneMapped: false,
  uniforms: { sunDir: { value: sunDir }, zen: { value: new THREE.Color('#2a63b8') }, mid: { value: new THREE.Color('#5d9be0') }, hor: { value: HORIZON }, low: { value: new THREE.Color('#c3cfd6') }, warm: { value: new THREE.Color('#ffc98a') }, disc: { value: new THREE.Color('#fff6e0') } },
  vertexShader: 'varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform vec3 sunDir, zen, mid, hor, low, warm, disc; varying vec3 vDir;
    void main() { vec3 d = normalize(vDir); float h = d.y, s = max(dot(d, normalize(sunDir)), 0.0);
      float t = pow(clamp(h, 0.0, 1.0), 0.5);
      vec3 c = h < 0.0 ? mix(hor, low, clamp(-h * 6.0, 0.0, 1.0)) : mix(mix(hor, mid, smoothstep(0.0, 0.45, t)), zen, smoothstep(0.4, 1.0, t));
      c = mix(c, warm, (1.0 - smoothstep(0.0, 0.35, abs(h))) * pow(s, 4.0) * 0.55);   // the horizon warms under the sun
      c += warm * (pow(s, 24.0) * 0.3 + pow(s, 400.0) * 0.55);                        // halo
      c = mix(c, disc * 1.6, smoothstep(0.99955, 0.99975, s));                        // the disc
      gl_FragColor = vec4(c, 1.0);
      #include <colorspace_fragment>
    }` }))
// The same sky lights the scene: rendered once into an environment map for the reflections and soft fill.
const skyDome = makeSky(); skyDome.renderOrder = -2; scene.add(skyDome)
// A few soft fair-weather clouds, painted once and placed far out over the town.
{
  const tex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d')
    for (let i = 0; i < 22; i++) { const px = 40 + Math.random() * 176, py = 50 + Math.random() * 40, r = 18 + Math.random() * 30
      const gr = x.createRadialGradient(px, py, 0, px, py, r); gr.addColorStop(0, 'rgba(255,255,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(px - r, py - r, r * 2, r * 2) }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t })()
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, opacity: 0.92, toneMapped: false, color: '#fff7ec' }) // sunlit, a touch warm
  for (let i = 0; i < 14; i++) { const sp = new THREE.Sprite(mat), a = (i / 14) * Math.PI * 2 + Math.random() * 0.3, d = 650 + Math.random() * 350, w = 140 + Math.random() * 160
    sp.scale.set(w, w * 0.42, 1); sp.position.set(G.x + Math.cos(a) * d, 70 + Math.random() * 90, G.y + Math.sin(a) * d); sp.renderOrder = -1; scene.add(sp) }
}
const pmrem = new THREE.PMREMGenerator(renderer)
const envScene = new THREE.Scene(); envScene.add(makeSky())
scene.environment = pmrem.fromScene(envScene, 0, 0.1, 20000).texture
scene.environmentIntensity = 0.32
scene.fog = new THREE.Fog(HORIZON.clone(), 180, 620) // matched to the sky's horizon haze

scene.add(new THREE.HemisphereLight('#c3d3e6', '#8a7756', 0.95)) // blue sky above, warm sandy bounce below
const sun = new THREE.DirectionalLight('#ffd7a3', 4.2) // warm, golden afternoon sun
sun.castShadow = true
sun.shadow.mapSize.set(matchMedia('(pointer:coarse)').matches ? 2048 : 4096, matchMedia('(pointer:coarse)').matches ? 2048 : 4096) // crisper shadow edges on desktop
Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, near: 1, far: 400 })
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03
scene.add(sun, sun.target)
const _sr = new THREE.Vector3(), _su = new THREE.Vector3(), _sp = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0)

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
let catTail = null, catHead = null, CAT_X = 1.2, CAT_Y = 1.0, CAT_Z = 0.05
const SHERIFF = { x: -77.6, z: 377.2 }
const LIQUOR_LADY = (() => { const a = DATA.arcade || []; return a.length > 1 ? { x: a[1][0], z: a[1][1] } : null })() // the shopper by Publick Liquors
const FORT = { x: -69.4, z: 347.0 } // in the east tree line by the parade end, hanging out over A1A Beach Blvd
// "Call Christy Homes" billboard hugging the lot's west barrier north of Bumpkin', facing the road and Floridian.
{
  const bb = new THREE.Group(); bb.position.set(-92.42 * U, 0, 377.5 * U); bb.rotation.y = Math.atan2(-0.962, 0.273) + Math.PI / 2; scene.add(bb)
  const W = 12, H = W * 416 / 896, base = 4.2
  const tex = new THREE.TextureLoader().load(BILLBOARD); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4
  const dark = new THREE.MeshStandardMaterial({ color: '#23262b', roughness: 0.7, metalness: 0.3 })
  const face = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.12 }))
  face.position.set(0, base + H / 2, 0.16); bb.add(face)
  const back = face.clone(); back.position.z = -0.16; back.rotation.y = Math.PI; bb.add(back) // same picture on both sides
  const frame = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, H + 0.4, 0.3), dark); frame.position.set(0, base + H / 2, 0); frame.castShadow = true; bb.add(frame)
  const catwalk = new THREE.Mesh(new THREE.BoxGeometry(W + 0.6, 0.08, 0.9), dark); catwalk.position.set(0, base - 0.25, 0.5); bb.add(catwalk)
  for (const x of [-W / 2 + 0.3, W / 2 - 0.3]) { // poles at the ends so cars drive under
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, base, 10), dark); pole.position.set(x, base / 2, 0); pole.castShadow = true; bb.add(pole)
    bb.updateMatrixWorld(true); const wp = pole.getWorldPosition(new THREE.Vector3()); BB_POLES.push([wp.x, wp.z])
  }
  bb.updateMatrixWorld(true); BB_VIEW.look = bb.localToWorld(new THREE.Vector3(0, base + H / 2, 0)); BB_VIEW.pos = bb.localToWorld(new THREE.Vector3(0, base + H / 2 - 1.2, 14))
  for (let i = 0; i < 4; i++) {
    const x = -W / 2 + W * (i + 0.5) / 4
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.1), dark); arm.position.set(x, base + H + 0.35, 0.45); bb.add(arm)
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, 0.35), dark); lamp.position.set(x, base + H + 0.35, 1.0); bb.add(lamp)
  }
}

// Saint Ponce Sheriff's Office billboard: one pole on the east verge of A1A Beach Blvd, just past the bank's
// sign, with the face hanging out over the road for northbound drivers.
{
  const bb = new THREE.Group(); bb.position.set(SHERIFF.x * U, 0, SHERIFF.z * U); scene.add(bb)
  const W = 11, H = W * 445 / 832, base = 8.6, off = -5.2
  const tex = new THREE.TextureLoader().load(SHERIFF_IMG); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4
  const dark = new THREE.MeshStandardMaterial({ color: '#2a2d31', roughness: 0.65, metalness: 0.35 })
  const face = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.12 }))
  face.position.set(off, base + H / 2, 0.21); bb.add(face)
  const back = face.clone(); back.position.z = -0.21; back.rotation.y = Math.PI; bb.add(back) // both directions of traffic see it
  const frame = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, H + 0.4, 0.36), dark); frame.position.set(off, base + H / 2, 0); frame.castShadow = true; bb.add(frame)
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, base, 12), dark); pole.position.set(0, base / 2, 0); pole.castShadow = true; bb.add(pole)
  const beam = new THREE.Mesh(new THREE.BoxGeometry(W * 0.8, 0.35, 0.35), dark); beam.position.set(off, base - 0.18, 0); bb.add(beam)
  const catwalk = new THREE.Mesh(new THREE.BoxGeometry(W + 0.6, 0.08, 0.9), dark); catwalk.position.set(off, base - 0.25, 0.55); bb.add(catwalk)
  for (let i = 0; i < 4; i++) {
    const x = off - W / 2 + W * (i + 0.5) / 4
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.1), dark); arm.position.set(x, base + H + 0.35, 0.5); bb.add(arm)
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, 0.35), dark); lamp.position.set(x, base + H + 0.35, 1.05); bb.add(lamp)
  }
  BB_POLES.push([SHERIFF.x * U, SHERIFF.z * U])
}

// "Have You Seen Saint Ponce Fort?" — a single-post billboard whose face hangs out over the road.
{
  const bb = new THREE.Group(); bb.position.set(FORT.x * U, 0, FORT.z * U); bb.rotation.y = Math.atan2(-6.2, 19.7); scene.add(bb)
  const W = 11, H = W * 388 / 832, base = 7.2, off = -5.4
  const tex = new THREE.TextureLoader().load(FORT_IMG); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4
  const dark = new THREE.MeshStandardMaterial({ color: '#2a2d31', roughness: 0.65, metalness: 0.35 })
  const face = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.12 }))
  face.position.set(off, base + H / 2, 0.21); bb.add(face)
  const back = face.clone(); back.position.z = -0.21; back.rotation.y = Math.PI; bb.add(back)
  const frame = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, H + 0.4, 0.36), dark); frame.position.set(off, base + H / 2, 0); frame.castShadow = true; bb.add(frame)
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, base, 12), dark); pole.position.set(0, base / 2, 0); pole.castShadow = true; bb.add(pole)
  const beam = new THREE.Mesh(new THREE.BoxGeometry(W * 0.8, 0.35, 0.35), dark); beam.position.set(off, base - 0.18, 0); bb.add(beam)
  for (let i = 0; i < 4; i++) { const x = off - W / 2 + W * (i + 0.5) / 4
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.1), dark); arm.position.set(x, base + H + 0.35, 0.5); bb.add(arm)
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, 0.35), dark); lamp.position.set(x, base + H + 0.35, 1.05); bb.add(lamp) }
  BB_POLES.push([FORT.x * U, FORT.z * U])
}

// A cat in the front window of our house on Floridian, watching the street.
{
  const h = HOME.me, cat = new THREE.Group()
  const fur = new THREE.MeshStandardMaterial({ color: '#6b6153', roughness: 0.95 }), dark = new THREE.MeshStandardMaterial({ color: '#2b2620', roughness: 0.95 }), eye = new THREE.MeshStandardMaterial({ color: '#c8e04a', emissive: '#556600', emissiveIntensity: 0.4 }), pink = new THREE.MeshStandardMaterial({ color: '#e89aa0' })
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), fur); body.scale.set(1, 1.15, 0.85); body.position.y = 0.2; cat.add(body)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), fur); head.position.set(0, 0.5, 0.05); cat.add(head)
  for (const e of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.14, 4), fur); ear.position.set(e * 0.08, 0.66, 0.03); ear.rotation.z = -e * 0.3; cat.add(ear)
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 4), pink); inner.position.set(e * 0.08, 0.65, 0.06); inner.rotation.z = -e * 0.3; cat.add(inner)
    for (const k of [0, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.004, 0.004), new THREE.MeshBasicMaterial({ color: '#ffffff' })); w.position.set(e * 0.1, 0.47 + k * 0.02, 0.15); w.rotation.z = e * (k ? -0.15 : 0.15); cat.add(w) }
    const ey = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), eye); ey.position.set(e * 0.05, 0.52, 0.165); cat.add(ey)
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), fur); paw.position.set(e * 0.08, 0.04, 0.14); cat.add(paw)

  }
  for (const dx of [-0.035, 0, 0.035]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.06, 0.02), dark); st.position.set(dx, 0.6, 0.1); st.rotation.x = -0.6; cat.add(st) } // tabby stripes
  // Mackerel stripes: thin dark bands wrapping the body, rings on the tail, a dark line down the back.
  // Mackerel: narrow dark stripes running down the flanks like a fish skeleton, from a dark line on the back.
  for (const a of [0.55, 0.9, 1.25, 1.6, 1.95, 2.3]) for (const e of [-1, 1]) {
    const st = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.009, 4, 20, 1.5), dark)
    st.rotation.set(0, e * a, 0); st.rotation.order = 'YXZ'; const g = new THREE.Group(); g.add(st); st.rotation.z = 0.25; g.scale.set(1, 1.15, 0.85); g.position.y = 0.2; cat.add(g) }
  { const spine = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.36, 0.02), dark); spine.position.set(0, 0.22, -0.17); cat.add(spine) }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 4), pink); nose.position.set(0, 0.48, 0.18); cat.add(nose)
  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 6, 12, Math.PI * 1.1), dark); tail.position.set(0.12, 0.08, -0.05); tail.rotation.set(Math.PI / 2, 0, 0.6); cat.add(tail)
  cat.position.set(-471.04 + HD[0] * U, 1.08, 1581.33 + HD[1] * U); cat.rotation.y = 0.017; scene.add(cat); window.__cat = cat // on the sill of the front window, watching the street
  // She sits INSIDE the house, behind the front window: the window is a portal into a real little room.
  // 1) the window pane marks the stencil where it's visible, 2) resets depth there, 3) the room and the cat draw only there.
  { const wallZ = cat.position.z - 0.06, wx = cat.position.x + 0.08, wy0 = cat.position.y + 0.74, wy = wy0 + 0.08, W = 1.3, H = 1.52, yaw = cat.rotation.y
    const portalM = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp })
    const portal = new THREE.Mesh(new THREE.PlaneGeometry(W, H), portalM); portal.position.set(wx, wy, wallZ + 0.012); portal.rotation.y = yaw; portal.renderOrder = 10; scene.add(portal)
    const resetM = new THREE.MeshBasicMaterial({ colorWrite: false, depthFunc: THREE.AlwaysDepth, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.EqualStencilFunc })
    resetM.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <logdepthbuf_fragment>', 'gl_FragDepth = 1.0;') }
    const reset = portal.clone(); reset.material = resetM; reset.renderOrder = 11; scene.add(reset)
    const inside = (m) => { m.stencilWrite = true; m.stencilRef = 1; m.stencilFunc = THREE.EqualStencilFunc; m.stencilZPass = THREE.KeepStencilOp; return m }
    const room = new THREE.Group(); room.position.set(wx, wy, wallZ); room.rotation.y = yaw; scene.add(room)
    const part = (geo, color, x, y, z, basic = true) => { const m = new THREE.Mesh(geo, inside(basic ? new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }) : new THREE.MeshLambertMaterial({ color }))); m.position.set(x, y, z); m.renderOrder = 12; room.add(m); return m }
    part(new THREE.PlaneGeometry(4.2, 3.0), '#6e5a46', 0, 0.2, -3.2)                                    // back wall, warm in the lamplight
    for (const e of [-1, 1]) part(new THREE.PlaneGeometry(3.2, 3.0), '#5e4c3b', e * 2.1, 0.2, -1.6).rotation.y = Math.PI / 2 // side walls
    part(new THREE.PlaneGeometry(4.2, 3.2), '#4d3f32', 0, 1.7, -1.6).rotation.x = Math.PI / 2           // ceiling
    part(new THREE.PlaneGeometry(4.2, 3.2), '#3a2e24', 0, -1.25, -1.6).rotation.x = -Math.PI / 2           // floor
    part(new THREE.BoxGeometry(1.5, 0.06, 0.7), '#7a5434', 0.55, -0.45, -2.3, false); for (const dx of [-0.15, 1.25]) part(new THREE.BoxGeometry(0.06, 0.8, 0.6), '#5a3c24', dx, -0.85, -2.3, false) // desk
    part(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 6), '#222222', 1.0, -0.2, -2.45); const shade = part(new THREE.CylinderGeometry(0.12, 0.2, 0.22, 12), '#ffe2a8', 1.0, 0.05, -2.45) // lamp
    const glowC = document.createElement('canvas'); glowC.width = glowC.height = 128; { const x = glowC.getContext('2d'), gr = x.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(255,214,150,0.8)'); gr.addColorStop(1, 'rgba(255,214,150,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128) }
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), inside(new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(glowC), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))); glow.position.set(1.0, 0.0, -2.9); glow.renderOrder = 13; room.add(glow)
    part(new THREE.BoxGeometry(0.5, 0.03, 0.34), '#2a2a2e', 0.4, -0.41, -2.3); const scr = part(new THREE.PlaneGeometry(0.46, 0.3), '#8fb3d9', 0.4, -0.26, -2.46); scr.rotation.x = -0.2 // laptop
    part(new THREE.BoxGeometry(0.5, 0.06, 0.5), '#3b2a1e', 0.5, -0.8, -1.75, false); part(new THREE.BoxGeometry(0.5, 0.7, 0.06), '#3b2a1e', 0.5, -0.45, -1.52, false) // chair
    part(new THREE.PlaneGeometry(0.6, 0.45), '#c9b48a', -1.1, 0.35, -3.18); part(new THREE.PlaneGeometry(0.5, 0.36), '#4f7a99', -1.1, 0.35, -3.17) // a beach picture
    part(new THREE.BoxGeometry(W + 0.2, 0.06, 0.4), '#efe9dc', 0, -H / 2 - 0.03, -0.2)                // the inside sill she sits on
    // Move her in, onto the inside sill, and draw her only through the window.
    cat.position.z = wallZ - 0.22; cat.position.y = wy0 - 0.68
    cat.traverse((o) => { if (o.isMesh) { o.material = inside(o.material.clone()); o.renderOrder = 14 } })
    // The glass: a faint reflection laid over the opening.
    const sheen = (() => { const c2 = document.createElement('canvas'); c2.width = c2.height = 128; const y = c2.getContext('2d'); const gr = y.createLinearGradient(0, 0, 128, 128); gr.addColorStop(0, 'rgba(255,255,255,0.28)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.04)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.0)'); gr.addColorStop(0.8, 'rgba(255,255,255,0.14)'); gr.addColorStop(1, 'rgba(255,255,255,0.02)'); y.fillStyle = gr; y.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c2) })()
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: sheen, transparent: true, depthWrite: false })); glass.position.set(wx, wy, wallZ + 0.014); glass.rotation.y = yaw; scene.add(glass)
    const bar = new THREE.MeshStandardMaterial({ color: '#f2efe6', roughness: 0.7 }); for (const [w, h, x, y] of [[W, 0.05, 0, 0.03], [0.04, H, 0, 0]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.03), bar); b.position.set(x, y, 0.02); const g2 = new THREE.Group(); g2.position.set(wx, wy, wallZ); g2.rotation.y = yaw; g2.add(b); scene.add(g2) } }
  catTail = tail; catHead = head
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
  sign.position.set(at.x, 4.0, at.y); sign.rotation.y = Math.atan2(0.8, 0.6) // hung right over FOOD & PHARMACY
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
// Melvin's Island: the map's own beach-junk superstore south of the tip gets its parody name over the door.
{
  const c = document.createElement('canvas'); c.width = 512; c.height = 160; const x = c.getContext('2d'); x.fillStyle = '#3aa7d6'; x.fillRect(0, 0, 512, 160); x.fillStyle = '#f2cf2e'; x.strokeStyle = '#1c2340'; x.lineWidth = 8; x.lineJoin = 'round'; x.textAlign = 'center'; x.font = 'italic 900 84px Georgia, serif'; x.strokeText('Melvin’s Island', 256, 106, 490); x.fillText('Melvin’s Island', 256, 106, 490)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  const m = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.12), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 })); m.rotation.y = -Math.PI / 2; m.position.set(-80.36 * U, 5.15, 412.62 * U); scene.add(m)
}
// The wooded east side of A1A Beach Blvd: a tree line behind the invisible wall.
{
  // Live oaks, not hedges: a trunk, a spreading canopy of several clumps, and scrub underneath so nothing shows through.
  const geo = new THREE.IcosahedronGeometry(1, 1), GATE = { z: 352.1, x: -72.9 }
  const leafI = [], trunkI = [], scrubI = [], M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), greens = ['#35602f', '#44743a', '#2b5230', '#557f3c', '#3c6a44']
  const inst = (list, x, y, z, sx, sy, sz, ry = 0, rz = 0, col = 0) => { M4.compose(new V3(x, y, z), Q.setFromEuler(E.set(0, ry, rz)), new V3(sx, sy, sz)); list.push([M4.clone(), col]) }
  let k = 0
  for (const [pts, side] of [[[[-78.6, 433], [-79.0, 424], [-79.6, 418.5], [-84.2, 417], [-84.7, 412.4], [-84.5, 407], [-83.1, 403.5], [-81.7, 401], [-81.8, 398.6], [-82.2, 396], [-82.4, 387], [-81.2, 379.6], [-75.0, 358.7], [-68.6, 338.4], [-64.2, 324.5]], 1], [ROAD_W.map(([x, z]) => [x - 3.1, z]), -1]]) for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], n = Math.ceil(Math.hypot(bx - ax, bz - az) / 1.1)
    for (let j = 0; j < n; j++, k++) for (const row of [0, 1]) {
      const r = (v) => { const q = Math.sin((k * 2 + row) * 12.9898 + v * 78.233) * 43758.5453; return q - Math.floor(q) }
      const t = (j + r(1)) / n, sc = 2.2 + r(2) * 1.6 + row
      const tz = az + (bz - az) * t; if (side < 0 && tz > 396.8 && tz < 415.0) continue // the neighborhood and PCN Bank front the road here
      let px = (ax + (bx - ax) * t + side * (0.75 + row * 0.9 + r(4) * 0.4)) * U; const pz = tz * U
      if (side > 0 && Math.abs(tz - GATE.z) < 1.25) px += 2.3 * U // set back behind the neighborhood's gate
      if (side > 0 && tz > 406.0 && tz < 418) px += 6.5 * U // round the back of the shops south of the tip
      // Cleared around the sheriff's billboard so its pole and face stand clear of the bushes.
      if (side > 0 && Math.abs(tz - SHERIFF.z) < 1.9 && px / U > SHERIFF.x - 3.4 && px / U < SHERIFF.x + 1.2) continue
      if (side > 0 && Math.abs(tz - FORT.z) < 1.4 && Math.abs(px / U - FORT.x) < 1.6) continue
      if (DATA.homes.some(([hx, hz, w, d, a]) => { const dx = px - hx, dz = pz - hz, c = Math.cos(a), sn = Math.sin(a); return Math.abs(dx * c - dz * sn) < w / 2 + sc * 1.3 && Math.abs(dx * sn + dz * c) < d / 2 + sc * 1.3 })) continue // not through a neighbor's roof
      const hgt = sc * (1.25 + r(3) * 0.5) + row * 1.6, ci = Math.floor(r(5) * 5)
      inst(trunkI, px, hgt * 0.5, pz, 0.22 + sc * 0.06, hgt, 0.22 + sc * 0.06, r(6) * 6, (r(7) - 0.5) * 0.25)
      inst(leafI, px, hgt + sc * 0.25, pz, sc * 1.05, sc * 0.62, sc * 1.05, r(8) * 6, 0, ci)
      for (let c = 0; c < 3; c++) { const a = r(9 + c) * 6.28, d = sc * (0.6 + r(12 + c) * 0.35); inst(leafI, px + Math.cos(a) * d, hgt - sc * (0.05 + r(15 + c) * 0.3), pz + Math.sin(a) * d, sc * 0.72, sc * 0.5, sc * 0.72, a, 0, (ci + c + 1) % 5) }
      inst(scrubI, px + (r(20) - 0.5) * 2, sc * 0.3, pz + (r(21) - 0.5) * 2, sc * 0.9, sc * 0.42, sc * 0.9, r(22) * 6, 0, (ci + 2) % 5)
      if (row === 0 && k % 3 === 0) inst(scrubI, px - side * sc * 0.9, 0.45, pz + (r(23) - 0.5) * 3, 1.1, 0.6, 1.1, r(24) * 6, 0, 3)
    }
  }
  // A wall of oaks round the neighborhood and PCN Bank, instead of barriers.
  { let sd = 21; const rn = () => (sd = (sd * 16807) % 2147483647) / 2147483647
    const inYard = (x, z) => (x > -121.1 * U && x < -91 * U && z > 397.2 * U && z < 406.1 * U) || (x > -108.5 * U && x < -86 * U && z > 405 * U && z < 432.5 * U)
    for (const [ax, az, bx, bz] of DATA.treeRuns || []) { const len = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / len, tz = (bz - az) / len; let nx = tz, nz = -tx; if (inYard((ax + bx) / 2 + nx * 3, (az + bz) / 2 + nz * 3)) { nx = -nx; nz = -nz }
      const n = Math.ceil(len / 3.4)
      for (let j = 0; j < n; j++) for (const row of [0, 1, 2, 3]) { const d = (j + 0.3 + row * 0.5 + rn() * 0.3) / n * len, off = 2.0 + row * 3.4 + rn() * 1.4, // four rows: woods going off into the distance
 px = ax + tx * d + nx * off, pz = az + tz * d + nz * off, sc = 2.3 + rn() * 1.5 + row, hgt = sc * (1.25 + rn() * 0.5) + row * 1.6, ci = Math.floor(rn() * 5)
        if (DATA.homes.some(([hx, hz, w, d, a]) => { const dx = px - hx, dz = pz - hz, c = Math.cos(a), sn = Math.sin(a); return Math.abs(dx * c - dz * sn) < w / 2 + sc * 1.25 && Math.abs(dx * sn + dz * c) < d / 2 + sc * 1.25 })) continue // not through a neighbor's house
        inst(trunkI, px, hgt * 0.5, pz, 0.22 + sc * 0.06, hgt, 0.22 + sc * 0.06, rn() * 6, (rn() - 0.5) * 0.25)
        inst(leafI, px, hgt + sc * 0.25, pz, sc * 1.05, sc * 0.62, sc * 1.05, rn() * 6, 0, ci)
        for (let c = 0; c < 3; c++) { const a = rn() * 6.28, dd = sc * (0.6 + rn() * 0.35); inst(leafI, px + Math.cos(a) * dd, hgt - sc * (0.05 + rn() * 0.3), pz + Math.sin(a) * dd, sc * 0.72, sc * 0.5, sc * 0.72, a, 0, (ci + c + 1) % 5) }
        inst(scrubI, px - nx * (off - 1.0) + (rn() - 0.5), sc * 0.3, pz - nz * (off - 1.0) + (rn() - 0.5), sc * 0.8, sc * 0.42, sc * 0.8, rn() * 6, 0, (ci + 2) % 5) } } }
  // Woods both sides of A1A S where it runs on south past the road block.
  { let sd = 61; const rn = () => (sd = (sd * 16807) % 2147483647) / 2147483647
    for (let z = 434; z < 500; z += 1.1) for (const side of [-1, 1]) for (const row of [0, 1, 2]) { const cx = -84.93 + (z - 434) * 0.228, off = 2.4 + row * 1.15 + rn() * 0.6, px = (cx + side * off) * U, pz = (z + (rn() - 0.5) * 0.8) * U
      const sc = 2.3 + rn() * 1.6 + row * 0.6, hgt = sc * (1.25 + rn() * 0.5) + row * 1.4, ci = Math.floor(rn() * 5)
      inst(trunkI, px, hgt * 0.5, pz, 0.22 + sc * 0.06, hgt, 0.22 + sc * 0.06, rn() * 6, (rn() - 0.5) * 0.25)
      inst(leafI, px, hgt + sc * 0.25, pz, sc * 1.05, sc * 0.62, sc * 1.05, rn() * 6, 0, ci)
      for (let c = 0; c < 2; c++) { const a = rn() * 6.28, dd = sc * 0.7; inst(leafI, px + Math.cos(a) * dd, hgt - sc * 0.15, pz + Math.sin(a) * dd, sc * 0.72, sc * 0.5, sc * 0.72, a, 0, (ci + c + 1) % 5) } } }
  const mk = (list, g, mat, shadow) => { const im = new THREE.InstancedMesh(g, mat, list.length), col = new THREE.Color(); list.forEach(([m, c], n) => { im.setMatrixAt(n, m); im.setColorAt(n, col.set(greens[c])) }); im.castShadow = shadow; im.receiveShadow = true; im.frustumCulled = false; scene.add(im) }
  mk(leafI, geo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true }), true)
  mk(scrubI, geo, new THREE.MeshStandardMaterial({ color: '#c9d6c0', roughness: 1, flatShading: true }), false)
  { const im = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.7, 1, 1, 6), new THREE.MeshStandardMaterial({ color: '#5a4a3a', roughness: 1 }), trunkI.length); trunkI.forEach(([m], n) => im.setMatrixAt(n, m)); im.castShadow = true; im.frustumCulled = false; scene.add(im) }
  // The private neighborhood's gate, across from the plaza entrance: two capped pillars, low walls, a drive that vanishes into the oaks.
  { const g = new THREE.Group(); g.position.set(GATE.x * U, 0, GATE.z * U); g.rotation.y = -0.305; scene.add(g)
    const stone = new THREE.MeshStandardMaterial({ color: '#e4dccb', roughness: 0.9 }), capM = new THREE.MeshStandardMaterial({ color: '#9fb0ae', roughness: 0.5, metalness: 0.3, flatShading: true }), yel = new THREE.MeshStandardMaterial({ color: '#b9c24a', roughness: 1, flatShading: true })
    const pl = document.createElement('canvas'); pl.width = 256; pl.height = 256; const x = pl.getContext('2d'); x.fillStyle = '#d2c8b2'; x.fillRect(0, 0, 256, 256); x.strokeStyle = '#7d745f'; x.lineWidth = 6; x.strokeRect(10, 10, 236, 236); x.fillStyle = '#4f4a3c'; x.textAlign = 'center'; x.font = 'italic 54px Georgia, serif'; x.fillText('Sea', 128, 86); x.fillText('Baloney', 128, 146, 210); x.font = '22px Georgia, serif'; x.fillText('PRIVATE · NO TURKEYS', 128, 204, 214)
    const plT = new THREE.CanvasTexture(pl); plT.colorSpace = THREE.SRGBColorSpace; const plM = new THREE.MeshStandardMaterial({ map: plT, roughness: 0.9 })
    // The planted median with the little gatehouse.
    { const isl = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.25, 14), stone); isl.scale.set(3.2, 1, 0.75); isl.position.set(5.2, 0.12, 0); g.add(isl)
      const hutM = new THREE.MeshStandardMaterial({ color: '#f1efe8', roughness: 0.9 }); const hut = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.2, 1.1), hutM); hut.position.set(6.2, 1.35, 0); hut.castShadow = true; g.add(hut)
      const hr = new THREE.Mesh(new THREE.ConeGeometry(1.25, 0.8, 4), capM); hr.rotation.y = Math.PI / 4; hr.position.set(6.2, 2.85, 0); g.add(hr)
      for (let n = 0; n < 9; n++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.5, 4), new THREE.MeshStandardMaterial({ color: '#4c7f3a', roughness: 1, flatShading: true })); const a = n * 0.7; f.scale.z = 0.2; f.rotation.set(Math.cos(a) * 0.9, a, 0); const pv = new THREE.Group(); pv.position.set(3.4, 0.5, 0); pv.rotation.y = a; f.position.set(0, 0.5, 0.45); f.rotation.set(0.8, 0, 0); pv.add(f); g.add(pv) }
      for (const [fx, fc] of [[2.6, '#d8436a'], [2.9, '#f0f0f0'], [4.3, '#d8436a']]) { const fl = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: fc, roughness: 1, flatShading: true })); fl.scale.set(0.3, 0.2, 0.3); fl.position.set(fx, 0.38, fx % 1 > 0.5 ? 0.3 : -0.3); g.add(fl) } }
    const drive = new THREE.Mesh(new THREE.PlaneGeometry(13, 7), new THREE.MeshStandardMaterial({ color: '#4d5356', roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); drive.rotation.x = -Math.PI / 2; drive.position.set(3.5, 0.06, 0); drive.receiveShadow = true; g.add(drive)
    for (const sz of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.7, 1.7), stone); p.position.set(1.2, 1.35, sz * 4.6); p.castShadow = true; g.add(p)
      const base = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.4, 2.0), stone); base.position.set(1.2, 0.2, sz * 4.6); g.add(base); const ledge = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.16, 2.1), stone); ledge.position.set(1.2, 2.78, sz * 4.6); g.add(ledge)
      const cap = new THREE.Mesh(new THREE.ConeGeometry(1.6, 1.1, 4), capM); cap.rotation.y = Math.PI / 4; cap.position.set(1.2, 3.4, sz * 4.6); cap.castShadow = true; g.add(cap)
      const pq = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 1.45), plM); pq.rotation.y = -Math.PI / 2; pq.position.set(0.34, 1.6, sz * 4.6); g.add(pq)
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.95, 9), stone); wall.position.set(1.3, 0.47, sz * 9.7); wall.castShadow = true; g.add(wall); const end = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.25, 0.7), stone); end.position.set(1.3, 0.62, sz * 14.3); g.add(end)
      // Closed to the public: a striped arm down across each lane.
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 3.4), new THREE.MeshStandardMaterial({ color: '#f2f2ee', roughness: 0.6 })); arm.position.set(4.2, 1.0, sz * 2.3); g.add(arm)
      for (let n = 0; n < 4; n++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.15, 0.35), new THREE.MeshStandardMaterial({ color: '#c8302b' })); st.position.set(4.2, 1.0, sz * (1.1 + n * 0.8)); g.add(st) }
      const ab = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.1, 0.35), stone); ab.position.set(4.2, 0.55, sz * 4.1); g.add(ab)
      for (let n = 0; n < 7; n++) { const b = new THREE.Mesh(geo, yel); b.scale.set(0.6, 0.42, 0.65); b.position.set(0.4, 0.4, sz * (5.9 + n * 1.25)); g.add(b) } }
  }
}
const tableSpots = []
// The pond south of Floridian Ave, grown to fill the open field up to the houses' back yards.
const POND = { x0: -111.4 + HD[0] - 3.2, x1: -100.6 + HD[0] - 3.2, z0: 392.5 + HD[1], z1: 401.5 + HD[1] }
if (false) { // the pond is gone
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
  // Spread out in two staggered rows across the gap; the stagger leaves no lane a car could thread.
  const spots = [] // on the lot side of the entrance island, which is what blocks the gap now
  for (const [z0, off, spin] of spots) {
    const z = z0 + off * 0.228, x = -102.7 + (z0 - 345.9) * (2.2 / 9.4) + off * 0.973
    const t = new THREE.Group(); t.position.set(x * U, 0.12, z * U); t.rotation.y = turn + Math.PI / 2 + spin; scene.add(t)
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
const { car, body, wheels, steering, M: carM, tails, hoodSkin } = buildGalaxie('#8e1018')
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
// Becky's a blonde.
woman.traverse((m) => { if (!m.isMesh) return; for (const mat of [].concat(m.material)) { if (mat.name === 'hair') mat.color.set('#9a7340'); if (mat.name === 'brows') mat.color.set('#5e4224') } })
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
// (the lot's light poles are knock-down props now: see the crates)
for (const [x, z] of BB_POLES) circles.push([x, z, 0.4])
// Buildings: [center, unit vector along local x, half x, half z]. The grocery's box also covers its front walk.
const wingBox = (cx, cz, t, L, D) => ({ c: u2(cx, cz), a: new V2(Math.cos(t), -Math.sin(t)), hx: (L / 2) * U, hz: (D / 2) * U })
const boxes = [
  { c: gAt(0, 0.45), a: GA.clone(), hx: 6.05 * U, hz: 5.25 * U },
  wingBox(-81.65, 339.8, 0, 11.1, 3.4),
  // The west strip in two pieces either side of Megabucks' drive-thru lane (local x 6.0 to 7.0).
  ...(() => { const t = Math.atan2(0.968, -0.249), c = Math.cos(t), sn = Math.sin(t), mk = (a, b) => { const m = (a + b) / 2; return wingBox(-93.25 + m * c, 364.09 - m * sn, t, b - a, 3.3) }; return [mk(-7.45, 6.0), ...[-1.45, 0, 1.45].map((lz) => ({ c: u2(-93.25 + 7.25 * c + lz * sn, 364.09 - 7.25 * sn + lz * c), a: new V2(c, -sn), hx: 0.45, hz: 0.45 }))] })(), // and the pillars on its open north side
  { c: u2(-87.65, 372.6).add(new V2(0, 0.9)), a: new V2(1, 0), hx: 2.35 * U, hz: 1.9 * U + 0.9 }, // with its south walk
]
// The Square K: the store (with its front walk), two pump islands, the canopy posts, the price pylon.
boxes.push(wingBox(-88.76, 385.71, 0.035, 3.46, 2.6), wingBox(-88.6, 389.65, 0, 2.6, 0.2), wingBox(-88.6, 390.55, 0, 2.6, 0.2)) // (the price pylon is a knock-over prop now)
for (const e of [-1, 1]) for (const v of [-1, 1]) circles.push([(-88.6 + e * 1.15) * U, (390.1 + v * 0.45) * U, 0.3])
// Bank of the Gulf of America (with its front hedge) and the four posts of its drive-thru canopy.
boxes.push({ c: new V2(-88.5 * U + 0.5, 380.1 * U + 0.4), a: new V2(1, 0), hx: 1.3 * U + 0.7, hz: 1.8 * U + 0.6 })
for (const e of [-1, 1]) circles.push([-88.5 * U + e * 4.7, (380.1 + 1.8) * U + 4.2, 0.45])
boxes.push({ c: new V2(-88.5 * U, (380.1 + 1.8) * U + 1.1), a: new V2(1, 0), hx: 2.8, hz: 0.7, low: true }) // the ATM island under the canopy
// (the crossing-sign planter is a curb you hop, and its sign gets knocked down: see rideBeds and the crates)
boxes.push({ c: new V2(-76.1 * U + 1.3, 339.8 * U - 2.5), a: new V2(1, 0), hx: 1.5, hz: 2.95 }) // the utility enclosure on the north strip's east end
// (the stop-sign planter off the west strip's end is a curb you hop now, not a wall)
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
const ROAD = [[-85.2, 416.8], [-85.9, 414.4], [-85.6, 412.4], [-85.7, 410.5], [-85.8, 408.7], [-85.5, 407], [-85.0, 405.3], [-84.1, 403.5], [-83.2, 402.2], [-82.7, 400.9], [-82.8, 398.6], [-83.3, 395.5], [-83.5, 387], [-82.3, 379.75], [-76.1, 359], [-69.9, 339.3]]
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
for (let z = 333; z < 432; z += 1) {
  const z0 = z - 0.3, z1 = z + 1.3
  regions.push(mkRegion([[along(ROAD_W, z0, -2.9), z0], [along(ROAD, z0, 1.0), z0], [along(ROAD, z1, 1.0), z1], [along(ROAD_W, z1, -2.9), z1]].map(([x, zz]) => [x * U, zz * U])))
}
// Every barrier you can see: a thin solid box along it.
// Floridian Ave, from A1A S to the barrier at its west end.
regions.push(mkRegion([[-124.5, 387.95], [-93.2, 387.95], [-93.2, 391.3], [-124.5, 391.3]].map(([x, z]) => [(x + HD[0]) * U, (z + HD[1]) * U])))
// ...and the two neighbors' driveways, each reaching past the middle of the street.
for (const d of [HOME.me, HOME.them]) { const x = d[0] / U; regions.push(mkRegion([[x - 0.46, 387.2], [x + 0.46, 387.2], [x + 0.46, 389.7], [x - 0.46, 389.7]].map(([x, z]) => [x * U, (z + HD[1]) * U]))) }
circles.push(...tableSpots)

// A dropped 53-foot reefer trailer in front of the north strip: no tractor, landing gear down,
// TURKEY TRUCK down both sides, and the back doors swung wide open on an empty box.
{
  const T = new THREE.Group(); T.position.set(-78 * U, 0, 344.45 * U); scene.add(T) // long axis along x, doors at the west end
  const L = 16, Wd = 2.6, Hb = 2.9, deck = 1.25
  const white = new THREE.MeshStandardMaterial({ color: '#f1f1ec', roughness: 0.5, metalness: 0.15 }), steel = new THREE.MeshStandardMaterial({ color: '#9aa0a5', metalness: 0.7, roughness: 0.4 })
  const dark = new THREE.MeshStandardMaterial({ color: '#3a3d40', roughness: 0.9 }), inside = new THREE.MeshStandardMaterial({ color: '#a9aeb0', roughness: 0.85, side: THREE.DoubleSide })
  const tyre = new THREE.MeshStandardMaterial({ color: '#1b1b1b', roughness: 0.9 })
  const part = (geo, mat, x, y, z, ry = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; T.add(m); return m }
  const side = (() => { const c = document.createElement('canvas'); c.width = 2048; c.height = 372; const x = c.getContext('2d')
    x.fillStyle = '#f1f1ec'; x.fillRect(0, 0, 2048, 372); x.fillStyle = 'rgba(0,0,0,.05)'; for (let i = 0; i < 2048; i += 46) x.fillRect(i, 0, 3, 372) // panel seams
    x.fillStyle = '#b3261e'; x.fillRect(0, 262, 2048, 34); for (let i = 0; i < 16; i++) { x.beginPath(); x.moveTo(1180 + i * 44, 262); x.lineTo(1212 + i * 44, 279); x.lineTo(1180 + i * 44, 296); x.fill() }
    x.fillStyle = '#7a3b16'; x.textBaseline = 'alphabetic'; let px = 230; do { x.font = `bold ${px}px Oswald, Impact, sans-serif`; px -= 4 } while (x.measureText('TURKEY TRUCK').width > 1500); x.fillText('TURKEY TRUCK', 90, 228)
    x.font = 'bold 40px Oswald, sans-serif'; x.fillStyle = '#555'; x.fillText('FRESH BIRDS · SAINT PONCE · SINCE NEVER', 96, 350)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t })()
  // The box: floor, roof, front wall and two sides, open at the back.
  part(new THREE.BoxGeometry(L, 0.12, Wd), dark, 0, deck, 0)
  part(new THREE.BoxGeometry(L, 0.08, Wd), white, 0, deck + Hb, 0)
  part(new THREE.BoxGeometry(0.1, Hb, Wd), white, L / 2, deck + Hb / 2, 0)
  part(new THREE.BoxGeometry(0.4, 1.2, 1.9), steel, L / 2 + 0.25, deck + Hb - 0.8, 0) // reefer unit on the nose
  for (const e of [-1, 1]) {
    part(new THREE.BoxGeometry(L, Hb, 0.06), white, 0, deck + Hb / 2, e * Wd / 2)
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(L - 0.1, Hb - 0.1), new THREE.MeshStandardMaterial({ map: side, roughness: 0.6 }))
    sign.position.set(0, deck + Hb / 2, e * (Wd / 2 + 0.035)); sign.rotation.y = e > 0 ? 0 : Math.PI; T.add(sign)
    // Inside face, plain and empty.
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(L, Hb), inside); wall.position.set(0, deck + Hb / 2, e * (Wd / 2 - 0.035)); T.add(wall)
    // Rear door, swung all the way round flat against the side, hinged at the back corner.
    const door = new THREE.Group(); door.position.set(-L / 2, deck + Hb / 2, e * (Wd / 2 + 0.05)); door.rotation.y = e * -Math.PI / 2; T.add(door) // swung straight out to the side
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(Wd / 2, Hb - 0.1, 0.05), white); leaf.position.x = -Wd / 4 * e * -1; leaf.position.x = Wd / 4; leaf.castShadow = true; door.add(leaf)
    for (const y of [-0.9, 0, 0.9]) { const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, Hb - 0.3, 6), steel); bar.position.set(Wd / 4 + (y * 0.2), 0, 0.05); door.add(bar) ; break }
  }
  for (const ex of [-1, 1]) for (const ez of [-1, 1]) part(new THREE.BoxGeometry(0.12, Hb + 0.1, 0.12), steel, ex * (L / 2 - 0.02), deck + Hb / 2, ez * (Wd / 2 + 0.02))
  for (const ez of [-1, 1]) for (const y of [deck + 0.02, deck + Hb]) part(new THREE.BoxGeometry(L, 0.1, 0.1), steel, 0, y, ez * (Wd / 2 + 0.03))
  for (const ex of [-1, 1]) part(new THREE.BoxGeometry(0.1, 0.1, Wd), steel, ex * (L / 2 - 0.02), deck + Hb, 0)
  const inFloor = new THREE.Mesh(new THREE.PlaneGeometry(L, Wd), inside); inFloor.rotation.x = -Math.PI / 2; inFloor.position.set(0, deck + 0.065, 0); T.add(inFloor)
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(L, Wd), inside); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, deck + Hb - 0.05, 0); T.add(ceil)
  part(new THREE.BoxGeometry(0.15, 0.25, Wd), steel, -L / 2 + 0.05, deck - 0.1, 0) // rear sill
  part(new THREE.BoxGeometry(0.1, 0.35, Wd - 0.2), steel, -L / 2 + 0.35, 0.55, 0) // bumper
  // Tandem axles near the back, chassis rails, landing gear at the front.
  for (const e of [-1, 1]) part(new THREE.BoxGeometry(L - 0.4, 0.25, 0.12), dark, 0, deck - 0.2, e * 0.5)
  for (const ax of [-L / 2 + 2.2, -L / 2 + 3.45]) for (const e of [-1, 1]) {
    const w = part(new THREE.CylinderGeometry(0.52, 0.52, 0.55, 16), tyre, ax, 0.52, e * (Wd / 2 - 0.35)); w.rotation.x = Math.PI / 2
    const hub = part(new THREE.CylinderGeometry(0.28, 0.28, 0.57, 12), steel, ax, 0.52, e * (Wd / 2 - 0.35)); hub.rotation.x = Math.PI / 2
  }
  for (const e of [-1, 1]) { part(new THREE.BoxGeometry(0.14, deck - 0.1, 0.14), steel, L / 2 - 4, (deck - 0.1) / 2, e * 0.8); part(new THREE.BoxGeometry(0.5, 0.06, 0.5), steel, L / 2 - 4, 0.03, e * 0.8) }
  T.position.y = GY - 0.005
  boxes.push({ c: new V2(T.position.x, T.position.z), a: new V2(1, 0), hx: L / 2 + 0.2, hz: Wd / 2 + 0.3 })
}
// (no pond to keep out of)
// The neighborhood: drive anywhere through the yards; the houses themselves are solid.
regions.push(mkRegion([[-124.5, 382.6], [-95.0, 382.6], [-95.0, 391.5], [-124.5, 391.5]].map(([x, z]) => [(x + HD[0]) * U, (z + HD[1]) * U])))
// The 280 Floridian lot, south of the street, open up to the barrier at the road block.
// PCN Bank's corner, south of the street: open, with the bank itself solid.
regions.push(mkRegion([[-101.5, 405.4], [-88.6, 405.4], [-88.6, 414.6], [-101.5, 414.6]].map(([x, z]) => [x * U, z * U])))
boxes.push({ c: new V2(-96.1 * U, 410.05 * U), a: new V2(1, 0), hx: 1.75 * U, hz: 1.75 * U })
for (const [ox, oz] of [[-99.6, 408.0], [-100.0, 412.2]]) circles.push([ox * U, oz * U, 0.5])
// The lot PCN Bank shares with the Winn-Trixie, south of the neighborhood.
regions.push(mkRegion([[-108.1, 403.0], [-91.4, 403.0], [-87.1, 432.1], [-108.1, 432.1]].map(([x, z]) => [x * U, z * U]))) // overlaps the street, so you can cut through the fence gap
// Melvin's Island's lot, south of the tip: drive right up to the shop front.
regions.push(mkRegion([[-85.6, 407.4], [-80.35, 407.4], [-80.35, 432.1], [-85.6, 432.1]].map(([x, z]) => [x * U, z * U]))) // ...and on south past it, level with the end of the Winn-Trixie lot
for (const [x, z, w, d, t] of DATA.homes) boxes.push({ c: new V2(x, z), a: new V2(Math.cos(t), -Math.sin(t)), hx: w / 2 + 0.3, hz: d / 2 + 0.3 })
for (const [x, z, sx, sz, h] of DATA.walls) boxes.push({ c: new V2(x, z), a: new V2(sx, sz), hx: h, hz: 0.45, low: true })
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
const game = { state: 'intro', t: 0, health: 100, grab: 0, hitCool: 0, ai: 'seek', aiT: 0, stuckT: 0, reverseT: 0, target: DOOR.clone(), bubbleT: 0, rams: 0, pathI: 0, armor: 100, attackCool: 6, people: 100, cans: 10, canHits: 0, lastCanT: 1.4, throwCool: 3, soda: 3, lattes: 0, gotLattes: false, sodaReady: false, b2T: 0 }
const OUCH = ['HEY!', 'MY BUMPER!', "IT'S OUR TURKEY!", 'WATCH IT!', 'NOT THE FENDER!', 'WE CALLED DIBS!']
function reset(toCutscene) {
  $('mission').style.display = ''; $('sodaBtn').style.display = ''
  Object.assign(P, { heading: P_START.heading, steer: 0, pitch: 0, roll: 0, bounce: 0, loose: 0, fwd: 0 }); P.pos.copy(P_START.pos); P.vel.set(0, 0)
  Object.assign(R, { heading: R_START.heading, steer: 0, pitch: 0, roll: 0, bounce: 0, loose: 0, fwd: 0 }); R.pos.copy(R_START.pos); R.vel.set(0, 0)
  resetCrates()
  Object.assign(game, { state: toCutscene ? 'cutscene' : 'intro', t: 0, health: 100, grab: 0, hitCool: 0, ai: 'seek', aiT: 0, stuckT: 0, reverseT: 0, bubbleT: 0, rams: 0, pathI: 0, touchT: 0, georgeDown: false, armor: 100, attackCool: 6, people: 100, cans: 10, canHits: 0, lastCanT: 1.4, throwCool: 3, soda: 3, lattes: 0, gotLattes: false, conspiracy: false, forkTalk: false, forkReply: 0, sodaReady: false, b2T: 0, backedOut: false, backT: 0 })
  for (const c of [...sodas, ...lattes]) { c.live = false; c.mesh.visible = false }
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
// The controls card: shown while Ctrl is held, or pinned with the KEYS button under CAM.
addEventListener('keydown', (e) => { if (e.key === 'Control') $('help').classList.add('show') })
addEventListener('keyup', (e) => { if (e.key === 'Control') $('help').classList.remove('show') })
addEventListener('blur', () => $('help').classList.remove('show'))
$('keysBtn').addEventListener('click', (e) => { e.currentTarget.blur(); $('keysBtn').classList.toggle('on', $('help').classList.toggle('pin')) })
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
$('freeBtn').addEventListener('click', (e) => { e.currentTarget.blur(); freeDrive() })
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
    if (turned || game.backT > 6 || (game.backT > 1 && Math.abs(R.fwd) < 0.3 && R.pos.y > (389.5 + HD[1]) * U)) game.backedOut = true
    else return { throttle: R.fwd > -2.8 ? -1 : 0, steer: R.pos.y > (388.4 + HD[1]) * U ? 1 : 0, handbrake: false } // straight back to the street, then swing
  }
  if (game.reverseT > 0) { game.reverseT -= dt; return { throttle: -1, steer: game.reverseSteer, handbrake: false } }
  if (game.ai === 'evade') { game.aiT -= dt; if (game.aiT <= 0 || R.pos.distanceTo(game.target) < 6) game.ai = 'seek' }
  // Every so often, when the Galaxie is close, he turns and goes for it instead.
  game.attackCool -= dt
  if (game.ai === 'seek' && game.rams > 0 && game.pathI >= 28 && game.attackCool <= 0 && R.pos.distanceTo(P.pos) < 18) {
    game.attackCool = 5 + Math.random() * 5
    if (Math.random() < 0.6) { game.ai = 'attack'; game.aiT = 2.4 }
  }
  if (game.ai === 'attack') { game.aiT -= dt; game.target.copy(P.pos).addScaledVector(P.vel, 0.35); if (game.aiT <= 0) game.ai = 'seek' }
  if (game.ai === 'seek') {
    // Out of the station and up the lot, one waypoint at a time; then the door.
    while (game.pathI < PATH.length && (R.pos.distanceTo(PATH[game.pathI]) < 5 || (game.pathI >= 28 && R.pos.y < PATH[game.pathI].y))) game.pathI++
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
    $('bubble2').textContent = 'THIS CAR IS ROCK HARD, BRAD. WE WILL CRUSH YOU.'; $('bubble2').classList.add('show'); game.b2T = 3.2
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
  // His third can: she's had enough.
  if (game.cans === 7) { $('bubble2').textContent = 'AND OF COURSE, EVERY CRANBERRY CAN IS THROWN AT ME!'; $('bubble2').classList.add('show'); game.b2T = 3.2 }
  if (game.cans === 9) { say('EAT CRANBERRY!', 1.5); game.sodaReady = true; $('bubble2').textContent = 'LET’S THROW SODA CANS AT HIM!'; $('bubble2').classList.add('show'); game.b2T = 3; objective(TOUCH ? '<b>Ram the wagon</b> — and tap <b>SODA</b> to throw soda cans at him.' : '<b>Ram the wagon</b> — and press <b>F</b> to throw soda cans at him.') }
}

// --- cardboard boxes piled in front of The OOPS Store: a tiny rigid-body sim, no physics library ---
const boxTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d')
  x.fillStyle = '#c69a62'; x.fillRect(0, 0, 128, 128); x.fillStyle = 'rgba(90,60,25,.12)'; for (let i = 0; i < 128; i += 6) x.fillRect(0, i, 128, 2)
  x.fillStyle = 'rgba(205,170,120,.85)'; x.fillRect(54, 0, 20, 128); x.strokeStyle = 'rgba(80,50,20,.5)'; x.lineWidth = 3; x.strokeRect(1, 1, 126, 126)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t })()
const boxMat = new THREE.MeshStandardMaterial({ map: boxTex, roughness: 0.9 })
const crates = []
{
  const sizes = [[0.6, 0.45, 0.5], [0.8, 0.5, 0.55], [0.5, 0.6, 0.5], [1.1, 0.45, 0.6], [0.45, 0.4, 0.45], [0.7, 0.7, 0.6]]
  const piles = [[-89.9, 375.2], [-88.75, 375.75], [-87.55, 375.15], [-86.4, 375.7], [-88.1, 376.55], [-89.3, 376.6]] // four stacks of six, all the same box
  let n = 0
  for (const [px, pz] of piles) {
    let y = GY
    for (let layer = 0; layer < 3; layer++) {
      const per = 3 - layer
      let top = 0
      for (let i = 0; i < per; i++, n++) {
        const [w, h, d] = [0.8, 0.8, 0.8]
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), boxMat); m.castShadow = true; m.receiveShadow = true; scene.add(m)
        const ox = (i - (per - 1) / 2) * 0.86 + Math.sin(n * 3.1) * 0.03, oz = Math.cos(n * 2.3) * 0.04
        const home = { pos: new V3(px * U + ox, y + h / 2, pz * U + oz), yaw: Math.sin(n * 1.7) * 0.08 }
        crates.push({ m, half: new V3(w / 2, h / 2, d / 2), r: Math.max(w, d) * 0.5, home, vel: new V3(), spin: new V3(), awake: false })
        top = Math.max(top, h)
      }
      y += top
    }
  }
}
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new V3()
// Three galvanized trash cans by Bumpkin's drive-thru window, each stuffed with yesterday's donuts.
const tinMat = new THREE.MeshStandardMaterial({ color: '#b9bec2', metalness: 0.85, roughness: 0.35 })
const canGeoT = (() => { const g = new THREE.CylinderGeometry(0.34, 0.3, 0.95, 18); g.translate(0, 0, 0); return g })()
const lidGeo = new THREE.CylinderGeometry(0.37, 0.37, 0.05, 18), domeGeo = new THREE.SphereGeometry(0.37, 18, 6, 0, Math.PI * 2, 0, 0.5), handleGeo = new THREE.TorusGeometry(0.09, 0.018, 6, 12, Math.PI)
{
  const a = 0.035, ox = -88.76 * U, oz = 385.41 * U
  for (const lz of [1.3, 2.3, 3.3]) {
    const lx = -1.68 * U - 2.9 - (lz - 1.3) * 0.25, x = ox + lx * Math.cos(a) + lz * Math.sin(a), z = oz - lx * Math.sin(a) + lz * Math.cos(a)
    const m = new THREE.Group(), body = new THREE.Mesh(canGeoT, tinMat), lid = new THREE.Mesh(lidGeo, tinMat); lid.position.y = 0.49; body.castShadow = lid.castShadow = true; m.add(body, lid)
    const dome = new THREE.Mesh(domeGeo, tinMat); dome.scale.y = 0.6; dome.position.y = 0.43; dome.castShadow = true; const hdl = new THREE.Mesh(handleGeo, tinMat); hdl.position.y = 0.62; m.add(dome, hdl)
    for (let r = 0; r < 6; r++) { const rib = new THREE.Mesh(new THREE.TorusGeometry(0.325, 0.012, 4, 18), tinMat); rib.rotation.x = Math.PI / 2; rib.position.y = -0.36 + r * 0.14; m.add(rib) }
    scene.add(m)
    crates.push({ m, half: new V3(0.34, 0.475, 0.34), r: 0.36, home: { pos: new V3(x, GY + 0.475, z), yaw: lz }, vel: new V3(), spin: new V3(), awake: false, can: true })
  }
}
// Orange traffic barrels along every barrier: two white reflective bands, a black rubber base. All knockable.
{
  const orange = new THREE.MeshStandardMaterial({ color: '#ee6a1a', roughness: 0.55 }), white = new THREE.MeshStandardMaterial({ color: '#f4f1e8', roughness: 0.35, emissive: '#ffffff', emissiveIntensity: 0.08 }), rubber = new THREE.MeshStandardMaterial({ color: '#1d1d1d', roughness: 0.9 })
  const Hh = 1.0, rTop = 0.36, rBot = 0.44, rAt = (y) => rBot + (rTop - rBot) * (y + Hh / 2) / Hh
  const body = new THREE.CylinderGeometry(rTop, rBot, Hh - 0.04, 18); body.translate(0, 0.02, 0) // its bottom tucked inside the rubber base
  const bands = [-0.05, 0.25].map((y) => { const g = new THREE.CylinderGeometry(rAt(y + 0.07) + 0.012, rAt(y - 0.07) + 0.012, 0.14, 18, 1, true); g.translate(0, y, 0); return g })
  const base = new THREE.CylinderGeometry(0.55, 0.57, 0.08, 18); base.translate(0, -Hh / 2 + 0.04, 0)
  for (const [x, z] of DATA.barrels || []) {
    const m = new THREE.Group(), b = new THREE.Mesh(body, orange); b.castShadow = true; m.add(b)
    for (const g of bands) m.add(new THREE.Mesh(g, white))
    const bs = new THREE.Mesh(base, rubber); bs.castShadow = true; m.add(bs)
    scene.add(m)
    crates.push({ m, half: new V3(0.44, Hh / 2, 0.44), r: 0.48, home: { pos: new V3(x, GY + Hh / 2, z), yaw: 0 }, vel: new V3(), spin: new V3(), awake: false, barrel: true })
  }
}
// Two 4-foot cardboard boxes of pitchforks on the Farmers lawn. Hit one and its three forks spill out.
const forkWood = new THREE.MeshStandardMaterial({ color: '#8a5a2b', roughness: 0.8 }), forkSteel = new THREE.MeshStandardMaterial({ color: '#8d9396', metalness: 0.7, roughness: 0.35 })
const makeFork = () => { const f = new THREE.Group()
  const h = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.45, 6), forkWood); h.position.y = -0.15; h.castShadow = true; f.add(h)
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.04), forkSteel); bar.position.y = 0.6; f.add(bar)
  for (const x of [-0.13, 0, 0.13]) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.34, 5), forkSteel); t.position.set(x, 0.79, 0); f.add(t) }
  return f }
const forkCrates = []
{
  const cardTex = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 256; const x = c.getContext('2d')
    x.fillStyle = '#b98a55'; x.fillRect(0, 0, 128, 256); x.fillStyle = 'rgba(80,50,20,.15)'; for (let i = 0; i < 256; i += 7) x.fillRect(0, i, 128, 2)
    x.fillStyle = '#2a1a0c'; x.textAlign = 'center'; x.font = 'bold 22px Oswald, Impact, sans-serif'; x.fillText('PITCHFORKS', 64, 90); x.font = 'bold 15px Oswald, sans-serif'; x.fillText('QTY 3 · THIS SIDE UP', 64, 116)
    x.strokeStyle = '#2a1a0c'; x.lineWidth = 3; x.beginPath(); x.moveTo(64, 140); x.lineTo(64, 200); x.moveTo(44, 160); x.lineTo(64, 140); x.lineTo(84, 160); x.stroke()
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t })()
  const card = new THREE.MeshStandardMaterial({ map: cardTex, roughness: 0.9 }), cardTop = new THREE.MeshStandardMaterial({ color: '#a77a48', roughness: 0.9 })
  for (const [x, z, yaw] of [[-94.5, 401.7, 0.3], [-95.4, 402.0, -0.2]]) { // right on the line from the Farmers corner across to Bumpkin'
    const m = new THREE.Group(), b = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.22, 0.62), [card, card, cardTop, cardTop, card, card]); b.castShadow = true; m.add(b)
    const inner = new THREE.Group(); m.add(inner)
    for (const [dx, dz, r] of [[-0.14, 0.1, 0.08], [0.12, -0.1, -0.1], [0.0, 0.14, 0.12]]) { const f = makeFork(); f.position.set(dx, 0.75, dz); f.rotation.set(r, dx * 3, -r); inner.add(f) }
    scene.add(m)
    const c = { m, half: new V3(0.31, 0.61, 0.31), r: 0.4, home: { pos: new V3(x * U, GY + 0.61, z * U), yaw }, vel: new V3(), spin: new V3(), awake: false, forks: inner }
    crates.push(c); forkCrates.push(c)
  }
}
const looseForks = []
function spillForks(c) {
  c.forks.visible = false
  if (!game.forkTalk) { game.forkTalk = true; chrisSays('MAYBE WE SHOULD THROW PITCHFORKS AT HIM.', 3)
    game.forkReply = 3.2 }
  for (let i = 0; i < 3; i++) {
    let f = looseForks.find((f) => !f.m.visible)
    if (!f) { const m = makeFork(); scene.add(m); f = { m, half: new V3(0.08, 0.85, 0.08), r: 0.25, home: null, vel: new V3(), spin: new V3(), awake: false, fork: true }; looseForks.push(f); crates.push(f) }
    const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 3
    f.gy = c.gy; f.m.visible = true; f.m.position.set(c.m.position.x, c.m.position.y + 1.0, c.m.position.z); f.m.quaternion.setFromEuler(new THREE.Euler(Math.random() - 0.5, a, Math.random() - 0.5))
    f.vel.set(c.vel.x * 0.7 + Math.cos(a) * sp, 2.5 + Math.random() * 2, c.vel.z * 0.7 + Math.sin(a) * sp); f.spin.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 10); f.awake = true
  }
}
// The pedestrian-crossing sign in its planter: knock it flat, and it scrapes the Galaxie on the way down.
{ const post = dressing.userData.pedSign
  if (post) { const wp = post.getWorldPosition(new V3()); post.parent.remove(post); scene.add(post); for (const ch of post.children) ch.position.y -= 1.25 // pivot at its middle
    crates.push({ m: post, half: new V3(0.06, 1.25, 0.06), r: 0.25, lie: 0.43, home: { pos: new V3(wp.x, GY + 1.25, wp.z), yaw: 0 }, vel: new V3(), spin: new V3(), awake: false, sign: true, pivotLow: true }) } }
// Three roll-out trash bins behind the north strip: the conspiracy. Hit one and turkeys tumble out.
const binTurkeys = []
{
  const body = new THREE.MeshStandardMaterial({ color: '#2f4a3a', roughness: 0.7 }), lidM = new THREE.MeshStandardMaterial({ color: '#1e2a24', roughness: 0.6 }), tyreM = new THREE.MeshStandardMaterial({ color: '#151515', roughness: 0.9 })
  const binGeo = new THREE.CylinderGeometry(0.36, 0.3, 1.0, 4, 1).rotateY(Math.PI / 4)
  for (const dz of [1.4, 2.8, 4.2]) {
    const m = new THREE.Group()
    const b = new THREE.Mesh(binGeo, body); b.scale.set(1, 1, 1.15); b.castShadow = true; m.add(b)
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.06, 0.68), lidM); lid.position.set(0, 0.53, 0.02); lid.castShadow = true; m.add(lid)
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 8), lidM); bar.rotation.z = Math.PI / 2; bar.position.set(0, 0.5, -0.4); m.add(bar)
    for (const e of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.07, 14), tyreM); w.rotation.z = Math.PI / 2; w.position.set(e * 0.27, -0.42, -0.3); m.add(w) }
    scene.add(m)
    crates.push({ m, half: new V3(0.3, 0.5, 0.36), r: 0.42, home: { pos: new V3(-76.1 * U + 1.1, GY + 0.5, 339.8 * U + dz), yaw: -Math.PI / 2 }, vel: new V3(), spin: new V3(), awake: false, turkeyBin: true })
  }
}
function spillTurkeys(c) {
  for (let i = 0; i < 4; i++) {
    let t = binTurkeys.find((t) => !t.m.visible)
    if (!t) { const m = new THREE.Group(), bird = makeTurkey(); bird.scale.setScalar(0.42); bird.position.y = -0.26; m.add(bird); scene.add(m); t = { m, half: new V3(0.28, 0.24, 0.28), r: 0.3, home: null, vel: new V3(), spin: new V3(), awake: false, bird: true }; binTurkeys.push(t); crates.push(t) }
    const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 3
    t.gy = c.gy; t.m.visible = true; t.m.position.set(c.m.position.x, c.m.position.y + 0.5, c.m.position.z); t.m.quaternion.setFromEuler(new THREE.Euler(0, a, 0))
    t.vel.set(c.vel.x * 0.6 + Math.cos(a) * sp, 2 + Math.random() * 2.5, c.vel.z * 0.6 + Math.sin(a) * sp); t.spin.set((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 8); t.awake = true
  }
  if (!game.conspiracy) { game.conspiracy = true; $('bubble2').textContent = 'WHAT IN THE WORLD? HOW IS THERE ONLY ONE TURKEY? THEY’RE ALL IN THESE TRASH CANS!'; $('bubble2').classList.add('show'); game.b2T = 4.5
    chrisSays('IT’S A CONSPIRACY!', 3) }
}

// Knock-around things on the south strip's walk: Joisey Mick's patio (two umbrella tables, six stools)
// and the Christmas shop's giant candy canes.
{
  const t = Math.atan2(0.968, -0.249), c = Math.cos(t), sn = Math.sin(t)
  const at = (lx, lz) => [(-93.25 + lx * c + lz * sn) * U, (364.09 - lx * sn + lz * c) * U]
  const pole = new THREE.MeshStandardMaterial({ color: '#3b3f44', metalness: 0.5 }), cloth = new THREE.MeshStandardMaterial({ color: '#22305c', side: THREE.DoubleSide }), topM = new THREE.MeshStandardMaterial({ color: '#2a4f9e' }), red = new THREE.MeshStandardMaterial({ color: '#c8302b' })
  const bay = -0.6125, front = 1.65
  for (const e of [-0.42, 0.42]) {
    const [x, z] = at(bay + e * 1.1, front + 0.62) // out past the curb, where a car can reach them
    const m = new THREE.Group()
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.45, 6), pole); m.add(p)
    const um = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.5, 8, 1, true), cloth); um.position.y = 1.1; um.castShadow = true; m.add(um)
    const tp = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.04, 14), topM); tp.position.y = -0.5; m.add(tp)
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 12), pole); base.position.y = -1.2; m.add(base)
    scene.add(m); crates.push({ m, half: new V3(0.35, 1.225, 0.35), r: 0.5, lie: 0.9, home: { pos: new V3(x, GY + 1.225, z), yaw: 0 }, vel: new V3(), spin: new V3(), awake: false, fork: false, rod: true })
    for (let k = 0; k < 3; k++) {
      const a = k * 2.1 + e, sx = x + Math.cos(a) * 0.62, sz = z + Math.sin(a) * 0.62, st = new THREE.Group()
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 10), red); seat.position.y = 0.19; seat.castShadow = true; st.add(seat)
      for (const d of [[-1, -1], [1, 1], [-1, 1], [1, -1]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.42, 4), red); l.position.set(d[0] * 0.1, -0.02, d[1] * 0.1); st.add(l) }
      scene.add(st); crates.push({ m: st, half: new V3(0.17, 0.22, 0.17), r: 0.22, home: { pos: new V3(sx, GY + 0.22, sz), yaw: a }, vel: new V3(), spin: new V3(), awake: false })
    }
  }
  // Candy canes, taller than a person, in front of the Christmas shop.
  const caneTex = (() => { const cv = document.createElement('canvas'); cv.width = 64; cv.height = 256; const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 64, 256); x.fillStyle = '#d0142c'
    for (let i = -2; i < 12; i++) { x.beginPath(); x.moveTo(0, i * 26); x.lineTo(64, i * 26 - 30); x.lineTo(64, i * 26 - 16); x.lineTo(0, i * 26 + 14); x.fill() }
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(1, 3); return tx })()
  const caneM = new THREE.MeshStandardMaterial({ map: caneTex, roughness: 0.35 })
  const hookTex = caneTex.clone(); hookTex.repeat.set(3, 1); hookTex.needsUpdate = true
  const hookM = new THREE.MeshStandardMaterial({ map: hookTex, roughness: 0.35 })
  for (const lx of [-3.5, -2.85, -2.2, -1.55]) {
    const [x, z] = at(lx, front + 0.32), m = new THREE.Group()
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.0, 12), caneM); shaft.castShadow = true; m.add(shaft)
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.08, 10, 16, Math.PI), hookM); hook.position.set(0.28, 1.0, 0); hook.castShadow = true; m.add(hook)
    scene.add(m); crates.push({ m, half: new V3(0.1, 1.1, 0.1), r: 0.3, lie: 0.12, home: { pos: new V3(x, GY + 1.0, z), yaw: t + Math.random() }, vel: new V3(), spin: new V3(), awake: false, rod: true })
  }
}
// The Square K price pylon: hit it hard enough and it topples, the LED prices die in a shower of sparks.
const pylonProp = (() => {
  const T = dressing.userData.pylon; if (!T) return null
  const H = 1.6 * U, m = new THREE.Group()
  const brick = new THREE.MeshStandardMaterial({ color: '#7a4a32', roughness: 0.9 }), black = new THREE.MeshStandardMaterial({ color: '#2b2e30', roughness: 0.6 })
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.2 * U, 0.5 * U, 0.7 * U), brick); base.position.y = 0.25 * U - H / 2; base.castShadow = true; m.add(base)
  const col = new THREE.Mesh(new THREE.BoxGeometry(0.15 * U, 1.1 * U, 0.6 * U), black); col.position.y = 1.05 * U - H / 2; col.castShadow = true; m.add(col)
  const faceMat = new THREE.MeshStandardMaterial({ map: T.lit, emissive: '#ffffff', emissiveMap: T.lit, emissiveIntensity: 0.25 })
  for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.58 * U, 1.08 * U), faceMat); f.position.set(s * 0.08 * U, 1.05 * U - H / 2, 0); f.rotation.y = s * Math.PI / 2; m.add(f) }
  scene.add(m)
  const c = { m, half: new V3(0.1 * U, H / 2, 0.35 * U), r: 0.45 * U, home: { pos: new V3(-86.4 * U, GY + H / 2, 394.4 * U), yaw: 0 }, vel: new V3(), spin: new V3(), awake: false, rod: true, pylon: true, faceMat, lit: T.lit, dead: T.dead }
  crates.push(c); return c
})()
// Street furniture that falls over: the stop sign and Megabucks' menu board.
for (const [key, h, lie] of [['stopSign', 2.5, 0.4], ['menuBoard', 2.7, 0.55]]) {
  const post = dressing.userData[key]; if (!post) continue
  const wp = post.getWorldPosition(new V3()); post.parent.remove(post); scene.add(post); for (const ch of post.children) ch.position.y -= h / 2
  crates.push({ m: post, half: new V3(0.08, h / 2, 0.08), r: 0.3, lie, home: { pos: new V3(wp.x, GY + h / 2, wp.z), yaw: 0 }, vel: new V3(), spin: new V3(), awake: false, rod: true, sign: true })
}
// A Cranberry Armory armored car, parked in the row in front of publick.
{
  const T = new THREE.Group(), L = 6.2, W = 2.4, H = 2.7
  const body = new THREE.MeshStandardMaterial({ color: '#7a1530', roughness: 0.45, metalness: 0.35 }), steel = new THREE.MeshStandardMaterial({ color: '#9aa0a5', metalness: 0.8, roughness: 0.35 })
  const glass = new THREE.MeshStandardMaterial({ color: '#1e2a30', roughness: 0.1, metalness: 0.5 }), tyre = new THREE.MeshStandardMaterial({ color: '#151515', roughness: 0.9 })
  const side = (() => { const c = document.createElement('canvas'); c.width = 1024; c.height = 384; const x = c.getContext('2d')
    x.fillStyle = '#7a1530'; x.fillRect(0, 0, 1024, 384); x.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 40; i < 1024; i += 120) x.fillRect(i, 0, 4, 384)
    for (let i = 60; i < 1024; i += 120) for (const y of [24, 360]) { x.fillStyle = '#c9cdd0'; x.beginPath(); x.arc(i, y, 6, 0, 7); x.fill() }
    x.fillStyle = '#f2c94c'; x.textAlign = 'center'; x.font = 'bold 112px Georgia, serif'; x.fillText('CRANBERRY', 512, 170); x.font = 'bold 84px Georgia, serif'; x.fillText('ARMORY', 512, 268)
    x.font = 'bold 30px Oswald, sans-serif'; x.fillStyle = '#fff'; x.fillText('SECURE SAUCE TRANSPORT · SAINT PONCE', 512, 330)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t })()
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; T.add(m); return m }
  add(new THREE.BoxGeometry(L * 0.66, H, W), body, -L * 0.17, 0.55 + H / 2, 0) // the box
  add(new THREE.BoxGeometry(L * 0.32, H * 0.62, W - 0.1), body, L * 0.33, 0.55 + H * 0.31, 0) // the cab
  add(new THREE.BoxGeometry(0.06, H * 0.3, W - 0.4), glass, L * 0.49, 0.55 + H * 0.5, 0) // windshield
  for (const e of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.64, H * 0.9), new THREE.MeshStandardMaterial({ map: side, roughness: 0.5 })); p.position.set(-L * 0.17, 0.55 + H / 2, e * (W / 2 + 0.01)); p.rotation.y = e > 0 ? 0 : Math.PI; T.add(p)
    add(new THREE.BoxGeometry(0.7, 0.5, 0.05), glass, L * 0.36, 0.55 + H * 0.45, e * (W / 2 - 0.02))
    for (const ax of [-L * 0.32, L * 0.3]) { const w = add(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16), tyre, ax, 0.5, e * (W / 2 - 0.15)); w.rotation.x = Math.PI / 2
      const hub = add(new THREE.CylinderGeometry(0.24, 0.24, 0.42, 12), steel, ax, 0.5, e * (W / 2 - 0.15)); hub.rotation.x = Math.PI / 2 }
  }
  add(new THREE.BoxGeometry(0.2, 0.35, W), steel, L / 2, 0.5, 0); add(new THREE.BoxGeometry(0.2, 0.35, W), steel, -L / 2, 0.5, 0)
  add(new THREE.BoxGeometry(0.06, H * 0.8, W * 0.8), steel, -L / 2 - 0.0, 0.55 + H / 2, 0) // rear doors
  T.position.set(-79.95 * U, GY, 353.6 * U); scene.add(T)
  boxes.push({ c: new V2(T.position.x, T.position.z), a: new V2(1, 0), hx: L / 2 + 0.1, hz: W / 2 + 0.1 })
}
// Two inflatable balloons outside Santa Mar: a beer bottle and a taco. Hit one and it pops.
const balloons = []
function buildTaco(b) {
  const shell = new THREE.MeshStandardMaterial({ color: '#e8b54a', roughness: 0.55, side: THREE.DoubleSide }), spot = new THREE.MeshStandardMaterial({ color: '#c88a2e', roughness: 0.6 })
  const lettuce = new THREE.MeshStandardMaterial({ color: '#5fae3a', roughness: 0.7 }), meat = new THREE.MeshStandardMaterial({ color: '#6b3a1e', roughness: 0.8 })
  const tomato = new THREE.MeshStandardMaterial({ color: '#d8322a', roughness: 0.5 }), cheese = new THREE.MeshStandardMaterial({ color: '#f6c63a', roughness: 0.6 })
  const T = new THREE.Group(); T.position.y = 1.75; T.rotation.y = 0.35; T.scale.setScalar(1.15); b.add(T)
  // A hard-shell taco seen side on: two half-moon shells, the fold underneath, the filling heaped along the top.
  const half = (r, h, m, z) => { const d = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 26, 1, false, -Math.PI / 2, Math.PI), m); d.rotation.x = Math.PI / 2; d.position.z = z; d.castShadow = true; T.add(d); return d }
  half(1.15, 0.08, shell, 0.3); half(1.15, 0.08, shell, -0.3); half(1.02, 0.52, meat, 0)
  const fold = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.68, 26, 1, true, -Math.PI / 2, Math.PI), shell); fold.rotation.x = Math.PI / 2; T.add(fold)
  for (let i = 0; i < 9; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), spot); d.scale.z = 0.3; const a = i * 2.4; d.position.set(Math.sin(a) * 0.8, -0.2 - (i % 4) * 0.2, (i % 2 ? 1 : -1) * 0.345); T.add(d) }
  for (let i = 0; i < 8; i++) { const x = -0.92 + i * 0.263
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), lettuce); l.scale.set(1, 0.6, 1.25); l.position.set(x, 0.1 + (i % 2) * 0.05, 0); T.add(l)
    if (i % 2) { const t = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), tomato); t.position.set(x + 0.1, 0.27, (i % 4 === 1 ? 0.12 : -0.12)); T.add(t) }
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.04), cheese); c.position.set(x - 0.08, 0.25, (i % 3 - 1) * 0.16); c.rotation.set(0, i, 0.5); T.add(c) }
}
function popBalloon(k) {
  k.popped = true; k.b.visible = false; k.tether.visible = false
  const p = k.b.position; for (let i = 0; i < 4; i++) burst(new V2(p.x + (Math.random() - 0.5) * 2, p.z + (Math.random() - 0.5) * 2), 4, true, false, k.taco ? '#e8b54a' : '#7a4a12')
  audio.pop(); S.hit = Math.max(S.hit, 0.3); flash('POP!')
  if (k.taco && game.b2T <= 0) { $('bubble2').textContent = 'NOOO, NOT THE TACO!'; $('bubble2').classList.add('show'); game.b2T = 2.4 }
}
{
  const amber = new THREE.MeshStandardMaterial({ color: '#7a4a12', roughness: 0.3, transparent: true, opacity: 0.95 }), gold = new THREE.MeshStandardMaterial({ color: '#d9b44a', roughness: 0.5 })
  const lab = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 256; const x = c.getContext('2d')
    x.fillStyle = '#e9d9a6'; x.fillRect(0, 0, 256, 256); x.fillStyle = '#b3261e'; x.fillRect(0, 0, 256, 28); x.fillRect(0, 228, 256, 28)
    x.fillStyle = '#1a1a1a'; x.textAlign = 'center'; x.font = 'bold 54px Georgia, serif'; x.fillText('DOS', 128, 102); x.fillText('EXES', 128, 160); x.font = 'italic 22px Georgia, serif'; x.fillText('cerveza · no regrets', 128, 204)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t })()
  const labM = new THREE.MeshStandardMaterial({ map: lab, roughness: 0.6 })
  for (const dx of [-0.75, 0.55]) {
    const b = new THREE.Group()
    if (dx > 0) { buildTaco(b) } else {
    const pts = [[0, 0], [0.55, 0.05], [0.62, 0.3], [0.62, 1.55], [0.55, 1.85], [0.24, 2.3], [0.2, 2.75], [0.24, 2.8], [0, 2.82]].map(([r, h]) => new THREE.Vector2(r, h))
    const bottle = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), amber); bottle.castShadow = true; b.add(bottle)
    const label = new THREE.Mesh(new THREE.CylinderGeometry(0.635, 0.635, 0.9, 20, 1, true), labM); label.position.y = 0.95; b.add(label)
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.1, 14), gold); cap.position.y = 2.82; b.add(cap)
    }
    const x = (-77.1 + dx) * U, z = 342.25 * U
    const tether = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 4), new THREE.MeshBasicMaterial({ color: '#f4f4f4' })); scene.add(tether)
    b.position.set(x, GY + 1.6, z); scene.add(b); balloons.push({ b, tether, x, z, ph: dx * 3, taco: dx > 0 })
  }
}
function updateBalloons(t) { for (const k of balloons) { if (k.popped) continue
  for (const car of [P, R]) if (Math.hypot(car.pos.x - k.b.position.x, car.pos.y - k.b.position.z) < 2.3) { popBalloon(k); break } if (k.popped) continue
  const sx = Math.sin(t * 0.9 + k.ph) * 0.12, sz = Math.cos(t * 0.7 + k.ph) * 0.1
  k.b.rotation.set(sz, 0, -sx); k.b.position.set(k.x + sx * 1.6, GY + 1.6 + Math.sin(t * 1.3 + k.ph) * 0.05, k.z + sz * 1.6)
  k.tether.position.set(k.x + sx * 0.8, GY + 0.8, k.z + sz * 0.8); k.tether.rotation.set(sz, 0, -sx) } }
const donutCols = ['#e9a6c2', '#6b3f22', '#f4e2b8', '#c8302b', '#f1b62f']
const donutGeo = (() => { const g = new THREE.TorusGeometry(0.11, 0.055, 8, 14); g.rotateX(Math.PI / 2); return g })()
const donutMats = donutCols.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }))
const donuts = []
function spillDonuts(c) {
  const p = c.m.position
  for (let i = 0; i < 9; i++) {
    let d = donuts.find((d) => !d.m.visible)
    if (!d) { const m = new THREE.Mesh(donutGeo, donutMats[donuts.length % 5]); m.castShadow = true; scene.add(m); d = { m, half: new V3(0.17, 0.055, 0.17), r: 0.17, home: null, vel: new V3(), spin: new V3(), awake: false, donut: true }; donuts.push(d); crates.push(d) }
    const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 4
    d.gy = c.gy; d.m.visible = true; d.m.position.set(p.x, p.y + 0.3, p.z); d.vel.set(c.vel.x * 0.6 + Math.cos(a) * sp, 2 + Math.random() * 3, c.vel.z * 0.6 + Math.sin(a) * sp)
    d.spin.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 14); d.awake = true
  }
}
// Rest everything on whatever is actually under it (lawn, walk or asphalt), not one fixed height.
const groundRay = new THREE.Raycaster(), groundMeshes = []
world.scene.traverse((o) => { if (o.isMesh && o.name === 'ground') groundMeshes.push(o) }); groundMeshes.push(ground)
// Realistic paving, drawn in the shader from world position so it costs no download: aggregate grain, sun-bleached
// blotches, utility-cut patches, tar-sealed cracks, oil stains in the stalls, worn paint, mottled grass and mulch.
const paveShader = (sh) => {
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;')
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vWPos;
float h21(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }`).replace('#include <color_fragment>', `#include <color_fragment>
{ vec2 p = vWPos.xz - vec2(-340.0, 1450.0); vec3 c = diffuseColor.rgb; float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b)), sat = mx - mn, lum = dot(c, vec3(.299, .587, .114));
  float dist = length(vWPos - cameraPosition), nearK = 1.0 - smoothstep(10.0, 45.0, dist), midK = 1.0 - smoothstep(60.0, 160.0, dist);
  float asphalt = (1.0 - smoothstep(0.05, 0.09, sat)) * (1.0 - smoothstep(0.3, 0.42, lum));
  float paint = smoothstep(0.6, 0.75, lum);
#ifndef PAINT_MESH
  paint *= step(0.34, vWPos.y); // only the raised stall lines wear: concrete pads and sidewalks are not paint
#endif
  float grass = smoothstep(0.02, 0.08, c.g - max(c.r, c.b));
  float grain = (vn(p * 9.0) - 0.5) * midK, speck = (h21(floor(p * 34.0)) - 0.5) * nearK;
  float blot = fbm(p * 0.07) - 0.5, blot2 = fbm(p * 0.6 + 40.0) - 0.5;
  // Rectangular utility-cut repairs: newer, darker asphalt with a sealed edge.
  vec2 pc = p / vec2(9.0, 5.5), pi = floor(pc), pf = fract(pc); float pr = h21(pi + 3.1);
  vec2 lo = vec2(0.12 + 0.3 * h21(pi + 7.0), 0.15 + 0.25 * h21(pi + 9.0)), hi = lo + vec2(0.25 + 0.3 * h21(pi + 1.0), 0.3 + 0.3 * h21(pi + 2.0));
  float inR = step(lo.x, pf.x) * step(pf.x, hi.x) * step(lo.y, pf.y) * step(pf.y, hi.y) * step(0.93, pr);
  vec2 eR = min(pf - lo, hi - pf) * vec2(9.0, 5.5); float edgeR = inR * (1.0 - smoothstep(0.03, 0.12, min(eR.x, eR.y)));
  // Meandering cracks, tar-sealed.
  float cr = abs(fbm(p * 0.045 + 9.0) - 0.5), crack = (1.0 - smoothstep(0.0006, 0.0022, cr)) * smoothstep(0.5, 0.62, vn(p * 0.03 + 5.0)) * midK;
  float cr2 = abs(fbm(p.yx * 0.5 + 31.0) - 0.5), hair = (1.0 - smoothstep(0.002, 0.008, cr2)) * smoothstep(0.55, 0.75, vn(p * 0.09 + 2.0)) * nearK;
  // Oil drips: one soft blob per stall-sized cell, heavier where cars actually park.
  vec2 oc = (p + vec2(0.0, 0.6)) / 3.1855, oi = floor(oc), of = fract(oc) - 0.5 - (vec2(h21(oi), h21(oi + 5.0)) - 0.5) * 0.5;
  float sx = min(abs(p.x + 14.2), min(abs(p.x - 1.0), abs(p.x - 16.2)));
  float stall = step(1.0, sx) * step(sx, 4.4) * step(-19.0, p.y) * step(p.y, 37.0);
  float oilR = 0.1 + 0.22 * h21(oi + 2.0), oilP = step(mix(0.93, 0.45, stall), h21(oi + 8.0));
  float oil = oilP * (1.0 - smoothstep(oilR * 0.3, oilR, length(of * vec2(1.0, 0.7)) + (blot2 * 0.12))) * mix(0.3, 0.55, stall);
  vec3 a = c * vec3(0.66, 0.64, 0.62) * (1.0 + grain * 0.14 + speck * 0.22 + blot * 0.42 + blot2 * 0.1);
  a = mix(a, a * 0.74, inR * 0.8); a *= 1.0 - edgeR * 0.45; a *= 1.0 - crack * 0.6 - hair * 0.3; a *= 1.0 - oil;
  // Paint that has seen ten Florida summers.
  float wear = smoothstep(0.42, 0.75, fbm(p * 2.2)) * 0.6 + smoothstep(0.5, 0.8, fbm(p * 0.3 + 70.0)) * 0.3;
  vec3 pv = mix(c * (0.92 + speck * 0.1), vec3(0.2, 0.22, 0.22), wear * midK * 0.85);
  vec3 gv = c * (1.0 + (fbm(p * 0.3) - 0.5) * 0.5 + grain * 0.25 + speck * 0.2);
  vec3 ov = c * (1.0 + grain * 0.1 + speck * 0.12 + blot2 * 0.16) * (1.0 - hair * 0.25);
  diffuseColor.rgb = mix(mix(mix(ov, a, asphalt), pv, paint), gv, grass); }`)
}
if (!location.search.includes('nolot')) for (const gm of groundMeshes) for (const mat of [].concat(gm.material)) { mat.onBeforeCompile = paveShader; mat.needsUpdate = true }
const surfaceAt = (x, z) => { groundRay.set(new V3(x, 3, z), new V3(0, -1, 0)); const h = groundRay.intersectObjects(groundMeshes, false).find((h) => h.point.y < 0.8); return h ? h.point.y : GY }

const lotIslands = [], bushes = [] // bushes: [x, z, r] — driving through one drags the car a little
// --- "Welcome to Saint Ponce Beach": the carved sign on the grass at the town's south tip, among boulders and dune grass.
{
  const cx = -88.2 * U, cz = 399.95 * U, gy = surfaceAt(cx, cz), G = new THREE.Group(); G.position.set(cx, gy, cz); G.scale.setScalar(1.25); scene.add(G) // the very tip, the palm grove behind it
  const c = document.createElement('canvas'); c.width = 1024; c.height = 400; const x = c.getContext('2d')
  // A driftwood plank with a ragged outline, a wave curling off its right end.
  x.beginPath(); x.moveTo(30, 210); x.lineTo(60, 170); x.lineTo(40, 140); x.lineTo(120, 120); x.lineTo(300, 128)
  x.bezierCurveTo(520, 150, 660, 120, 760, 96); x.bezierCurveTo(800, 70, 850, 60, 880, 84); x.bezierCurveTo(860, 92, 862, 112, 890, 122); x.lineTo(990, 150); x.lineTo(968, 190); x.lineTo(1000, 232)
  x.lineTo(960, 300); x.lineTo(700, 312); x.lineTo(400, 300); x.lineTo(120, 316); x.lineTo(50, 290); x.lineTo(66, 250); x.closePath()
  const wg = x.createLinearGradient(0, 80, 0, 320); wg.addColorStop(0, '#3f8f95'); wg.addColorStop(1, '#236a72'); x.fillStyle = wg; x.fill(); x.save(); x.clip()
  for (let i = 0; i < 60; i++) { x.strokeStyle = `rgba(${i % 2 ? '255,255,255' : '0,40,50'},${0.05 + Math.random() * 0.08})`; x.lineWidth = 1 + Math.random() * 2; const y = 70 + Math.random() * 260; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(300, y + 14, 700, y - 14, 1024, y + 6); x.stroke() }
  x.restore(); x.lineWidth = 7; x.strokeStyle = '#e8dfc4'; x.stroke()
  x.textAlign = 'center'; x.fillStyle = '#e9e2cb'; x.font = 'italic 62px Georgia, "Times New Roman", serif'; x.fillText('welcome to', 600, 190)
  x.font = '74px Georgia, "Times New Roman", serif'; x.fillStyle = '#12393f'; x.fillText('SAINT PONCE BEACH', 524, 276, 880); x.fillStyle = '#f0e4b8'; x.fillText('SAINT PONCE BEACH', 520, 272, 880)
  // The town seal, top left: sun over the surf.
  x.beginPath(); x.arc(170, 110, 100, 0, 7); x.fillStyle = '#d9d2bb'; x.fill(); x.lineWidth = 6; x.strokeStyle = '#5d7f86'; x.stroke()
  x.save(); x.beginPath(); x.arc(170, 110, 78, 0, 7); x.clip(); x.fillStyle = '#9fd0e2'; x.fillRect(70, 10, 200, 110); x.fillStyle = '#f3c64a'; x.beginPath(); x.arc(170, 112, 34, 0, 7); x.fill()
  x.fillStyle = '#2f7f9a'; x.fillRect(70, 112, 200, 40); x.fillStyle = '#e6d6a6'; x.fillRect(70, 150, 200, 60); x.strokeStyle = '#fff'; x.lineWidth = 4; for (const y of [124, 138]) { x.beginPath(); x.moveTo(70, y); x.bezierCurveTo(120, y - 10, 200, y + 10, 270, y - 4); x.stroke() } x.restore()
  x.beginPath(); x.arc(170, 110, 78, 0, 7); x.strokeStyle = '#5d7f86'; x.lineWidth = 4; x.stroke()
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8
  const face = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, roughness: 0.8 }), Wd = 6.4, Hd = 2.5
  // A carved slab with real thickness: the plank's outline extruded, the painted faces set on both sides, the seal standing proud.
  const P2 = (cx, cy) => [(cx / 1024 - 0.5) * Wd, (0.5 - cy / 400) * Hd], sh = new THREE.Shape(), mv = (cx, cy) => sh.moveTo(...P2(cx, cy)), ln = (cx, cy) => sh.lineTo(...P2(cx, cy)), bz = (a, b, c2, d, e, f) => sh.bezierCurveTo(...P2(a, b), ...P2(c2, d), ...P2(e, f))
  mv(30, 210); ln(60, 170); ln(40, 140); ln(120, 120); ln(300, 128); bz(520, 150, 660, 120, 760, 96); bz(800, 70, 850, 60, 880, 84); bz(860, 92, 862, 112, 890, 122); ln(990, 150); ln(968, 190); ln(1000, 232); ln(960, 300); ln(700, 312); ln(400, 300); ln(120, 316); ln(50, 290); ln(66, 250); ln(30, 210)
  const TH = 0.42, slab = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: TH - 0.08, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2, curveSegments: 10 }), new THREE.MeshStandardMaterial({ color: '#2f7c84', roughness: 0.85 })); slab.position.set(0, 1.75, -TH / 2 + 0.04); slab.castShadow = true; G.add(slab)
  const sc2 = document.createElement('canvas'); sc2.width = sc2.height = 256; sc2.getContext('2d').drawImage(c, 62, 2, 216, 216, 0, 0, 256, 256); const sealT = new THREE.CanvasTexture(sc2); sealT.colorSpace = THREE.SRGBColorSpace
  const sealM = new THREE.MeshStandardMaterial({ map: sealT, roughness: 0.7, alphaTest: 0.5 }), stoneM = new THREE.MeshStandardMaterial({ color: '#d9d2bb', roughness: 0.8 })
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, TH + 0.2, 28), stoneM); disc.rotation.x = Math.PI / 2; disc.position.set(-2.137, 2.31, 0); disc.castShadow = true; G.add(disc)
  for (const sgn of [1, -1]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(Wd, Hd), face); f.position.set(0, 1.75, sgn * (TH / 2 + 0.006)); if (sgn < 0) f.rotation.y = Math.PI; G.add(f)
    const sf = new THREE.Mesh(new THREE.CircleGeometry(0.675, 28), sealM); sf.position.set(-2.137, 2.31, sgn * (TH / 2 + 0.105)); if (sgn < 0) sf.rotation.y = Math.PI; G.add(sf) }
  const postM = new THREE.MeshStandardMaterial({ color: '#4d8a84', roughness: 0.9 }), rockM = new THREE.MeshStandardMaterial({ color: '#6f6f6b', roughness: 1, flatShading: true })
  for (const px of [-1.5, 1.6]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.26, 1.7, 0.26), postM); p.position.set(px, 0.85, 0); p.castShadow = true; G.add(p) }
  const rock = new THREE.DodecahedronGeometry(1, 0)
  for (const [rx, rz, sx, sy, sz, ry] of [[-2.0, 0.5, 1.5, 0.75, 1.0, 0.4], [-0.9, 0.7, 0.8, 0.45, 0.7, 1.9], [2.1, 0.4, 1.2, 0.8, 0.9, 2.7], [2.9, 0.9, 0.6, 0.35, 0.5, 0.9], [-2.4, -0.6, 0.9, 0.5, 0.8, 1.2], [1.8, -0.7, 1.0, 0.55, 0.7, 2.2]]) { const r = new THREE.Mesh(rock, rockM); r.scale.set(sx, sy, sz); r.position.set(rx, sy * 0.45, rz); r.rotation.y = ry; r.castShadow = r.receiveShadow = true; G.add(r) }
  // Dune grass and yellow-green crotons round it, and three little spotlights out front.
  const blade = new THREE.ConeGeometry(0.07, 1.1, 4), grassM = [new THREE.MeshStandardMaterial({ color: '#8a9a5a', roughness: 1 }), new THREE.MeshStandardMaterial({ color: '#b7b06a', roughness: 1 }), new THREE.MeshStandardMaterial({ color: '#c6c94a', roughness: 1 })]
  let sd = 3; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647
  for (let i = 0; i < 26; i++) { const a = rnd() * 6.28, d = 2.2 + rnd() * 5.5, tx = Math.cos(a) * d * 1.1, tz = -Math.abs(Math.sin(a)) * d * 1.6 + 0.8, k = i % 5 === 0 ? 2 : i % 2, sc = k === 2 ? 0.7 : 0.8 + rnd() * 0.7
    for (let j = 0; j < 8; j++) { const b = new THREE.Mesh(blade, grassM[k]), ta = j * 0.8, tr = j ? 0.35 + rnd() * 0.3 : 0; b.scale.setScalar(sc); b.rotation.set(Math.cos(ta) * tr, 0, -Math.sin(ta) * tr); b.position.set(tx + Math.sin(ta) * tr * 0.4, 0.5 * sc, tz + Math.cos(ta) * tr * 0.4); G.add(b) } }
  const lampM = new THREE.MeshStandardMaterial({ color: '#222', roughness: 0.6 }), glow = new THREE.MeshBasicMaterial({ color: '#fff3c4' })
  for (const lx of [-1.6, 0.2, 1.9]) for (const sgn of [1, -1]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), lampM); st.position.set(lx, 0.25, sgn * 1.7); G.add(st); const hd = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.14), lampM); hd.position.set(lx, 0.55, sgn * 1.7); hd.rotation.x = sgn * 0.6; G.add(hd); const l = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.1), glow); l.position.set(lx, 0.57, sgn * 1.62); l.rotation.x = sgn * 0.6; if (sgn > 0) l.rotation.y = Math.PI; G.add(l) }
}
// --- Road paint: double yellow down A1A, white edge lines, dashed yellow on the side streets. Built from the road
// centre lines the world was laid out from, stopped short of junctions.
{
  const R = DATA.roads || [], chains = []
  for (const r of R) { const c = chains[chains.length - 1]; if (c && c.w === r[4] && Math.hypot(c.p[c.p.length - 1][0] - r[0], c.p[c.p.length - 1][1] - r[1]) < 0.05) c.p.push([r[2], r[3]]); else chains.push({ w: r[4], p: [[r[0], r[1]], [r[2], r[3]]] }) }
  const segD = (px, pz, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(px - a[0] - dx * t, pz - a[1] - dz * t) }
  const pos = [], col = [], YEL = [0.78, 0.55, 0.06], WHT = [0.8, 0.78, 0.7], manholes = []
  chains.forEach((ch, ci) => {
    const half = ch.w * 0.75, stripes = ch.w >= 8 ? [[-1.85, 0.12, YEL, 0], [-1.6, 0.12, YEL, 1], [1.6, 0.12, YEL, 1], [1.85, 0.12, YEL, 0], [half - 0.45, 0.13, WHT, 0], [-half + 0.45, 0.13, WHT, 0]] : ch.w >= 4.9 ? [[-0.11, 0.1, YEL, 0], [0.11, 0.1, YEL, 0], [half - 0.45, 0.12, WHT, 0], [-half + 0.45, 0.12, WHT, 0]] : ch.w >= 4.0 ? [[0, 0.1, YEL, 1], [half - 0.4, 0.1, WHT, 0], [-half + 0.4, 0.1, WHT, 0]] : []
    let run = 0
    for (let i = 0; i + 1 < ch.p.length; i++) {
      const a = ch.p[i], b = ch.p[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < 0.01) continue
      const tx = (b[0] - a[0]) / len, tz = (b[1] - a[1]) / len, nx = tz, nz = -tx, n = Math.max(1, Math.round(len / 1.5))
      for (let k = 0; k < n; k++) {
        const s0 = k / n * len, s1 = (k + 1) / n * len, mxp = a[0] + tx * (s0 + s1) / 2, mzp = a[1] + tz * (s0 + s1) / 2; run += len / n
        // Near a crossing road: no paint through the junction.
        let junction = false
        chains.forEach((o, oi) => { if (oi === ci || junction) return; for (let j = 0; j + 1 < o.p.length; j++) { const u = o.p[j], v = o.p[j + 1], l = Math.hypot(v[0] - u[0], v[1] - u[1]) || 1; if (Math.abs(((v[0] - u[0]) * tx + (v[1] - u[1]) * tz) / l) > 0.9) continue; if (segD(mxp, mzp, u, v) < o.w * 0.75 + half * 0.6) { junction = true; break } } })
        if (junction) continue
        const y = surfaceAt(mxp, mzp) + 0.012; if (y > 0.25) continue // never across a sidewalk or the station pad
        if (ch.w >= 4.9 && Math.floor(run / 95) !== Math.floor((run - len / n) / 95)) manholes.push([mxp + nx * 1.6, mzp + nz * 1.6, y])
        for (const [o, w, c, dash] of stripes) {
          if (dash && Math.floor(run / 3) % 3 !== 0) continue
          { const px = mxp + nx * o, pz = mzp + nz * o; let inside = false; chains.forEach((oc, oi) => { if (oi === ci || inside || (c === YEL && oi > ci)) return; for (let j = 0; j + 1 < oc.p.length; j++) if (segD(px, pz, oc.p[j], oc.p[j + 1]) < oc.w * 0.75 - 0.3) { inside = true; break } }); if (!inside && c === WHT && pz > 402.5 * U && pz < 416 * U && px > -92 * U && px < -84.5 * U && Math.abs(o) > 0.5 && (o > 0) === (ch.w > 8 ? nx > 0 : nx < 0)) inside = true // no edge lines across the junction south of the tip
            if (inside) continue } // where two carriageways merge, don't paint one's lines across the other
          const q = [[s0, o - w / 2], [s1, o - w / 2], [s1, o + w / 2], [s0, o + w / 2]].map(([s, d]) => [a[0] + tx * s + nx * d, y, a[1] + tz * s + nz * d])
          for (const t of [0, 2, 1, 0, 3, 2]) { pos.push(...q[t]); col.push(...c) }
        }
      }
    }
  })
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals()
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, side: THREE.DoubleSide })
  m.defines = { PAINT_MESH: 1 }; m.onBeforeCompile = paveShader
  const lines = new THREE.Mesh(g, m); lines.receiveShadow = true; scene.add(lines)

  // Painted and cast-iron things lying on the asphalt.
  const decalTex = (w, h, draw, wear = 0.3) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h)
    x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < w * h * wear / 40; i++) { x.globalAlpha = 0.25 + Math.random() * 0.6; const r = 1 + Math.random() * 3; x.fillRect(Math.random() * w, Math.random() * h, r * (1 + Math.random() * 3), r) }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t }
  const decal = (tex, x, z, w, d, rot = 0, lift = 0.02) => { const mm = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }))
    mm.rotation.set(-Math.PI / 2, 0, rot); mm.position.set(x, surfaceAt(x, z) + lift, z); mm.receiveShadow = true; scene.add(mm); return mm }
  const CREAM = '#e6e0cc'
  const arrow = decalTex(128, 384, (x, w, h) => { x.fillStyle = CREAM; x.beginPath(); x.moveTo(w / 2, 6); x.lineTo(w - 8, 150); x.lineTo(w / 2 + 20, 150); x.lineTo(w / 2 + 20, h - 6); x.lineTo(w / 2 - 20, h - 6); x.lineTo(w / 2 - 20, 150); x.lineTo(8, 150); x.closePath(); x.fill() }, 0.5)
  const stop = decalTex(512, 384, (x, w, h) => { x.fillStyle = CREAM; x.fillRect(0, 0, w, 44); x.font = '900 300px Anton, Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'top'; x.save(); x.translate(w / 2, 84); x.scale(0.62, 1.05); x.fillText('STOP', 0, 0); x.restore() }, 0.45)
  const hc = decalTex(256, 256, (x, w, h) => { x.fillStyle = '#2458a8'; x.fillRect(8, 8, w - 16, h - 16); x.strokeStyle = x.fillStyle = '#eef0ea'; x.lineWidth = 16; x.lineCap = x.lineJoin = 'round'
    x.beginPath(); x.arc(118, 58, 17, 0, 7); x.fill(); x.beginPath(); x.moveTo(118, 86); x.lineTo(122, 146); x.lineTo(170, 146); x.lineTo(192, 200); x.stroke(); x.beginPath(); x.moveTo(121, 112); x.lineTo(162, 112); x.stroke()
    x.beginPath(); x.arc(118, 164, 48, 0.35, Math.PI * 1.55); x.stroke() }, 0.35)
  const hatch = decalTex(128, 256, (x, w, h) => { x.strokeStyle = '#2f62b0'; x.lineWidth = 12; x.strokeRect(6, 6, w - 12, h - 12); for (let i = -h; i < w + h; i += 44) { x.beginPath(); x.moveTo(i, h); x.lineTo(i + h, 0); x.stroke() } }, 0.4)
  const iron = decalTex(128, 128, (x, w) => { x.fillStyle = '#2a2b2c'; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill(); x.fillStyle = '#4a4c4d'; x.beginPath(); x.arc(64, 64, 54, 0, 7); x.fill(); x.strokeStyle = '#303233'; x.lineWidth = 3
    for (let i = 14; i < 128; i += 12) { x.beginPath(); x.moveTo(i, 10); x.lineTo(i, 118); x.stroke(); x.beginPath(); x.moveTo(10, i); x.lineTo(118, i); x.stroke() } x.globalCompositeOperation = 'destination-in'; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill() }, 0)
  const grate = decalTex(128, 96, (x, w, h) => { x.fillStyle = '#b9b5a6'; x.fillRect(0, 0, w, h); x.fillStyle = '#3a3c3d'; x.fillRect(10, 10, w - 20, h - 20); x.fillStyle = '#0c0d0d'; for (let i = 18; i < w - 18; i += 14) x.fillRect(i, 16, 7, h - 32) }, 0)
  // Aisle arrows: one-way aisles, like every lot nobody obeys.
  for (const [ax, dir] of [[-346.6, 0], [-331.4, Math.PI]]) for (const az of [1440, 1459, 1478]) decal(arrow, ax, az, 0.9, 2.7, dir)
  // Accessible stalls by the store end of the first two rows, with the hatched aisle between.
  for (const sx of [-351.6, -336.4]) { decal(hc, sx, 1433.6, 1.5, 1.5, -Math.PI / 2); decal(hc, sx, 1440.0, 1.5, 1.5, -Math.PI / 2); decal(hatch, sx, 1436.8, 4.6, 3.0, Math.PI / 2) }
  // Stop bar where the lot lets out onto A1A Beach Blvd.
  decal(stop, -309.0, 1438.0, 3.6, 2.7, Math.PI / 2)
  for (const [x, z, y] of manholes) { const d = decal(iron, x, z, 0.95, 0.95, Math.random() * 3); d.position.y = y + 0.006 }
  for (const [x, z] of [[-361.0, 1446], [-316.5, 1470], [-346.6, 1489]]) decal(grate, x, z, 1.0, 0.75, 0)
  // Zebra crossing over the entrance, and the hatched walk in front of publick's doors.
  const zebra = decalTex(512, 128, (x, w, h) => { x.fillStyle = CREAM; x.fillRect(0, 0, w, 10); x.fillRect(0, h - 10, w, 10); for (let i = 8; i < w; i += 48) x.fillRect(i, 0, 26, h) }, 0.45)
  decal(zebra, -303.9, 1438.0, 10, 2.6, 1.266)
  const walk = decalTex(512, 192, (x, w, h) => { x.strokeStyle = CREAM; x.lineWidth = 9; x.strokeRect(5, 5, w - 10, h - 10); for (let i = -h; i < w; i += 40) { x.beginPath(); x.moveTo(i, h); x.lineTo(i + h, 0); x.stroke() } }, 0.5)
  decal(walk, -359.3, 1429.4, 10, 3.8, 0.927)

  // --- Landscape islands, like the real plaza: a concrete curb round bark mulch, a patch of grass, clipped hedges.
  const curbM = new THREE.MeshStandardMaterial({ color: '#b3afa2', roughness: 0.95 })
  const mulchT = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#5b3a2a'; x.fillRect(0, 0, 64, 64)
    for (let i = 0; i < 700; i++) { x.fillStyle = ['#6e4632', '#4a2d20', '#7b513a', '#3b241a', '#65402c'][i % 5]; x.save(); x.translate(Math.random() * 64, Math.random() * 64); x.rotate(Math.random() * 3); x.fillRect(-2, -0.7, 4 + Math.random() * 2, 1.4); x.restore() }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.9, 0.9); return t })()
  const mulchM = new THREE.MeshStandardMaterial({ map: mulchT, roughness: 1 }), turfM = new THREE.MeshStandardMaterial({ color: '#5d8a3a', roughness: 1 }); turfM.onBeforeCompile = paveShader
  const hedgeM = [new THREE.MeshStandardMaterial({ color: '#3b6b30', roughness: 1, flatShading: true }), new THREE.MeshStandardMaterial({ color: '#4c7d38', roughness: 1, flatShading: true }), new THREE.MeshStandardMaterial({ color: '#7d9a4c', roughness: 1, flatShading: true })]
  const blob = new THREE.IcosahedronGeometry(1, 1), tuft = new THREE.ConeGeometry(0.1, 0.95, 5)
  const pad = (a, h, r, r2) => { const sh = new THREE.Shape(); sh.moveTo(-a + r2, -h); sh.lineTo(a - r2, -h); sh.quadraticCurveTo(a, -h, a, -h + r2); sh.lineTo(a, h - r); sh.quadraticCurveTo(a, h, a - r, h); sh.lineTo(-a + r, h); sh.quadraticCurveTo(-a, h, -a, h - r); sh.lineTo(-a, -h + r2); sh.quadraticCurveTo(-a, -h, -a + r2, -h); return sh }
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const island = (x, z, a, h, r, r2, dir, plants, keepClear = 0) => {
    const g = new THREE.Group(); g.position.set(x, GY, z); g.rotation.y = dir > 0 ? Math.PI : 0; scene.add(g)
    const curb = new THREE.Mesh(new THREE.ExtrudeGeometry(pad(a, h, r, r2), { depth: 0.24, bevelEnabled: false, curveSegments: 6 }).rotateX(-Math.PI / 2), curbM); curb.castShadow = curb.receiveShadow = true; g.add(curb)
    const bark = new THREE.Mesh(new THREE.ShapeGeometry(pad(a - 0.17, h - 0.17, Math.max(0.1, r - 0.1), Math.max(0.05, r2 - 0.1)), 6).rotateX(-Math.PI / 2), mulchM); bark.position.y = 0.248; bark.receiveShadow = true; g.add(bark)
    if (a > 2 && rnd() > 0.35) { const tw = a * (0.3 + rnd() * 0.2), t = new THREE.Mesh(new THREE.ShapeGeometry(pad(tw, h - 0.5, 0.6, 0.6), 5).rotateX(-Math.PI / 2), turfM); t.position.set((rnd() > 0.5 ? 1 : -1) * (a - tw - 0.45), 0.256, 0); t.receiveShadow = true; g.add(t) }
    for (let i = 0; i < plants; i++) { const px = (plants === 1 ? 0 : -a + 0.9 + (2 * a - 1.8) * i / (plants - 1)) + (rnd() - 0.5) * 0.4, pz = (rnd() - 0.5) * (h - 0.6); if (Math.abs(px) < keepClear) continue
      const k = rnd(); if (k > 0.3) { const b = new THREE.Mesh(blob, hedgeM[i % 2]); const sc = 0.42 + rnd() * 0.25; b.scale.set(sc * 1.25, sc * 0.9, sc * 1.1); b.position.set(px, 0.25 + sc * 0.6, pz); b.rotation.y = rnd() * 3; b.castShadow = true; g.add(b); g.updateMatrixWorld(); const wpb = b.getWorldPosition(new V3()); bushes.push([wpb.x, wpb.z, sc * 1.3]) }
      else for (let j = 0; j < 9; j++) { const t = new THREE.Mesh(tuft, hedgeM[2]); const ta = j * 0.7, tr = j ? 0.5 : 0; t.rotation.set(Math.cos(ta) * tr, 0, -Math.sin(ta) * tr); t.position.set(px + Math.sin(ta) * tr * 0.45, 0.68, pz + Math.cos(ta) * tr * 0.45); t.castShadow = true; g.add(t) } }
    lotIslands.push({ x, z, hw: a + 0.05, hd: h + 0.05, c: 1, s: 0, h: 0.24 })
  }
  // End caps close every row; the ones marked 2 sit over the old square planters (their palms stay).
  for (const [x, z, dir, old] of [[-353.7, 1430.5, -1, 2], [-353.7, 1485.5, 1], [-353.7, 1494.8, -1], [-339, 1402.4, -1], [-339, 1421.7, 1], [-339, 1431.1, -1], [-339, 1485.5, 1], [-339, 1494.8, -1], [-339, 1524.3, 1, 2],
    [-324.3, 1421.7, 1], [-324.3, 1431.1, -1], [-324.3, 1473.3, 1, 2], [-309.6, 1425.5, 1, 2]]) island(x, z, 4.75, 1.8, 1.5, 0.3, dir, old ? 4 : 5, old ? 2.4 : 0.9)
  // Slim islands round the light poles down the middle of each row.
  for (const [x, z] of [[-353.7, 1447.2], [-353.7, 1475.8], [-339, 1459.9], [-339, 1498.1 + 6.4], [-324.3, 1456.7]]) island(x, z, 0.7, 1.55, 0.6, 0.6, 1, 2, 0)
  // A mulch-and-hedge border along A1A Beach Blvd, broken at the entrance.
  { const E = [[-346.4, 1561], [-312, 1447.9], [-292.4, 1385.4]]
    for (let e = 0; e < 2; e++) { const [ax, az] = E[e], [bx, bz] = E[e + 1], len = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / len, tz = (bz - az) / len, nx = -tz, nz = tx, rot = Math.atan2(-tz, tx)
      for (let d = 6; d < len - 4; d += 11) { const cx = ax + tx * (d + 4.5) + nx * 1.7, cz = az + tz * (d + 4.5) + nz * 1.7; if (Math.hypot(cx - -306, cz - 1438) < 13) continue
        const g = new THREE.Group(); g.position.set(cx, surfaceAt(cx, cz), cz); g.rotation.y = rot; scene.add(g)
        const bark = new THREE.Mesh(new THREE.ShapeGeometry(pad(4.6, 1.0, 0.9, 0.9), 5).rotateX(-Math.PI / 2), mulchM); bark.position.y = 0.03; bark.material.polygonOffset = true; bark.material.polygonOffsetFactor = -2; bark.material.polygonOffsetUnits = -2; bark.receiveShadow = true; g.add(bark)
        for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(blob, hedgeM[(i + e) % 2]); b.scale.set(0.8, 0.55, 0.62); b.position.set(-3.6 + i * 1.44, 0.4, 0); b.castShadow = true; g.add(b); g.updateMatrixWorld(); const wb = b.getWorldPosition(new V3()); bushes.push([wb.x, wb.z, 0.9]) } } } }

  // --- The old side entrance off A1A S (where the picnic tables are): a curbed island fills the gap in the wall,
  // with the little hip-roofed pump house, hedges, palms, a stop sign nobody can reach and a fire hydrant.
  { const dx = 0.228, dz = 0.974, mx = -101.68 * U, mz = 350.28 * U, g = new THREE.Group(); g.position.set(mx, GY, mz); g.rotation.y = Math.atan2(-dz, dx); scene.add(g)
    const A = 5.7, H = 1.9
    const curb = new THREE.Mesh(new THREE.ExtrudeGeometry(pad(A, H, 1.6, 1.6), { depth: 0.26, bevelEnabled: false, curveSegments: 6 }).rotateX(-Math.PI / 2), curbM); curb.castShadow = curb.receiveShadow = true; g.add(curb)
    const bark = new THREE.Mesh(new THREE.ShapeGeometry(pad(A - 0.18, H - 0.18, 1.45, 1.45), 6).rotateX(-Math.PI / 2), mulchM); bark.position.y = 0.268; bark.receiveShadow = true; g.add(bark)
    const turf = new THREE.Mesh(new THREE.ShapeGeometry(pad(1.5, H - 0.5, 0.9, 0.9), 5).rotateX(-Math.PI / 2), turfM); turf.position.set(3.7, 0.276, 0); turf.receiveShadow = true; g.add(turf)
    const tan = new THREE.MeshStandardMaterial({ color: '#d6b274', roughness: 0.9 }), roofM = new THREE.MeshStandardMaterial({ color: '#6a4b3a', roughness: 0.95, flatShading: true }), board = new THREE.MeshStandardMaterial({ color: '#e6dcc0', roughness: 0.9 }), grey = new THREE.MeshStandardMaterial({ color: '#8d9194', roughness: 0.6, metalness: 0.4 })
    const hut = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.2, 2.3), tan); hut.position.set(-0.6, 1.36, 0); hut.castShadow = hut.receiveShadow = true; g.add(hut)
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.45, 1.25, 4), roofM); roof.rotation.y = Math.PI / 4; roof.position.set(-0.6, 3.08, 0); roof.castShadow = true; g.add(roof)
    for (const sz of [1, -1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.8, 0.04), board); b.position.set(-0.6, 1.6, sz * 1.16); g.add(b) }
    for (const [ex, ez] of [[-1.9, 0.5], [-1.9, 0.1]]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.3), grey); e.position.set(ex, 1.1, ez); g.add(e) }
    for (let i = 0; i < 9; i++) { const b = new THREE.Mesh(blob, hedgeM[i % 2]); const along = -4.6 + i * 0.75; b.scale.set(0.62, 0.5, 0.6); b.position.set(i < 5 ? along : along - 0.2, 0.62, i < 5 ? (i % 2 ? 1.1 : -1.1) : (i % 2 ? -1.15 : 1.15)); if (Math.abs(b.position.x + 0.6) < 1.7) b.position.x = 1.2 + (i % 3) * 0.7; b.castShadow = true; g.add(b) }
    const big = new THREE.Mesh(blob, hedgeM[1]); big.scale.set(1.3, 0.85, 1.2); big.position.set(-3.6, 0.9, 0); big.castShadow = true; g.add(big)
    const trunkM = new THREE.MeshStandardMaterial({ color: '#8a7658', roughness: 1 }), frondM = new THREE.MeshStandardMaterial({ color: '#4f7f3a', roughness: 1, side: THREE.DoubleSide, flatShading: true })
    for (const [px, pz, ph] of [[2.3, 0.5, 5.2], [3.0, -0.6, 4.3], [-4.6, 0.3, 4.8]]) { const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, ph, 7), trunkM); tr.position.set(px, 0.26 + ph / 2, pz); tr.castShadow = true; g.add(tr)
      const boot = new THREE.Mesh(new THREE.SphereGeometry(0.42, 7, 5), trunkM); boot.position.set(px, 0.2 + ph, pz); g.add(boot)
      for (let k = 0; k < 11; k++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.42, 2.3, 4), frondM); f.scale.z = 0.12; const piv = new THREE.Group(); piv.position.set(px, 0.4 + ph, pz); piv.rotation.set(0, k * 0.571 + px, 0); f.position.set(0, 0.55 - (k % 3) * 0.22, 1.0); f.rotation.x = 1.15 + (k % 3) * 0.3; f.castShadow = true; piv.add(f); g.add(piv) } }
    // The stop sign and its no-left-turn plate, a yellow bollard, a hydrant.
    const stopT = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#c1272d'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#fff'; x.font = '900 46px Anton, Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('STOP', 64, 68); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t })()
    const noLeft = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#f4f4f0'; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#111'; x.lineWidth = 10; x.lineJoin = 'round'; x.beginPath(); x.moveTo(84, 100); x.lineTo(84, 52); x.lineTo(40, 52); x.stroke(); x.fillStyle = '#111'; x.beginPath(); x.moveTo(26, 52); x.lineTo(48, 36); x.lineTo(48, 68); x.fill()
      x.strokeStyle = '#c1272d'; x.lineWidth = 11; x.beginPath(); x.arc(64, 64, 50, 0, 7); x.stroke(); x.beginPath(); x.moveTo(29, 29); x.lineTo(99, 99); x.stroke(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t })()
    const sg = new THREE.Group(); sg.position.set(4.9, 0.26, 0); sg.rotation.y = Math.PI / 2 + 0.3; g.add(sg)
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.5, 6), grey); pole.position.y = 1.25; sg.add(pole)
    for (const sgn of [1, -1]) { const oct = new THREE.Mesh(new THREE.CircleGeometry(0.42, 8), sgn > 0 ? new THREE.MeshStandardMaterial({ map: stopT, roughness: 0.6 }) : grey); oct.rotation.set(0, sgn > 0 ? 0 : Math.PI, sgn * Math.PI / 8); oct.position.set(0, 2.25, sgn * 0.04); sg.add(oct)
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), sgn > 0 ? new THREE.MeshStandardMaterial({ map: noLeft, roughness: 0.6 }) : grey); pl.rotation.y = sgn > 0 ? 0 : Math.PI; pl.position.set(0, 1.45, sgn * 0.04); sg.add(pl) }
    const bol = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.0, 8), new THREE.MeshStandardMaterial({ color: '#d9b21f', roughness: 0.7 })); bol.position.set(1.0, 0.76, 1.3); g.add(bol)
    const red = new THREE.MeshStandardMaterial({ color: '#c8302b', roughness: 0.6 }), hy = new THREE.Group(); hy.position.set(4.2, 0.27, -0.9); g.add(hy)
    const hb = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.55, 8), red); hb.position.y = 0.28; hy.add(hb); const hc = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), red); hc.position.y = 0.56; hy.add(hc); const hn = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.42, 6), red); hn.rotation.z = Math.PI / 2; hn.position.y = 0.36; hy.add(hn)
    boxes.push({ c: new V2(mx, mz), a: new V2(dx, dz), hx: A, hz: H })
  }

  // --- The town sign's island: a curbed lawn filling the tip.
  { const pts = [[-91.45, 394.9], [-90.2, 400.5], [-89.75, 402.6], [-89.3, 404.6], [-88.4, 406.6], [-87.6, 407.6], [-86.9, 406.8], [-86.2, 405.0], [-85.6, 403.2], [-84.9, 401.6], [-84.6, 399.5], [-84.6, 397.0], [-85.2, 395.4], [-86.1, 394.9]], mk2 = (k) => { const sh = new THREE.Shape(), cx = -88.4, cz = 399.5; pts.forEach(([x, z], i) => { const px = (cx + (x - cx) * k) * U, pz = -(cz + (z - cz) * k) * U; i ? sh.lineTo(px, pz) : sh.moveTo(px, pz) }); return sh }
    const y = surfaceAt(-88.6 * U, 398.2 * U)
    const curb = new THREE.Mesh(new THREE.ExtrudeGeometry(mk2(1), { depth: 0.2, bevelEnabled: false }).rotateX(-Math.PI / 2), curbM); curb.position.y = y; curb.receiveShadow = true; scene.add(curb)
    const lawn = new THREE.Mesh(new THREE.ShapeGeometry(mk2(0.975)).rotateX(-Math.PI / 2), turfM); lawn.position.y = y + 0.21; lawn.receiveShadow = true; scene.add(lawn)
    lotIslands.push({ x: -88.7 * U, z: 398.2 * U, hw: 2.3 * U, hd: 3.1 * U, c: 1, s: 0, h: 0.2 }, { x: -87.6 * U, z: 403.6 * U, hw: 1.3 * U, hd: 3.0 * U, c: 1, s: 0, h: 0.2 }) }

  // --- The sabal palm grove at the south tip, behind the welcome sign.
  { const D = new THREE.Object3D(), tr = [], fr = [], sk = [], gr = []; let sd = 11; const tipEdge = (z) => -92.15 + (z - 392) * 0.2278; const rn = () => (sd = (sd * 16807) % 2147483647) / 2147483647
    for (let zi = 0; zi < 4; zi++) for (let xi = 0; xi < 7; xi++) { const z = (396.1 + zi * 0.5 + (rn() - 0.5) * 0.3) * U, half = (400.6 - z / U) / 4.6 * 2.9, x = -88.35 * U + ((xi - 3) / 3 * 2.6 + (rn() - 0.5) * 0.35) * U
      if (Math.abs(x / U + 88.35) > half - 0.25 || x / U < tipEdge(z / U) + 0.45) continue
      const h = 4.6 + rn() * 2.2, y0 = surfaceAt(x, z); D.position.set(x, y0 + h / 2, z); D.rotation.set((rn() - 0.5) * 0.08, 0, (rn() - 0.5) * 0.08); D.scale.set(1, h, 1); D.updateMatrix(); tr.push(D.matrix.clone()); circles.push([x, z, 0.32]) // solid trunks
      D.position.set(x, y0 + h - 0.35, z); D.rotation.set(0, 0, 0); D.scale.set(5.5, 2.2, 5.5); D.updateMatrix(); sk.push(D.matrix.clone())
      for (let k = 0; k < 20; k++) { const a = k * 2.4 + rn(), droop = 0.35 + (k / 19) * 1.75, len = 1.7 + rn() * 0.5; D.position.set(x + Math.sin(a) * Math.sin(droop) * len * 0.5, y0 + h + 0.2 + Math.cos(droop) * len * 0.5, z + Math.cos(a) * Math.sin(droop) * len * 0.5); D.rotation.set(droop, a, 0, 'YXZ'); D.scale.set(1, len, 0.3); D.updateMatrix(); fr.push(D.matrix.clone()) }
    }
    // Tall dune grass and limestone on the open half, like the real corner.
    for (let i = 0; i < 34; i++) { const z = (397.6 + rn() * 2.9) * U, half = (400.9 - z / U) / 4.6 * 2.9 * U, x = -88.35 * U + (rn() - 0.5) * 2 * half * 0.85, y0 = surfaceAt(x, z), sc = 0.7 + rn() * 0.9; if (Math.hypot(x + 88.2 * U, z - 399.95 * U) < 3.5 || x / U < tipEdge(z / U) + 0.4 || z / U > 400.4) continue
      for (let j = 0; j < 9; j++) { const a = j * 0.7, t = j ? 0.25 + rn() * 0.35 : 0; D.position.set(x + Math.sin(a) * t * 0.5 * sc, y0 + 0.6 * sc, z + Math.cos(a) * t * 0.5 * sc); D.rotation.set(t, a, 0, 'YXZ'); D.scale.set(sc, 1.25 * sc, sc); D.updateMatrix(); gr.push(D.matrix.clone()) } }
    { const gm = new THREE.InstancedMesh(new THREE.ConeGeometry(0.09, 1, 4), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 }), gr.length), cc = new THREE.Color(); gr.forEach((m, n) => { gm.setMatrixAt(n, m); gm.setColorAt(n, cc.set(['#b59a62', '#9c8a55', '#c2a86e', '#7f8a4c'][Math.floor(n / 9) % 4])) }); gm.frustumCulled = false; scene.add(gm)
      const km = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 6, 5), new THREE.MeshStandardMaterial({ color: '#6f5a40', roughness: 1, flatShading: true }), sk.length); sk.forEach((m, n) => km.setMatrixAt(n, m)); km.frustumCulled = false; km.castShadow = true; scene.add(km)
      for (const [rx, rz, rs] of [[-87.6, 398.9, 0.7], [-87.3, 399.0, 0.45], [-89.3, 398.2, 0.5]]) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#8d8a80', roughness: 1, flatShading: true })); r.scale.set(rs * 1.5, rs * 0.6, rs); r.position.set(rx * U, surfaceAt(rx * U, rz * U) + rs * 0.25, rz * U); r.rotation.y = rx; r.castShadow = true; scene.add(r) } }
    const tm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.2, 1, 7), new THREE.MeshStandardMaterial({ color: '#7d6c54', roughness: 1 }), tr.length); tr.forEach((m, n) => tm.setMatrixAt(n, m)); tm.castShadow = true; tm.frustumCulled = false; scene.add(tm)
    const fm = new THREE.InstancedMesh(new THREE.ConeGeometry(0.8, 1, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true, side: THREE.DoubleSide }), fr.length); const col = new THREE.Color(); fr.forEach((m, n) => { fm.setMatrixAt(n, m); fm.setColorAt(n, col.set(['#5f8c4a', '#527f42', '#6c9652', '#7a7a48'][n % 4])) }); fm.castShadow = false; fm.frustumCulled = false; scene.add(fm) } // thin fronds make shadows that shimmer: the crowns cast instead

  // --- The back of Bumpkin' (the Square K's west end): a tan shed, a condenser, meters, rooftop units, an orange bollard, and a live oak on the verge.
  { const wx = -371.0, tan = new THREE.MeshStandardMaterial({ color: '#cdbf9c', roughness: 0.9 }), roofM = new THREE.MeshStandardMaterial({ color: '#b8ab8a', roughness: 0.9 }), grey = new THREE.MeshStandardMaterial({ color: '#9a9ea1', roughness: 0.6, metalness: 0.3 }), white = new THREE.MeshStandardMaterial({ color: '#e8e8e4', roughness: 0.6 }), orange = new THREE.MeshStandardMaterial({ color: '#e8641b', roughness: 0.7 })
    const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, GY + y, z); m.castShadow = m.receiveShadow = true; scene.add(m); return m }
    add(new THREE.BoxGeometry(0.14, 0.5, 0.36), grey, wx - 0.08, 1.5, 1569.8); add(new THREE.BoxGeometry(0.14, 0.34, 0.26), grey, wx - 0.08, 1.45, 1570.3); add(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 5), grey, wx - 0.05, 2.4, 1569.8)
    void 0 // (the orange bollards are gone)
    for (const [rx, rz, rs] of [[-368.5, 1571.5, 1], [-365.2, 1574.5, 1.2], [-362.2, 1571.8, 0.9]]) { add(new THREE.BoxGeometry(1.5 * rs, 0.9 * rs, 1.2 * rs), grey, rx, 3.75 + 0.45 * rs, rz); add(new THREE.CylinderGeometry(0.35 * rs, 0.35 * rs, 0.06, 10), new THREE.MeshStandardMaterial({ color: '#3a3d40' }), rx, 3.76 + 0.9 * rs, rz) }
    // A spreading live oak on the grass by A1A S.
    const ox = -380.3, oz = 1571.2, bark = new THREE.MeshStandardMaterial({ color: '#4f4336', roughness: 1 }), leafM = [new THREE.MeshStandardMaterial({ color: '#35602f', roughness: 1, flatShading: true }), new THREE.MeshStandardMaterial({ color: '#44743a', roughness: 1, flatShading: true })], oy = surfaceAt(ox, oz) - GY
    add(new THREE.CylinderGeometry(0.32, 0.5, 2.6, 8), bark, ox, oy + 1.3, oz)
    for (let i = 0; i < 5; i++) { const a = i * 1.257 + 0.4, l = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 3.2, 6), bark); l.position.set(ox + Math.sin(a) * 1.2, GY + oy + 3.3, oz + Math.cos(a) * 1.2); l.rotation.set(0.85, a, 0, 'YXZ'); l.castShadow = true; scene.add(l)
      const c = add(blob, leafM[i % 2], ox + Math.sin(a) * 2.6, oy + 4.6 + (i % 2) * 0.5, oz + Math.cos(a) * 2.6); c.scale.set(2.3, 1.25, 2.3) }
    add(blob, leafM[0], ox, oy + 5.6, oz).scale.set(2.8, 1.4, 2.8)
    circles.push([ox, oz, 0.55])
  }

  // --- PCN Bank across A1A S: a green standing-seam roof, its lot, oaks, and the power line marching up the road.
  { const bx = -96.15 * U, bz = 410.05 * U, yaw = 0.32, g = new THREE.Group(); g.position.set(bx, surfaceAt(bx + 9, bz - 12), bz); g.rotation.y = yaw; scene.add(g)
    const seam = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#7fae98'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#5f8f7a'; for (let i = 0; i < 64; i += 16) x.fillRect(i, 0, 3, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 1); return t })()
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4, 1), new THREE.MeshStandardMaterial({ map: seam, roughness: 0.5, metalness: 0.3, flatShading: true })); roof.rotation.y = Math.PI / 4; const rg = new THREE.Group(); rg.add(roof); rg.scale.set(10.6, 2.0, 8.6); rg.position.y = 5.3; g.add(rg); roof.castShadow = true
    const fascia = new THREE.Mesh(new THREE.BoxGeometry(14.6, 0.5, 12.0), new THREE.MeshStandardMaterial({ color: '#e9e6dc', roughness: 0.8 })); fascia.position.y = 4.3; g.add(fascia)
    const lot = new THREE.Mesh(new THREE.PlaneGeometry(30, 4.5), new THREE.MeshStandardMaterial({ color: '#3f4447', roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); lot.rotation.x = -Math.PI / 2; lot.position.set(3, 0.04, 9.6); lot.receiveShadow = true; g.add(lot)
    for (let i = 0; i < 9; i++) { const st = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 4.6), new THREE.MeshBasicMaterial({ color: '#d8d4c4', polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })); st.rotation.x = -Math.PI / 2; st.position.set(-7 + i * 2.8, 0.05, 9.6); g.add(st) }
    const hedge = new THREE.MeshStandardMaterial({ color: '#3d6b3c', roughness: 1, flatShading: true }); for (let i = 0; i < 10; i++) { const b = new THREE.Mesh(blob, hedge); b.scale.set(0.8, 0.5, 0.6); b.position.set(-6.5 + i * 1.45, 0.4, 6.7); g.add(b) }
    const bark = new THREE.MeshStandardMaterial({ color: '#4f4336', roughness: 1 }), leaf = [new THREE.MeshStandardMaterial({ color: '#35602f', roughness: 1, flatShading: true }), new THREE.MeshStandardMaterial({ color: '#44743a', roughness: 1, flatShading: true })]
    const oak = (x, z, sc) => { const y = surfaceAt(x, z), t = new THREE.Mesh(new THREE.CylinderGeometry(0.25 * sc, 0.4 * sc, 2.6 * sc, 7), bark); t.position.set(x, y + 1.3 * sc, z); t.rotation.z = 0.12; t.castShadow = true; scene.add(t)
      for (let i = 0; i < 4; i++) { const a = i * 1.57 + x, c = new THREE.Mesh(blob, leaf[i % 2]); c.scale.set(2.2 * sc, 1.1 * sc, 2.2 * sc); c.position.set(x + Math.sin(a) * 1.9 * sc, y + (3.6 + (i % 2) * 0.5) * sc, z + Math.cos(a) * 1.9 * sc); c.castShadow = true; scene.add(c) }
      const top = new THREE.Mesh(blob, leaf[0]); top.scale.set(2.5 * sc, 1.2 * sc, 2.5 * sc); top.position.set(x, y + 4.5 * sc, z); scene.add(top) }
    for (const [ox, oz, sc] of [[-99.6, 408.0, 1.2], [-100.0, 412.2, 1.2]]) oak(ox * U, oz * U, sc)
    // Concrete utility poles with crossarms and a transformer now and then; sagging wires between them.
    const conc = new THREE.MeshStandardMaterial({ color: '#b3ada0', roughness: 0.9 }), dk = new THREE.MeshStandardMaterial({ color: '#4a4d50', roughness: 0.7 }), wire = new THREE.LineBasicMaterial({ color: '#1b1b1b' })
    const line = ROAD_W.filter(([, z]) => z < 386).map(([x, z]) => [(x - 3.4) * U, z * U]), tops = []
    line.forEach(([x, z], i) => { const y = surfaceAt(x, z), nxt = line[Math.min(i + 1, line.length - 1)], prv = line[Math.max(i - 1, 0)], ry = Math.atan2(nxt[0] - prv[0], nxt[1] - prv[1])
      circles.push([x, z, 0.3])
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, 10.5, 7), conc); p.position.set(x, y + 5.25, z); p.castShadow = true; scene.add(p)
      const arm = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.12), dk); arm.position.set(x, y + 9.9, z); arm.rotation.y = ry; scene.add(arm)
      if (i % 2 === 0) { const tf = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.8, 10), dk); tf.position.set(x + Math.cos(ry) * 0.42, y + 8.5, z - Math.sin(ry) * 0.42); scene.add(tf) }
      tops.push([-1.1, 0, 1.1].map((o) => new V3(x + Math.cos(ry) * o, y + 10.0, z - Math.sin(ry) * o)).concat([new V3(x, y + 7.6, z)])) })
    for (let i = 0; i + 1 < tops.length; i++) for (let w = 0; w < 4; w++) { const a = tops[i][w], b = tops[i + 1][w], pts = []; for (let k = 0; k <= 12; k++) { const t = k / 12, q = a.clone().lerp(b, t); q.y -= Math.sin(t * Math.PI) * (w === 3 ? 1.1 : 0.7); pts.push(q) } scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wire)) }
  }

  // --- The big road block across A1A south of the tip: striped barricades, a wall of cones, ROAD CLOSED boards, flashing ambers.
  { const A = [-88.9 * U, 432.5 * U], B = [-81.6 * U, 432.5 * U], len = Math.hypot(B[0] - A[0], B[1] - A[1]), tx = (B[0] - A[0]) / len, tz = (B[1] - A[1]) / len, nx = tz, nz = -tx, yaw = Math.atan2(-tz, tx)
    const stripe = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 32; const x = c.getContext('2d'); x.fillStyle = '#f4f4f0'; x.fillRect(0, 0, 256, 32); x.fillStyle = '#e8641b'; for (let i = -32; i < 256; i += 48) { x.beginPath(); x.moveTo(i, 32); x.lineTo(i + 24, 32); x.lineTo(i + 56, 0); x.lineTo(i + 32, 0); x.fill() } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t })()
    const board = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#f4f4f0'; x.fillRect(0, 0, 512, 256); x.strokeStyle = '#111'; x.lineWidth = 10; x.strokeRect(8, 8, 496, 240); x.fillStyle = '#111'; x.textAlign = 'center'; x.font = '900 110px Anton, Impact, sans-serif'; x.fillText('ROAD', 256, 116); x.fillText('CLOSED', 256, 226); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t })()
    const sm = new THREE.MeshStandardMaterial({ map: stripe, roughness: 0.7 }), bm = new THREE.MeshStandardMaterial({ map: board, roughness: 0.7 }), leg = new THREE.MeshStandardMaterial({ color: '#d8d8d2', roughness: 0.8 }), cone = new THREE.MeshStandardMaterial({ color: '#f26a1b', roughness: 0.6 }), band = new THREE.MeshStandardMaterial({ color: '#f4f4f0', roughness: 0.6 }), amber = new THREE.MeshBasicMaterial({ color: '#ffb020' })
    const at = (sA, d) => [A[0] + tx * sA + nx * d, A[1] + tz * sA + nz * d]
    for (let i = 0; i < 7; i++) { const [x, z] = at(2.2 + i * (len - 4.4) / 6, 1.5), g = new THREE.Group(); g.position.set(x, surfaceAt(x, z), z); g.rotation.y = yaw + (i % 2 ? 0.08 : -0.06); scene.add(g)
      for (const y of [1.25, 0.85, 0.45]) { const r = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.24, 0.05), sm); r.position.y = y; r.castShadow = true; g.add(r) }
      for (const e of [-1.3, 1.3]) for (const f of [-0.35, 0.35]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.5, 0.07), leg); l.position.set(e, 0.72, f * 0.6); l.rotation.x = -f * 0.5; g.add(l) }
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), amber); lamp.position.set(-1.3, 1.55, 0); g.add(lamp)
      if (i % 2 === 0) { const b = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.75), bm); b.position.set(0, 1.9, -0.04); b.rotation.y = Math.PI; g.add(b); const b2 = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.75), bm); b2.position.set(0, 1.9, 0.04); g.add(b2); const p = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.7, 0.04), leg); p.position.set(0, 1.5, 0); g.add(p) }
      boxes.push({ c: new V2(x, z), a: new V2(tx, tz), hx: 1.6, hz: 0.4, low: true }) }
    const cg = new THREE.ConeGeometry(0.2, 0.72, 10), bg = new THREE.CylinderGeometry(0.095, 0.125, 0.12, 10), fg = new THREE.BoxGeometry(0.46, 0.04, 0.46)
    // The cones are loose: drive through them and they scatter.
    for (let i = 0; i < 30; i++) { const [x, z] = at(1 + i * (len - 2) / 29, 3.4 + (i % 2) * 1.1), y = surfaceAt(x, z), m = new THREE.Group(); const c = new THREE.Mesh(cg, cone); c.castShadow = true; m.add(c); const b = new THREE.Mesh(bg, band); b.position.y = 0.07; m.add(b); const f = new THREE.Mesh(fg, cone); f.position.y = -0.36; m.add(f); scene.add(m)
      crates.push({ m, half: new V3(0.2, 0.38, 0.2), r: 0.24, home: { pos: new V3(x, y + 0.38, z), yaw: i }, vel: new V3(), spin: new V3(), awake: false }) }
  }

  // --- A bumpy hedge in a mulch strip behind the tall curb along A1A S: the lot is shut from that side.
  { const runs = [[[-100.5, 355.3], [-92.15, 392.0]], [[-92.15, 392.0], [-90.65, 398.6]]], D = new THREE.Object3D(), ms = [], strip = []
    let sd = 5; const rn = () => (sd = (sd * 16807) % 2147483647) / 2147483647
    for (const [[ax, az], [bx, bz]] of runs) { const len = Math.hypot(bx - ax, bz - az) * U, tx = (bx - ax) * U / len, tz = (bz - az) * U / len, nx = -tz, nz = tx, ins = nx > 0 ? 1 : -1
      for (let d = 0.8; d < len - 0.4; d += 1.25) { const x = ax * U + tx * d + nx * ins * 1.15, z = az * U + tz * d + nz * ins * 1.15, sc = 0.55 + rn() * 0.3
        D.position.set(x, GY + sc * 0.6, z); D.rotation.set(0, rn() * 6, 0); D.scale.set(sc * 1.25, sc, sc * 1.15); D.updateMatrix(); ms.push(D.matrix.clone()); bushes.push([x, z, sc * 1.3]) }
      const m = new THREE.Mesh(new THREE.PlaneGeometry(len, 1.7), mulchM); m.rotation.set(-Math.PI / 2, 0, Math.atan2(-tz, tx)); m.position.set((ax + bx) / 2 * U + nx * ins * 1.15, GY + 0.02, (az + bz) / 2 * U + nz * ins * 1.15); m.receiveShadow = true; scene.add(m) }
    const im = new THREE.InstancedMesh(blob, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true }), ms.length), c = new THREE.Color(); ms.forEach((m, n) => { im.setMatrixAt(n, m); im.setColorAt(n, c.set(['#3b6b30', '#4c7d38', '#335f2c'][n % 3])) }); im.castShadow = true; im.frustumCulled = false; scene.add(im) }

  // --- A few more cars parked in the main lot, north and south ends: the same mix of makes the town already has.
  // Hit one and it slides a little the way you pushed it (never up), and dents the Galaxie.
  const kitMats = {}, kitCar = (seed, family) => { const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner)
    for (const part of makeCarParts(seed, undefined, family).parts) { const key = part.color + part.finish
      const mat = kitMats[key] ||= part.finish === 'glass' ? new THREE.MeshStandardMaterial({ color: part.color, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.75 }) : new THREE.MeshStandardMaterial({ color: part.color, roughness: part.finish === 'rubber' ? 0.9 : part.finish === 'chrome' ? 0.25 : 0.5, metalness: part.finish === 'chrome' ? 0.7 : 0.1 })
      const m = new THREE.Mesh(part.geometry, mat); m.position.y = 0.06; m.castShadow = true; inner.add(m) }
    inner.scale.setScalar(U); const bb = new THREE.Box3().setFromObject(inner), half = bb.getSize(new V3()).multiplyScalar(0.5); inner.position.y = -half.y - bb.min.y
    return { g, half } }
  const slideCar = (g, half, X, Z, yaw) => { scene.add(g); crates.push({ m: g, parked: true, heavy: true, half: half.clone(), r: Math.max(half.x, half.z), home: { pos: new V3(X, surfaceAt(X, Z) + half.y, Z), yaw }, vel: new V3(), spin: new V3(), awake: false }) }
  { const taken = (x, z) => DATA.cars.some(([cx, cz]) => Math.hypot(cx - x, cz - z) < 3.2)
    let sd = 31; const rn = () => (sd = (sd * 16807) % 2147483647) / 2147483647
    const spots = []; for (const rx of [-354.2, -339.0, -323.8]) for (const side of [-1, 1]) for (let k = 0; k < 17; k++) spots.push([rx + side * 2.7, 1431 + (k + 0.5) * 3.1855, side])
    spots.sort(() => rn() - 0.5)
    const north = [], south = []
    for (const [x, z, side] of spots) { if (taken(x, z) || [...north, ...south].some(([a, b]) => Math.hypot(a - x, b - z) < 3)) continue; const list = z < 1459 ? north : south; if (list.length < 3) list.push([x, z, side]) }
    const families = [0, 2, 3, 6, 7, 8]
    ;[...north, ...south].forEach(([x, z, side], n) => { const { g, half } = kitCar(4100 + n * 37, families[n % families.length]); slideCar(g, half, x, z, side > 0 ? -Math.PI / 2 : Math.PI / 2) }) }

  // --- Two old Galaxies left to rot in the Winn-Trixie lot, sun-faded paint, and a few tired parking lines.
  { for (const [x, z, yaw, col] of [[-99.6, 414.4, 1.62, '#7d8f93'], [-95.2, 420.6, -1.45, '#a8916a']]) { const v = buildGalaxie(col), m = v.car; m.traverse((o) => { if (o.isMesh) { o.castShadow = true; if (o.material && o.material.color && !o.material.map) { o.material = o.material.clone(); o.material.roughness = Math.min(1, (o.material.roughness ?? 0.5) + 0.35); o.material.metalness = 0 } } })
      if (v.tails) v.tails.forEach((t, i) => { if (i % 2) t.visible = false }); const g = new THREE.Group(); g.add(m); m.position.y = -0.7
      slideCar(g, new V3(1.0, 0.7, 2.7), x * U, z * U, yaw) }
    const line = decalTex(32, 512, (x, w, h) => { x.fillStyle = '#ece6d2'; x.fillRect(6, 0, 20, h) }, 0.55)
    for (const [cx, z0, n] of [[-99.6, 410.6, 7], [-95.2, 416.0, 6]]) for (let k = 0; k <= n; k++) decal(line, cx * U, (z0 + k * 0.78) * U, 0.28, 5.0, Math.PI / 2) }

  // --- The shoppers' buggies: knock one and it goes over and the bags tumble out. The shoppers just stand there.
  { const bagCols = ['#a57a4a', '#d8332c', '#f2c521', '#46a04f', '#e8742c', '#f4f2ea'], K = U
    const wire = new THREE.MeshStandardMaterial({ color: '#c9cdd0', roughness: 0.4, metalness: 0.6 }), rack = new THREE.MeshStandardMaterial({ color: '#8f9498', roughness: 0.5, metalness: 0.5 }), grip = new THREE.MeshStandardMaterial({ color: '#2f8f3a', roughness: 0.6 }), tyre = new THREE.MeshStandardMaterial({ color: '#2a2d30', roughness: 0.9 })
    for (const [x, z, h, i] of DATA.shopCarts || []) { const g = new THREE.Group(), food = []
      const part = (m, lx, y, lz, w, hh, d) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w * K, hh * K, d * K), m); o.position.set(lx * K, (y - 0.15) * K, lz * K); o.castShadow = true; g.add(o); return o }
      part(wire, 0, .185, 0, .13, .012, .2); for (const e of [-1, 1]) part(wire, e * .062, .225, 0, .008, .08, .2); part(wire, 0, .225, .098, .13, .08, .008); part(wire, 0, .225, -.098, .13, .08, .008)
      part(rack, 0, .09, 0, .11, .012, .19); for (const e of [-1, 1]) for (const v of [-1, 1]) { part(rack, e * .055, .13, v * .085, .01, .1, .01); part(tyre, e * .055, .03, v * .085, .014, .035, .035) }
      part(grip, 0, .265, -.115, .14, .014, .014)
      food.push(part(new THREE.MeshStandardMaterial({ color: bagCols[i % 6], roughness: 0.8 }), -.02, .235, .03, .06, .07, .07))
      if (i % 2) food.push(part(new THREE.MeshStandardMaterial({ color: bagCols[(i + 3) % 6], roughness: 0.8 }), .03, .225, -.04, .05, .05, .06))
      scene.add(g); crates.push({ m: g, food, half: new V3(0.3, 0.15 * K, 0.42), r: 0.42, home: { pos: new V3(x, surfaceAt(x, z) + 0.15 * K, z), yaw: h }, vel: new V3(), spin: new V3(), awake: false }) } }

  // --- Two loaded shopping buggies where the cart corrals were, out front of publick: knock them over.
  { const spots = []; for (const [x, z, t] of DATA.corrals || []) { const s = spots.find((p) => Math.hypot(p[0] - x, p[1] - z) < 2.5); if (s) { s[0] = (s[0] + x) / 2; s[1] = (s[1] + z) / 2 } else spots.push([x, z, t]) }
    const wire = new THREE.MeshStandardMaterial({ color: '#c3c8cc', roughness: 0.35, metalness: 0.7 }), grip = new THREE.MeshStandardMaterial({ color: '#2f8f3a', roughness: 0.6 }), tyre = new THREE.MeshStandardMaterial({ color: '#1e1e1e', roughness: 0.9 })
    const foods = [['#c9a25e', [0.34, 0.16, 0.16]], ['#d8332c', 0.09], ['#f4f4ee', [0.13, 0.24, 0.13]], ['#f2c521', [0.2, 0.26, 0.12]], ['#7a3b12', [0.26, 0.2, 0.22]], ['#46a04f', 0.1], ['#e8742c', [0.2, 0.24, 0.12]], ['#d8332c', 0.09]]
    const buggy = (seed) => { const g = new THREE.Group(), bars = []
      const add = (geo, mat, x, y, z, rx = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); m.castShadow = true; g.add(m); return m }
      const rod = (len) => new THREE.CylinderGeometry(0.012, 0.012, len, 5)
      // Basket: a wire frame, open on top.
      for (const y of [0.0, 0.24, 0.48]) { add(rod(0.9), wire, -0.27, y, 0, Math.PI / 2); add(rod(0.9), wire, 0.27, y, 0, Math.PI / 2); add(rod(0.54), wire, 0, y, 0.45, 0, Math.PI / 2); add(rod(0.54), wire, 0, y, -0.45, 0, Math.PI / 2) }
      for (let i = -3; i <= 3; i++) { add(rod(0.48), wire, -0.27, 0.24, i * 0.14); add(rod(0.48), wire, 0.27, 0.24, i * 0.14) }
      for (let i = -2; i <= 2; i++) { add(rod(0.48), wire, i * 0.12, 0.24, 0.45); add(rod(0.48), wire, i * 0.12, 0.24, -0.45) }
      add(new THREE.BoxGeometry(0.54, 0.015, 0.9), wire, 0, 0, 0)
      add(new THREE.CylinderGeometry(0.022, 0.022, 0.6, 8), grip, 0, 0.56, -0.56, 0, Math.PI / 2)
      for (const sx of [-0.27, 0.27]) add(rod(0.2), wire, sx, 0.52, -0.5, 0.9)
      for (const [x, z] of [[-0.22, -0.38], [0.22, -0.38], [-0.2, 0.38], [0.2, 0.38]]) { add(rod(0.5), wire, x, -0.25, z); add(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 10), tyre, x, -0.48, z, 0, Math.PI / 2) }
      add(new THREE.BoxGeometry(0.48, 0.012, 0.8), wire, 0, -0.32, 0)
      // The groceries: a loaf, a milk jug, cereal, a frozen turkey breast, apples, a pumpkin pie.
      const food = []; let k = seed; for (let i = 0; i < 9; i++, k++) { const [col, dim] = foods[k % foods.length], mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.7 })
        const m = Array.isArray(dim) ? new THREE.Mesh(new THREE.BoxGeometry(...dim), mat) : new THREE.Mesh(new THREE.SphereGeometry(dim, 10, 8), mat)
        m.position.set(-0.15 + (i % 3) * 0.15, 0.1 + Math.floor(i / 3) * 0.12 + (i % 2) * 0.03, -0.28 + (i % 4) * 0.18); m.rotation.y = i; m.castShadow = true; g.add(m); food.push(m) }
      const pie = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.05, 16), new THREE.MeshStandardMaterial({ color: '#c96a1e', roughness: 0.7 })); pie.position.set(0.08, 0.42, 0.2); g.add(pie); food.push(pie); g.userData.food = food
      g.traverse((o) => { if (o.isMesh) o.position.y -= 0.0 }); return g }
    spots.slice(0, 2).forEach(([x, z, t], i) => { const m = buggy(i * 3); scene.add(m); crates.push({ m, food: m.userData.food, half: new V3(0.3, 0.5, 0.48), r: 0.5, home: { pos: new V3(x, GY + 0.5, z), yaw: t + 0.4 - i * 0.8 }, vel: new V3(), spin: new V3(), awake: false }) })
  }

  // --- The Winn-Trixie end of the lot has gone to seed: potholes, weeds in the cracks, litter, a car on blocks,
  // a mattress, a NO LOITERING sign everyone ignores, and a sagging chain-link fence along the side facing the houses.
  { let sd = 77; const rn = () => (sd = (sd * 16807) % 2147483647) / 2147483647, inLot = (x, z) => x > -107.6 && x < -92 && z > 416.2 && z < 431.5 && !(x < -101 && z > 415.5 && z < 425.5) // only the Winn-Trixie end: PCN Bank's end stays tidy
    const hole = decalTex(128, 128, (x) => { const g2 = x.createRadialGradient(64, 64, 8, 64, 64, 60); g2.addColorStop(0, 'rgba(18,16,14,.95)'); g2.addColorStop(0.55, 'rgba(40,36,32,.8)'); g2.addColorStop(1, 'rgba(40,36,32,0)'); x.fillStyle = g2; x.beginPath(); for (let k = 0; k < 14; k++) { const a = k / 14 * 6.28, r = 40 + Math.random() * 22; x.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r) } x.fill() }, 0)
    const crack = decalTex(256, 256, (x) => { x.strokeStyle = 'rgba(15,14,12,.85)'; x.lineWidth = 3; for (let k = 0; k < 7; k++) { x.beginPath(); let px = 128, py = 128; x.moveTo(px, py); for (let j = 0; j < 9; j++) { px += (Math.random() - 0.5) * 50; py += (Math.random() - 0.5) * 50; x.lineTo(px, py) } x.stroke() } }, 0)
    const stain = decalTex(128, 128, (x) => { const g2 = x.createRadialGradient(64, 64, 4, 64, 64, 62); g2.addColorStop(0, 'rgba(20,16,12,.55)'); g2.addColorStop(1, 'rgba(20,16,12,0)'); x.fillStyle = g2; x.fillRect(0, 0, 128, 128) }, 0)
    const weedM = [new THREE.MeshStandardMaterial({ color: '#6f8a3a', roughness: 1 }), new THREE.MeshStandardMaterial({ color: '#8f9a4a', roughness: 1 })], blade = new THREE.ConeGeometry(0.05, 0.5, 4)
    for (let i = 0; i < 70; i++) { const x = -107 + rn() * 15, z = 406.8 + rn() * 24.5; if (!inLot(x, z)) continue; const X = x * U, Z = z * U, k = rn()
      if (k < 0.16) decal(hole, X, Z, 1 + rn() * 1.4, 0.8 + rn() * 1.1, rn() * 6, 0.024)
      else if (k < 0.5) decal(crack, X, Z, 3 + rn() * 3, 3 + rn() * 3, rn() * 6, 0.022)
      else if (k < 0.66) decal(stain, X, Z, 2 + rn() * 3, 1.5 + rn() * 2, rn() * 6, 0.021)
      else { const y = surfaceAt(X, Z); for (let j = 0; j < 7; j++) { const b = new THREE.Mesh(blade, weedM[j % 2]), a = j * 0.9, t = j ? 0.3 + rn() * 0.4 : 0; b.position.set(X + Math.sin(a) * t * 0.2, y + 0.24, Z + Math.cos(a) * t * 0.2); b.rotation.set(t, a, 0, 'YXZ'); scene.add(b) } } }
    // Litter: cups, flattened boxes, bags, a tyre or two.
    const litM = [new THREE.MeshStandardMaterial({ color: '#e8e4da', roughness: 0.7 }), new THREE.MeshStandardMaterial({ color: '#a8845a', roughness: 1 }), new THREE.MeshStandardMaterial({ color: '#1b1c1e', roughness: 0.5 }), new THREE.MeshStandardMaterial({ color: '#c0392b', roughness: 0.6 })]
    for (let i = 0; i < 40; i++) { const x = -107 + rn() * 15, z = 406.8 + rn() * 24.5; if (!inLot(x, z)) continue; const X = x * U, Z = z * U, y = surfaceAt(X, Z), k = Math.floor(rn() * 4)
      const m = k === 0 ? new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.13, 8), litM[rn() > 0.5 ? 0 : 3]) : k === 1 ? new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, 0.45), litM[1]) : k === 2 ? new THREE.Mesh(blob, litM[2]) : new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.11, 8, 16), litM[2])
      if (k === 0) { m.rotation.z = Math.PI / 2; m.position.set(X, y + 0.05, Z) } else if (k === 2) { m.scale.set(0.3, 0.24, 0.28); m.position.set(X, y + 0.2, Z) } else if (k === 3) { m.rotation.x = Math.PI / 2; m.position.set(X, y + 0.11, Z) } else m.position.set(X, y + 0.02, Z)
      m.rotation.y = rn() * 6; m.castShadow = true; scene.add(m) }
    // A beater up on cinder blocks, no wheels, a blue tarp over the windshield.
    { const X = -104.5 * U, Z = 409.2 * U, y = surfaceAt(X, Z), g = new THREE.Group(); g.position.set(X, y, Z); g.rotation.y = 0.3; scene.add(g)
      const rust = new THREE.MeshStandardMaterial({ color: '#7a5a3e', roughness: 0.95 }), paintM = new THREE.MeshStandardMaterial({ color: '#7d8a8e', roughness: 0.8 }), blk = new THREE.MeshStandardMaterial({ color: '#9b9790', roughness: 1 })
      const add = (geo, m, x, yy, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, yy, z); o.castShadow = true; g.add(o); return o }
      add(new THREE.BoxGeometry(1.8, 0.6, 4.4), paintM, 0, 0.75, 0); add(new THREE.BoxGeometry(1.6, 0.5, 2.0), paintM, 0, 1.3, -0.3); add(new THREE.BoxGeometry(1.0, 0.62, 1.2), rust, 0.45, 0.76, 1.2)
      add(new THREE.BoxGeometry(1.7, 0.45, 0.04), new THREE.MeshStandardMaterial({ color: '#2b6fc0', roughness: 0.8 }), 0, 1.35, 0.71).rotation.x = -0.4
      for (const [x, z] of [[-0.7, 1.4], [0.7, 1.4], [-0.7, -1.4], [0.7, -1.4]]) add(new THREE.BoxGeometry(0.38, 0.45, 0.2), blk, x, 0.22, z)
      boxes.push({ c: new V2(X, Z), a: new V2(Math.cos(0.3), -Math.sin(0.3)), hx: 0.95, hz: 2.25 }) }
    // A mattress against the store wall, and the sign.
    { const X = -102.4 * U, Z = 425.3 * U, m = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.0, 0.22), new THREE.MeshStandardMaterial({ color: '#d9cfb6', roughness: 1 })); m.position.set(X, surfaceAt(X, Z) + 0.95, Z); m.rotation.set(0.25, 0.4, 0.05); m.castShadow = true; scene.add(m)
      const c = document.createElement('canvas'); c.width = 256; c.height = 192; const x = c.getContext('2d'); x.fillStyle = '#f4f2ea'; x.fillRect(0, 0, 256, 192); x.strokeStyle = '#c0141a'; x.lineWidth = 10; x.strokeRect(6, 6, 244, 180); x.fillStyle = '#c0141a'; x.textAlign = 'center'; x.font = '900 46px Anton, Impact, sans-serif'; x.fillText('NO', 128, 66); x.fillText('LOITERING', 128, 118, 230); x.fillStyle = '#222'; x.font = '700 20px sans-serif'; x.fillText('VIOLATORS WILL BE TOWED', 128, 160, 230)
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const sg = new THREE.Group(), SX = -96.5 * U, SZ = 430.6 * U; sg.position.set(SX, surfaceAt(SX, SZ), SZ); sg.rotation.set(0, 0.2, 0.12); scene.add(sg)
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6), new THREE.MeshStandardMaterial({ color: '#888', metalness: 0.5 })); pole.position.y = 1.2; sg.add(pole)
      for (const s2 of [1, -1]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.68), new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 })); f.position.set(0, 2.0, s2 * 0.03); if (s2 < 0) f.rotation.y = Math.PI; sg.add(f) } }
    // The low back corner by the woods has flooded: brown standing water with tyres, bags, a cart and cans floating in it.
    { const x0 = -107.6, x1 = -98.0, z0 = 427.2, z1 = 431.9, sh = new THREE.Shape(); let sd3 = 13; const r3 = () => (sd3 = (sd3 * 16807) % 2147483647) / 2147483647
      for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2, rx = (x1 - x0) / 2 * (0.86 + r3() * 0.14), rz = (z1 - z0) / 2 * (0.82 + r3() * 0.18), px = ((x0 + x1) / 2 + Math.cos(a) * rx) * U, pz = -((z0 + z1) / 2 + Math.sin(a) * rz) * U; k ? sh.lineTo(px, pz) : sh.moveTo(px, pz) }
      const waterM = new THREE.MeshStandardMaterial({ color: '#5a5236', roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.92, envMapIntensity: 0.25, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })
      const water = new THREE.Mesh(new THREE.ShapeGeometry(sh, 2).rotateX(-Math.PI / 2), waterM); water.position.y = GY + 0.05; water.receiveShadow = true; scene.add(water)
      const muck = new THREE.Mesh(new THREE.ShapeGeometry(sh, 2).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#3a3324', roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); muck.scale.set(1.04, 1, 1.06); muck.position.set(-(x0 + x1) / 2 * U * 0.04, GY + 0.03, -(z0 + z1) / 2 * U * 0.06); scene.add(muck)
      window.__flood = { x0: x0 * U, x1: x1 * U, z0: z0 * U, z1: z1 * U }
      const tyreM = new THREE.MeshStandardMaterial({ color: '#1b1b1b', roughness: 0.85 }), bagM = new THREE.MeshStandardMaterial({ color: '#16171a', roughness: 0.35 }), bagW = new THREE.MeshStandardMaterial({ color: '#d8d6cc', roughness: 0.5 }), canM = new THREE.MeshStandardMaterial({ color: '#c0392b', roughness: 0.5 }), foamM = new THREE.MeshStandardMaterial({ color: '#ece8dc', roughness: 0.9 })
      for (let i = 0; i < 30; i++) { const x = (x0 + 0.6 + r3() * (x1 - x0 - 1.2)) * U, z = (z0 + 0.5 + r3() * (z1 - z0 - 1.0)) * U, k = i % 6
        const m = k < 2 ? new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.12, 8, 18), tyreM) : k < 4 ? new THREE.Mesh(blob, k === 2 ? bagM : bagW) : k === 4 ? new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.12, 8), canM) : new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.22), foamM)
        if (k < 2) { m.rotation.set(Math.PI / 2 + (r3() - 0.5) * 0.5, 0, r3()); m.position.set(x, GY + 0.08, z) } else if (k < 4) { m.scale.set(0.32, 0.18, 0.28); m.position.set(x, GY + 0.1, z) } else { m.rotation.set(Math.PI / 2, r3() * 6, 0); m.position.set(x, GY + 0.07, z) }
        m.userData.bob = r3() * 6; m.castShadow = true; scene.add(m); (window.__floaters ||= []).push(m) }
      // A half-sunk cart tipped on its side, and a tyre leaning against a post.
      { const c = new THREE.Group(), w2 = new THREE.MeshStandardMaterial({ color: '#8a7a62', roughness: 0.8, metalness: 0.3 }); for (const y of [0, 0.25, 0.5]) for (const zz of [-0.45, 0.45]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.56, 5), w2); r.rotation.z = Math.PI / 2; r.position.set(0, y, zz); c.add(r) } for (let i = -3; i <= 3; i++) for (const xx of [-0.28, 0.28]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.5, 5), w2); r.position.set(xx, 0.25, i * 0.15); c.add(r) }
        c.position.set(-101.8 * U, GY - 0.05, 429.6 * U); c.rotation.set(0, 0.7, 1.4); scene.add(c) } }
    // Seven busted shopping carts strewn about the lot: wheels missing, baskets bent, a couple on their sides — and a man sitting in one.
    { const wireM = new THREE.MeshStandardMaterial({ color: '#b3b8bc', roughness: 0.45, metalness: 0.6 }), rustM = new THREE.MeshStandardMaterial({ color: '#8a6a4a', roughness: 0.9 }), handleM = new THREE.MeshStandardMaterial({ color: '#c0392b', roughness: 0.6 }), tyreM = new THREE.MeshStandardMaterial({ color: '#1e1e1e', roughness: 0.9 })
      const coat = new THREE.MeshStandardMaterial({ color: '#4a5a6a', roughness: 0.95 }), jeans = new THREE.MeshStandardMaterial({ color: '#2f3b52', roughness: 0.9 }), skin = new THREE.MeshStandardMaterial({ color: '#c49272', roughness: 0.8 }), cap = new THREE.MeshStandardMaterial({ color: '#2d6b3a', roughness: 0.9 })
      const rod = (len) => new THREE.CylinderGeometry(0.013, 0.013, len, 5)
      const cart = (seed, withMan) => { const g = new THREE.Group(), add = (geo, m, x, y, z, rx = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, 0, rz); o.castShadow = true; g.add(o); return o }
        const bend = (seed % 3) * 0.08
        for (const y of [0.0, 0.25, 0.5]) { add(rod(0.95), seed % 2 ? rustM : wireM, -0.28, y, 0, Math.PI / 2); add(rod(0.95), wireM, 0.28 - (y > 0.3 ? bend : 0), y, 0, Math.PI / 2); add(rod(0.56), wireM, 0, y, 0.47, 0, Math.PI / 2); add(rod(0.56), wireM, 0, y, -0.47, 0, Math.PI / 2) }
        for (let i = -3; i <= 3; i++) { add(rod(0.5), wireM, -0.28, 0.25, i * 0.15, 0, 0); add(rod(0.5), wireM, 0.28 - bend * 0.5, 0.25, i * 0.15, 0, bend) }
        for (let i = -2; i <= 2; i++) add(rod(0.5), wireM, i * 0.12, 0.25, 0.47)
        add(new THREE.CylinderGeometry(0.024, 0.024, 0.62, 8), handleM, 0, 0.6, -0.6, 0, Math.PI / 2 + (seed % 2 ? 0.25 : 0))
        for (const [k, x, z] of [[0, -0.23, -0.4], [1, 0.23, -0.4], [2, -0.21, 0.4], [3, 0.21, 0.4]]) { add(rod(0.5), wireM, x, -0.25, z); if ((seed + k) % 3) add(new THREE.CylinderGeometry(0.065, 0.065, 0.04, 10), tyreM, x, -0.49, z, 0, Math.PI / 2) }
        add(new THREE.BoxGeometry(0.5, 0.012, 0.84), wireM, 0, -0.33, 0)
        if (withMan) { const m = new THREE.Group(); m.position.set(0, 0.08, -0.12); g.add(m) // sitting in the basket, legs hooked over the front
          const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.55, 10), coat); torso.position.y = 0.32; torso.rotation.x = -0.25; m.add(torso)
          const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), skin); head.position.set(0, 0.7, -0.06); m.add(head)
          const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.07, 12), cap); hat.position.set(0, 0.8, -0.06); m.add(hat); const brim = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.12), cap); brim.position.set(0, 0.77, 0.08); m.add(brim)
          for (const e of [-1, 1]) { const th = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.5, 8), jeans); th.rotation.x = Math.PI / 2 - 0.2; th.position.set(e * 0.1, 0.12, 0.3); m.add(th)
            const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.45, 8), jeans); shin.position.set(e * 0.1, -0.12, 0.6); m.add(shin)
            const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.2), tyreM); shoe.position.set(e * 0.1, -0.35, 0.65); m.add(shoe)
            const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.45, 8), coat); arm.position.set(e * 0.25, 0.35, 0.05); arm.rotation.z = e * 0.5; m.add(arm) }
          const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.24, 8), new THREE.MeshStandardMaterial({ color: '#8a6a3a', roughness: 0.4 })); bottle.position.set(0.36, 0.2, 0.1); m.add(bottle) }
        return g }
      const spots = [[-99.2, 411.8, 0.4, 0], [-96.6, 418.4, 2.2, 1], [-93.8, 413.6, 1.1, 0], [-99.8, 427.6, -0.6, 2], [-95.4, 424.9, 2.9, 0], [-92.9, 429.4, 0.8, 1], [-97.6, 421.2, 1.7, 0]]
      spots.forEach(([x, z, yaw, side], i) => { const m = cart(i, false); scene.add(m); const X = x * U, Z = z * U
        if (side) { m.rotation.z = side === 1 ? Math.PI / 2 : -Math.PI / 2 }  // lying on its side
        crates.push({ m, half: new V3(0.3, side ? 0.3 : 0.5, 0.48), r: 0.5, home: { pos: new V3(X, surfaceAt(X, Z) + (side ? 0.3 : 0.5), Z), yaw }, vel: new V3(), spin: new V3(), awake: false })
        if (side) crates[crates.length - 1].home.roll = m.rotation.z })
      // His cart's man: standing beside it in a green cap, bottle in hand, staring at nothing. He doesn't move, and you can't hit him.
      { const g = new THREE.Group(), X = -98.15 * U, Z = 421.6 * U; g.position.set(X, surfaceAt(X, Z), Z); g.rotation.y = 2.4; scene.add(g)
        const add = (geo, m, x, y, z, rx = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, 0, rz); o.castShadow = true; g.add(o); return o }
        for (const e of [-1, 1]) { add(new THREE.CylinderGeometry(0.075, 0.065, 0.85, 8), jeans, e * 0.1, 0.45, 0); add(new THREE.BoxGeometry(0.11, 0.08, 0.24), tyreM, e * 0.1, 0.04, 0.05)
          add(new THREE.CylinderGeometry(0.05, 0.045, 0.6, 8), coat, e * 0.27, 1.12, 0.02, 0, e * 0.12) }
        add(new THREE.CylinderGeometry(0.19, 0.17, 0.62, 10), coat, 0, 1.18, 0); add(new THREE.SphereGeometry(0.13, 12, 10), skin, 0, 1.62, 0.02)
        add(new THREE.CylinderGeometry(0.14, 0.14, 0.07, 12), cap, 0, 1.72, 0.02); add(new THREE.BoxGeometry(0.2, 0.02, 0.12), cap, 0, 1.69, 0.16)
        add(new THREE.CylinderGeometry(0.04, 0.045, 0.24, 8), new THREE.MeshStandardMaterial({ color: '#8a6a3a', roughness: 0.4 }), 0.29, 0.86, 0.05)
        circles.push([X, Z, 0.45]) } }
    // Six dumpsters lined up along the store's blank side wall, one of them with a man living in it.
    { const green = new THREE.MeshStandardMaterial({ color: '#2f5a3c', roughness: 0.8 }), blue = new THREE.MeshStandardMaterial({ color: '#2a4f7a', roughness: 0.8 }), lidM = new THREE.MeshStandardMaterial({ color: '#1d1f20', roughness: 0.6 }), bagM = new THREE.MeshStandardMaterial({ color: '#17181a', roughness: 0.45 }), whl = new THREE.MeshStandardMaterial({ color: '#2a2c2e', roughness: 0.7 })
      const skin = new THREE.MeshStandardMaterial({ color: '#b98a66', roughness: 0.8 }), beanie = new THREE.MeshStandardMaterial({ color: '#b5541e', roughness: 0.9 }), coat = new THREE.MeshStandardMaterial({ color: '#5b5a3c', roughness: 0.95 }), beard = new THREE.MeshStandardMaterial({ color: '#8a8478', roughness: 1 })
      for (let i = 0; i < 6; i++) { const X = (-107.9 + i * 0.6) * U, Z = 425.75 * U, open = i === 1 || i === 3 || i === 4, man = i === 3, g = new THREE.Group()
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.25, 1.35), i % 3 === 2 ? blue : green); body.position.y = 0; body.castShadow = true; g.add(body)
        for (const sx of [-0.53, 0.53]) { const lid = new THREE.Mesh(new THREE.BoxGeometry(1.03, 0.05, 1.4), lidM); lid.position.set(sx, 0.65, 0); if (open && sx > (man ? -1 : 0)) { lid.rotation.x = -1.9; lid.position.set(sx, 1.23, -0.75) } lid.castShadow = true; g.add(lid) }
        for (const [wx, wz] of [[-0.9, -0.55], [0.9, -0.55], [-0.9, 0.55], [0.9, 0.55]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 8), whl); w.rotation.z = Math.PI / 2; w.position.set(wx, -0.63, wz); g.add(w) }
        if (open && !man) for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(blob, bagM); b.scale.set(0.34, 0.28, 0.32); b.position.set(-0.5 + k * 0.35, 0.68 + (k % 2) * 0.12, -0.2 + (k % 3) * 0.2); g.add(b) }
        if (man) { const m = new THREE.Group(); m.position.set(0.05, 0.62, 0.15); g.add(m)
          const sh = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), coat); sh.scale.set(1.25, 0.7, 0.8); m.add(sh)
          const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), skin); head.position.y = 0.34; m.add(head)
          const hat = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), beanie); hat.position.y = 0.37; m.add(hat)
          const bd = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), beard); bd.scale.set(1, 0.9, 0.7); bd.position.set(0, 0.25, 0.07); m.add(bd)
          for (const e of [-1, 1]) { const ey = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 4), new THREE.MeshBasicMaterial({ color: '#111' })); ey.position.set(e * 0.05, 0.37, 0.125); m.add(ey) }
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8), coat); arm.rotation.set(1.3, 0, 0.4); arm.position.set(0.32, 0.05, 0.32); m.add(arm)
          const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), skin); hand.position.set(0.42, 0.06, 0.5); m.add(hand)
          const can = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.12, 8), new THREE.MeshStandardMaterial({ color: '#c0392b', roughness: 0.5 })); can.position.set(0.42, 0.14, 0.5); m.add(can)
          window.__hobo = m }
        g.traverse((o) => { if (o.isMesh) o.castShadow = true }); scene.add(g)
        crates.push({ m: g, half: new V3(1.05, 0.72, 0.68), r: 1.1, heavy: true, home: { pos: new V3(X, GY + 0.72, Z), yaw: (i % 2 ? 0.05 : -0.04) }, vel: new V3(), spin: new V3(), awake: false }) } }
    // Chain-link fence along the north edge, between the lot and the houses: sagging, a few slats missing, a post leaning.
    { const c = document.createElement('canvas'); c.width = 128; c.height = 128; const x = c.getContext('2d'); x.strokeStyle = '#b9bcbe'; x.lineWidth = 3
      for (let i = -128; i < 256; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 128, 128); x.stroke(); x.beginPath(); x.moveTo(i + 128, 0); x.lineTo(i, 128); x.stroke() }
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace
      const meshM = new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.5 }), postM = new THREE.MeshStandardMaterial({ color: '#9a9ea2', metalness: 0.6, roughness: 0.45 })
      const H = 1.9
      const run = (ax, az, bx, bz, n, gap) => { ax *= U; az *= U; bx *= U; bz *= U; const len0 = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / len0, tz = (bz - az) / len0, yaw = Math.atan2(-tz, tx)
        for (let i = 0; i <= n; i++) { const px = ax + (bx - ax) * i / n, pz = az + (bz - az) * i / n, post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, H + 0.1, 6), postM); post.position.set(px, surfaceAt(px, pz) + (H + 0.1) / 2, pz); post.rotation.x = i === 3 ? 0.2 : 0; post.castShadow = true; scene.add(post)
          if (i === n || i === gap) continue
          const len = len0 / n, cx = px + tx * len / 2, cz = pz + tz * len / 2, y = surfaceAt(cx, cz)
          const pt = t.clone(); pt.repeat.set(len / 0.35, H / 0.35); pt.needsUpdate = true
          const g = new THREE.PlaneGeometry(len, H, 6, 1); const pa = g.attributes.position; for (let k = 0; k < pa.count; k++) { const u = pa.getX(k) / len + 0.5; pa.setZ(k, Math.sin(u * Math.PI) * (i % 3 === 1 ? 0.18 : 0.06)) }
          const m = new THREE.Mesh(g, meshM.clone()); m.material.map = pt; m.position.set(cx, y + H / 2, cz); m.rotation.y = yaw; scene.add(m)
          const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, len, 6), postM); rail.rotation.set(0, yaw, Math.PI / 2, 'YXZ'); rail.position.set(cx, y + H, cz); scene.add(rail)
          boxes.push({ c: new V2(cx, cz), a: new V2(tx, tz), hx: len / 2, hz: 0.12 }) } }
      // Along the street side, from the houses to the bank (open in front of the bank), then down the side by the houses.
      run(-108.0, 405.9, -99.4, 405.9, 7, 4); run(-108.0, 405.9, -108.0, 421.0, 9, -1)
      // ...and NO LOITERING signs zip-tied all along it, every which way.
      const nl = (() => { const c2 = document.createElement('canvas'); c2.width = 192; c2.height = 128; const y = c2.getContext('2d'); y.fillStyle = '#f4f2ea'; y.fillRect(0, 0, 192, 128); y.strokeStyle = '#c0141a'; y.lineWidth = 8; y.strokeRect(4, 4, 184, 120); y.fillStyle = '#c0141a'; y.textAlign = 'center'; y.font = '900 40px Anton, Impact, sans-serif'; y.fillText('NO', 96, 52); y.fillText('LOITERING', 96, 96, 176); const tt = new THREE.CanvasTexture(c2); tt.colorSpace = THREE.SRGBColorSpace; return tt })()
      const nlM = new THREE.MeshStandardMaterial({ map: nl, roughness: 0.7, side: THREE.DoubleSide }), nlG = new THREE.PlaneGeometry(0.6, 0.4)
      let sd2 = 9; const r2 = () => (sd2 = (sd2 * 16807) % 2147483647) / 2147483647
      for (let i = 0; i < 22; i++) { const m = new THREE.Mesh(nlG, nlM), y = GY + 0.7 + r2() * 0.9; if (i < 13) { const x = (-107.7 + (8.2 * i / 12) + (r2() - 0.5) * 0.15) * U; if (Math.abs(x / U + 102.4) < 0.7) continue; m.position.set(x, y, 405.9 * U + 0.03 * (i % 2 ? 1 : -1)) } else { m.position.set(-108.0 * U + 0.03, y, (406.5 + (14 * (i - 13) / 8)) * U); m.rotation.y = Math.PI / 2 } m.rotation.z = (r2() - 0.5) * 0.5; scene.add(m) } }
  }

  // --- Winn-Trixie, sharing a lot with PCN Bank: a long tan box with a red banner apologizing for the turkeys.
  { const fx = -104.6, cz = 420.5, L = 9.0 * U, D = 3.4 * U, H = 6.4, y = GY
    const lotM = new THREE.MeshStandardMaterial({ color: '#8d9192', roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }); lotM.onBeforeCompile = paveShader
    const shp = new THREE.Shape([[-108.1, 405.6], [-91.0, 405.6], [-87.1, 432.1], [-108.1, 432.1]].map(([x, z]) => new THREE.Vector2(x * U, -z * U)))
    const lot = new THREE.Mesh(new THREE.ShapeGeometry(shp).rotateX(-Math.PI / 2), lotM); lot.position.y = y - 0.012; lot.receiveShadow = true; scene.add(lot)
    const shp2 = new THREE.Shape([[-87.3, 416.4], [-80.35, 416.4], [-80.35, 432.1], [-83.9, 432.1]].map(([x, z]) => new THREE.Vector2(x * U, -z * U)))
    const lot2 = new THREE.Mesh(new THREE.ShapeGeometry(shp2).rotateX(-Math.PI / 2), lotM); lot2.position.y = y - 0.012; lot2.receiveShadow = true; scene.add(lot2)
    const tan = new THREE.MeshStandardMaterial({ color: '#dccdb0', roughness: 0.9 }), trim = new THREE.MeshStandardMaterial({ color: '#b8a888', roughness: 0.9 }), glass = new THREE.MeshStandardMaterial({ color: '#2f3d44', roughness: 0.2, metalness: 0.5 })
    const g = new THREE.Group(); g.position.set(fx * U, y, cz * U); scene.add(g)
    const box = (w, h, d, m, x, yy, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, yy, z); b.castShadow = b.receiveShadow = true; g.add(b); return b }
    box(D, H, L, tan, -D / 2, H / 2, 0); box(D + 0.4, 0.5, L + 0.4, trim, -D / 2, H + 0.25, 0)
    box(0.6, H + 1.6, 7, tan, 0.3, (H + 1.6) / 2, 0)
    box(0.05, 2.6, 5.4, glass, 0.63, 1.3, 0); box(2.4, 0.3, 7.4, trim, 1.2, 3.2, 0)
    for (const dz of [-1, 1]) for (const k of [0, 1, 2]) box(0.05, 1.8, 2.6, glass, 0.03, 1.4, dz * (7.5 + k * 3.2))
    const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t }
    const name = tex(1024, 192, (x, w, h) => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.fillStyle = '#d6202a'; x.font = 'italic 900 128px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('Winn-Trixie', w / 2 - 50, h / 2 + 6, 760)
      x.strokeStyle = '#d6202a'; x.lineWidth = 22; x.lineCap = 'round'; x.beginPath(); x.moveTo(w - 170, h / 2); x.lineTo(w - 130, h / 2 + 40); x.lineTo(w - 50, h / 2 - 50); x.stroke() })
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 1.24), new THREE.MeshStandardMaterial({ map: name, roughness: 0.6 })); sign.rotation.y = Math.PI / 2; sign.position.set(0.62, H + 0.75, 0); g.add(sign)
    const ban = tex(2048, 256, (x, w, h) => { x.fillStyle = '#c8102e'; x.fillRect(0, 0, w, h); x.strokeStyle = '#fff'; x.lineWidth = 10; x.strokeRect(14, 14, w - 28, h - 28); x.fillStyle = '#fff'; x.font = '900 120px Anton, Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('WE HAVEN’T HAD TURKEYS IN WEEKS — SORRY', w / 2, h / 2 + 4, w - 80) })
    const bm = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.86, L * 0.86 / 8), new THREE.MeshStandardMaterial({ map: ban, roughness: 0.8, side: THREE.DoubleSide })); bm.rotation.y = Math.PI / 2; bm.position.set(0.66, 4.6, 0); g.add(bm)
    boxes.push({ c: new V2((fx * U) - D / 2 + 0.3, cz * U), a: new V2(1, 0), hx: D / 2 + 0.6, hz: L / 2 + 0.2 })
    const stall = decalTex(64, 512, (x, w, h) => { x.fillStyle = CREAM; x.fillRect(w / 2 - 4, 0, 8, h) }, 0.4)
    for (const row of [-98.2, -94.2]) for (let k = 0; k < 9; k++) decal(stall, row * U, (412 + k * 2.2) * U, 0.7, 5.4, Math.PI / 2)
    const ps = tex(512, 384, (x, w, h) => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.fillStyle = '#d6202a'; x.font = 'italic 900 92px Georgia, serif'; x.textAlign = 'center'; x.fillText('Winn-Trixie', w / 2, 140, 470); x.fillRect(0, 220, w, 164); x.fillStyle = '#fff'; x.font = '900 54px Anton, Impact, sans-serif'; x.fillText('NO TURKEYS · SORRY', w / 2, 320, 470) })
    const pg = new THREE.Group(); pg.position.set(-90.6 * U, surfaceAt(-90.6 * U, 424 * U), 424 * U); pg.rotation.y = Math.PI / 2; scene.add(pg)
    for (const s2 of [1, -1]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.55), new THREE.MeshStandardMaterial({ map: ps, roughness: 0.6 })); f.position.set(0, 4.0, s2 * 0.16); if (s2 < 0) f.rotation.y = Math.PI; pg.add(f) }
    const post = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.7, 0.3), trim); post.position.y = 1.35; pg.add(post); circles.push([-90.6 * U, 424 * U, 0.8])
  }

  // --- Spray-painted graffiti: hand-tilted letters, outline, fade, drips and overspray, stuck onto the first wall a ray hits.
  const sprayTag = (lines, [c0, c1, c2, glow], from, dir, W, H) => { const c = document.createElement('canvas'); c.width = 2048; c.height = 384; const x = c.getContext('2d')
    // Hand-sprayed: every letter tilted and bounced on its own, a fat dark outline, a pink-to-purple fade, a white shine,
    // soft overspray round the edges, and paint dripping down.
    let sd = 42; const rn = () => (sd = (sd * 16807) % 2147483647) / 2147483647
    const drips = []
    x.textBaseline = 'middle'; x.lineJoin = 'round'; x.lineCap = 'round'
    for (const [text, y0] of lines) {
      const font = (sz) => `italic 900 ${sz}px "Arial Black", Impact, sans-serif`; x.font = font(104)
      let w = 0; const ws = [...text].map((ch) => { const v = ch === ' ' ? 34 : x.measureText(ch).width * 0.86; w += v; return v }), k = Math.min(lines.length > 1 ? 1 : 2.1, 1960 / w)
      let px = 1024 - w * k / 2
      const glyphs = [...text].map((ch, i) => { const g = { ch, x: px + ws[i] * k / 2, y: y0 + (rn() - 0.5) * 16 + Math.sin(i * 0.7) * 5, r: (rn() - 0.5) * 0.22, sz: 104 * k * (0.9 + rn() * 0.22) }; px += ws[i] * k; return g })
      for (const pass of ['spray', 'outline', 'fill', 'shine']) for (const g of glyphs) { if (g.ch === ' ') continue
        x.save(); x.translate(g.x, g.y); x.rotate(g.r); x.transform(1, 0, -0.18, 1, 0, 0); x.font = font(g.sz); x.textAlign = 'center'
        if (pass === 'spray') { x.shadowColor = glow; x.shadowBlur = 26; x.fillStyle = glow.replace('0.85', '0.35'); x.fillText(g.ch, 0, 0) }
        if (pass === 'outline') { x.strokeStyle = '#1a0c1e'; x.lineWidth = 20; x.strokeText(g.ch, 0, 0); x.strokeStyle = '#f7f2ff'; x.lineWidth = 9; x.strokeText(g.ch, 0, 0) }
        if (pass === 'fill') { const gr = x.createLinearGradient(0, -g.sz / 2, 0, g.sz / 2); gr.addColorStop(0, c0); gr.addColorStop(0.55, c1); gr.addColorStop(1, c2); x.fillStyle = gr; x.fillText(g.ch, 0, 0); if (rn() < 0.45) drips.push([g.x + (rn() - 0.5) * g.sz * 0.4, g.y + g.sz * 0.38, 18 + rn() * 70]) }
        if (pass === 'shine') { x.globalAlpha = 0.55; x.fillStyle = '#fff'; x.fillRect(-g.sz * 0.25, -g.sz * 0.33, g.sz * 0.18, 4) }
        x.restore() }
    }
    for (const [dx, dy, len] of drips) { const gr = x.createLinearGradient(0, dy, 0, dy + len); gr.addColorStop(0, c1); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(dx - 2.5, dy, 5, len); x.beginPath(); x.arc(dx, dy + len - 4, 4, 0, 7); x.globalAlpha = 0.6; x.fill(); x.globalAlpha = 1 }
    for (let i = 0; i < 1400; i++) { x.globalAlpha = 0.08 + rn() * 0.25; x.fillStyle = c1; const a = rn() * 6.28, r = 40 + rn() * 180; x.fillRect(1024 + Math.cos(a) * r * 5.2 * rn(), 190 + Math.sin(a) * r * 0.9 * rn(), 2, 2) } x.globalAlpha = 1
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
    const m = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }))
    // Find the strip's long blank back wall (it faces A1A S) and paint straight onto it.
    const rc = new THREE.Raycaster(from, dir), h = rc.intersectObject(world.scene, true)[0]
    if (h) { const n = h.face.normal.clone().transformDirection(h.object.matrixWorld); n.y = 0; n.normalize(); m.position.copy(h.point).addScaledVector(n, 0.04); m.rotation.y = Math.atan2(n.x, n.z); scene.add(m) } }

  // A union poster pasted on the wall under PIZZAZZ: old-school labor print, red and black on cream, a raised fist.
  { const c = document.createElement('canvas'); c.width = 768; c.height = 1024; const x = c.getContext('2d')
    x.fillStyle = '#efe4c8'; x.fillRect(0, 0, 768, 1024)
    x.fillStyle = '#b3201c'; x.beginPath(); for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; x.moveTo(384, 430); x.arc(384, 430, 900, a, a + Math.PI / 24) } x.fill()
    x.fillStyle = '#efe4c8'; x.beginPath(); x.arc(384, 430, 200, 0, 7); x.fill()
    x.fillStyle = '#1b1b1b' // the raised fist
    x.fillRect(330, 470, 110, 260); x.beginPath(); x.roundRect(284, 300, 200, 190, 40); x.fill()
    x.fillStyle = '#efe4c8'; for (let k = 0; k < 3; k++) x.fillRect(300 + k * 50 + 44, 318, 6, 100); x.fillRect(296, 410, 150, 6)
    x.fillStyle = '#1b1b1b'; x.fillRect(0, 0, 768, 150); x.fillRect(0, 800, 768, 224)
    x.fillStyle = '#efe4c8'; x.textAlign = 'center'; x.textBaseline = 'middle'
    x.font = '900 112px Anton, Impact, sans-serif'; x.fillText('UNIONS', 384, 82, 700)
    x.font = '900 120px Anton, Impact, sans-serif'; x.fillText('FOR DANIEL', 384, 880, 720)
    x.fillStyle = '#d6a72a'; x.font = '700 34px Georgia, serif'; x.fillText('SOLIDARITY · SAINT PONCE LOCAL 1964', 384, 965, 720)
    for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(80,60,30,${Math.random() * 0.12})`; x.fillRect(Math.random() * 768, Math.random() * 1024, 2 + Math.random() * 4, 2) } // aged paper
    x.strokeStyle = 'rgba(0,0,0,0.25)'; x.lineWidth = 6; x.strokeRect(3, 3, 762, 1018)
const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.95, 2.6), new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 }))
    const rc = new THREE.Raycaster(new V3(-80 * U, GY + 1.9, 373.05 * U), new V3(-1, 0, 0)), h = rc.intersectObject(world.scene, true)[0]
    if (h) { const n = h.face.normal.clone().transformDirection(h.object.matrixWorld); n.y = 0; n.normalize(); m.position.copy(h.point).addScaledVector(n, 0.03); m.rotation.y = Math.atan2(n.x, n.z); m.rotation.z = 0.015; scene.add(m) } }

  // --- VOTE GEORGE yard signs on the town sign's lawn; one leans out over the boulevard where Brad cuts the corner.
  { const c = document.createElement('canvas'); c.width = 512; c.height = 320; const x = c.getContext('2d')
    x.fillStyle = '#1b3a8a'; x.fillRect(0, 0, 512, 320); x.fillStyle = '#c8202e'; x.fillRect(0, 250, 512, 70); x.fillStyle = '#fff'; x.fillRect(0, 242, 512, 8)
    x.textAlign = 'center'; x.font = '900 70px Anton, Impact, sans-serif'; x.fillText('VOTE', 256, 92); x.font = '900 124px Anton, Impact, sans-serif'; x.fillText('GEORGE', 256, 218, 480)
    for (const sx of [40, 472]) { x.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 11 : 26, a = -Math.PI / 2 + k * Math.PI / 5; x.lineTo(sx + Math.cos(a) * r, 64 + Math.sin(a) * r) } x.fill() }
    x.font = '700 30px sans-serif'; x.fillText('FOR SAINT PONCE', 256, 296)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
    const face = new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 }), wireM = new THREE.MeshStandardMaterial({ color: '#7d8186', metalness: 0.6, roughness: 0.4 })
    for (const [sx, sz, yaw, lawn] of [[-86.3, 396.6, 1.2, 1], [-86.0, 398.4, 1.45, 1], [-86.2, 400.3, 1.3, 1], [-86.9, 402.6, 1.0, 1], [-85.62, 402.9, 1.25, 1]]) {
      const m = new THREE.Group(); for (const s2 of [1, -1]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.56), face); f.position.set(0, 0.17, s2 * 0.012); if (s2 < 0) f.rotation.y = Math.PI; f.castShadow = true; m.add(f) }
      for (const lx of [-0.3, 0.3]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.9, 4), wireM); w.position.set(lx, -0.1, 0); m.add(w) }
      scene.add(m); const X = sx * U, Z = sz * U
      crates.push({ m, vote: true, half: new V3(0.45, 0.46, 0.05), r: 0.45, home: { pos: new V3(X, surfaceAt(X, Z) + (lawn ? 0.21 : 0) + 0.45, Z), yaw }, vel: new V3(), spin: new V3(), awake: false })
    } }

  // --- A sign on the sidewalk under the Christy billboard: knock it flat if you want.
  { const c = document.createElement('canvas'); c.width = 256; c.height = 320; const x = c.getContext('2d'); x.fillStyle = '#f6f6f2'; x.fillRect(0, 0, 256, 320); x.strokeStyle = '#111'; x.lineWidth = 10; x.strokeRect(8, 8, 240, 304)
    x.fillStyle = '#111'; x.textAlign = 'center'; x.font = '900 44px Anton, Impact, sans-serif'; ['DO NOT', 'LOOK AT', 'SIGN WHILE', 'DRIVING'].forEach((t, i) => x.fillText(t, 128, 78 + i * 64, 220))
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
    const z = 380.2, sx = -100.5 + (z - 355.3) * 0.2275 - 0.47, X = sx * U, Z = z * U, m = new THREE.Group(); scene.add(m)
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.5, 6), new THREE.MeshStandardMaterial({ color: '#8d9194', metalness: 0.5, roughness: 0.5 })); m.add(post)
    for (const s2 of [1, -1]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.78), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 })); f.position.set(0, 0.85, s2 * 0.03); if (s2 < 0) f.rotation.y = Math.PI; f.castShadow = true; m.add(f) }
    crates.push({ m, half: new V3(0.06, 1.25, 0.06), r: 0.25, lie: 0.43, home: { pos: new V3(X, surfaceAt(X, Z) + 1.25, Z), yaw: -0.22 }, vel: new V3(), spin: new V3(), awake: false, rod: true, pivotLow: true }) }

  // --- The trashy back of publick: receiving dock, dumpsters, pallets, bags, a dead cart, drips down the wall.
  { const tx = -0.81, tz = -0.587, nx = -0.587, nz = 0.81, wallYaw = Math.atan2(nx, nz), alongYaw = Math.atan2(-tz, tx)
    const W = (sA, d0) => { const d = d0 - 0.0175 * sA; return [-394.6 + tx * sA + nx * d, 1432.5 + tz * sA + nz * d] } // the wall isn't quite square to the lot
    const plain = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t }
    const onWall = (tex, sA, y, w, h, off = 0.04) => { const [x, z] = W(sA, off), m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.9 })); m.position.set(x, GY + y, z); m.rotation.y = wallYaw; scene.add(m); return m }
    const dock = plain(256, 256, (x, w, h) => { x.fillStyle = '#3c4043'; x.fillRect(0, 0, w, h); x.fillStyle = '#8f9496'; x.fillRect(12, 12, w - 24, h - 12); for (let i = 14; i < h; i += 12) { x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(12, i, w - 24, 3); x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(12, i + 3, w - 24, 2) }
      for (let i = 0; i < 14; i++) { x.fillStyle = `rgba(70,45,25,${0.1 + Math.random() * 0.2})`; x.fillRect(12 + Math.random() * 220, 20 + Math.random() * 60, 3 + Math.random() * 5, 60 + Math.random() * 150) }
      for (let i = 0; i < w; i += 32) { x.fillStyle = i / 32 % 2 ? '#1c1c1c' : '#e0b21c'; x.fillRect(i, h - 18, 32, 18) } })
    onWall(dock, -4, 1.95, 3.6, 3.6); onWall(dock, 1, 1.95, 3.6, 3.6)
    const stencil = plain(1024, 128, (x, w, h) => { x.fillStyle = '#2b2b2b'; x.font = '900 64px Anton, Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('RECEIVING · NO TURKEYS LEFT', w / 2, h / 2, w - 20) })
    onWall(stencil, -1.5, 4.5, 7.5, 1.4)
    const door = plain(128, 256, (x, w, h) => { x.fillStyle = '#5b5346'; x.fillRect(0, 0, w, h); x.fillStyle = '#b79f6c'; x.fillRect(8, 8, w - 16, h - 8); x.fillStyle = '#2a2a2a'; x.fillRect(w - 34, 130, 14, 8); x.fillStyle = '#c22'; x.fillRect(26, 50, 76, 40); x.fillStyle = '#fff'; x.font = '700 15px sans-serif'; x.textAlign = 'center'; x.fillText('EMPLOYEES', 64, 67); x.fillText('ONLY', 64, 84)
      for (let i = 0; i < 30; i++) { x.fillStyle = 'rgba(40,30,20,.25)'; x.fillRect(8 + Math.random() * 110, 200 + Math.random() * 50, 10, 3) } })
    onWall(door, 7.5, 1.05, 1.05, 2.1)
    const drips = plain(256, 256, (x, w, h) => { for (let i = 0; i < 14; i++) { const dx = Math.random() * w, l = 60 + Math.random() * 190, g = x.createLinearGradient(0, 0, 0, l); const k = Math.random() > 0.5 ? '60,48,30' : '40,52,38'; g.addColorStop(0, `rgba(${k},.26)`); g.addColorStop(1, `rgba(${k},0)`); x.fillStyle = g; x.fillRect(dx, 0, 3 + Math.random() * 9, l) } })
    for (const sA of [-13, -8, 4.5, 11, 15]) onWall(drips, sA, 3.4, 5, 6.6, 0.03)
    const tag = plain(512, 128, (x, w, h) => { x.font = 'italic 900 70px "Comic Sans MS", "Marker Felt", cursive'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'; x.strokeStyle = '#1d1030'; x.lineWidth = 12; x.strokeText('BRAD WUZ HERE', w / 2, h / 2); x.fillStyle = '#b05cf0'; x.fillText('BRAD WUZ HERE', w / 2, h / 2) })
    onWall(tag, 13.5, 1.45, 4.2, 1.05, 2.7).rotation.z = 0.06
    // Wall furniture: a flood light, an electrical cabinet with conduit, a rusty condenser.
    const steel = new THREE.MeshStandardMaterial({ color: '#8b9094', roughness: 0.6, metalness: 0.4 }), dark = new THREE.MeshStandardMaterial({ color: '#2a2c2e', roughness: 0.7 }), rust = new THREE.MeshStandardMaterial({ color: '#7d6a58', roughness: 0.95 })
    const put = (m, sA, d, y, yaw = alongYaw) => { const [x, z] = W(sA, d); m.position.set(x, GY + y, z); m.rotation.y = yaw; m.castShadow = true; scene.add(m); return m }
    put(new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.3, 0.3), steel), 10, 0.18, 1.5); put(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 4.5, 6), steel), 10.2, 0.08, 4.3); put(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 4.5, 6), steel), 9.85, 0.08, 4.3)
    put(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.3), dark), -1.5, 0.2, 5.6); put(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.3), dark), 12, 0.2, 5.2)
    put(new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 1.0), rust), -11, 0.7, 0.5); put(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.06, 14), dark), -11, 0.7, 1.02)
    boxes.push({ c: new V2(...W(-11, 0.7)), a: new V2(tx, tz), hx: 0.6, hz: 0.55, low: true })
    // Dock bumpers and yellow bollards guarding the doors.
    const yel = new THREE.MeshStandardMaterial({ color: '#d9b21f', roughness: 0.7 })
    for (const sA of [-6.2, -1.5, 3.2]) { put(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.1, 10), yel), sA, 1.0, 0.55); circles.push([...W(sA, 1.0), 0.2]) }
    for (const sA of [-5.3, -2.7, -0.3, 2.3]) put(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.14), dark), sA, 0.09, 0.9)
    // Dumpsters: one shut, one overflowing.
    const green = new THREE.MeshStandardMaterial({ color: '#2f5a3c', roughness: 0.8 }), lidM = new THREE.MeshStandardMaterial({ color: '#1d1f20', roughness: 0.6 }), bagM = new THREE.MeshStandardMaterial({ color: '#17181a', roughness: 0.45 }), bagW = new THREE.MeshStandardMaterial({ color: '#d9d9d2', roughness: 0.5 })
    const label = plain(256, 96, (x, w, h) => { x.fillStyle = '#e9e6d6'; x.fillRect(0, 0, w, h); x.fillStyle = '#2f5a3c'; x.font = '900 34px Anton, Impact, sans-serif'; x.textAlign = 'center'; x.fillText('TRASH PANDA', w / 2, 40); x.font = '700 20px sans-serif'; x.fillText('DISPOSAL · SAINT PONCE', w / 2, 72) })
    const dumpster = (sA, d, open) => { const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.25, 1.35), green); body.position.y = 0.72; body.castShadow = true; g.add(body)
      for (const sx of [-1.1, 1.1]) { const pk = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.9), green); pk.position.set(sx, 0.85, 0); g.add(pk) }
      const lb = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.45), new THREE.MeshStandardMaterial({ map: label, roughness: 0.9 })); lb.position.set(0, 0.8, 0.68); g.add(lb)
      for (const sx of [-0.53, 0.53]) { const lid = new THREE.Mesh(new THREE.BoxGeometry(1.03, 0.05, 1.4), lidM); lid.position.set(sx, 1.37, 0); if (open && sx > 0) { lid.rotation.x = -1.9; lid.position.set(sx, 1.95, -0.75) } lid.castShadow = true; g.add(lid) }
      if (open) for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(blob, i % 3 ? bagM : bagW); b.scale.set(0.34, 0.28, 0.32); b.position.set(0.15 + (i % 3) * 0.3, 1.38 + (i > 2 ? 0.25 : 0), -0.3 + (i % 2) * 0.45); g.add(b) }
      for (const [wx, wz] of [[-0.9, -0.55], [0.9, -0.55], [-0.9, 0.55], [0.9, 0.55]]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 8), dark); wh.rotation.z = Math.PI / 2; wh.position.set(wx, 0.09, wz); g.add(wh) }
      g.traverse((o) => { if (o.isMesh) o.position.y -= 0.72 }); scene.add(g); const [hx0, hz0] = W(sA, d)
      crates.push({ m: g, half: new V3(1.05, 0.72, 0.68), r: 1.1, heavy: true, home: { pos: new V3(hx0, GY + 0.72, hz0), yaw: wallYaw + (open ? 0.12 : -0.05) }, vel: new V3(), spin: new V3(), awake: false }) }
    dumpster(-9, 1.1, false); dumpster(-14.2, 1.3, true)
    // Loose junk you can plough through: pallets, bags, flattened cartons, milk crates and a cart missing a wheel.
    const wood = new THREE.MeshStandardMaterial({ color: '#a98a5c', roughness: 0.95 }), card = new THREE.MeshStandardMaterial({ color: '#b08a56', roughness: 1 }), milk = [new THREE.MeshStandardMaterial({ color: '#2a5fb0', roughness: 0.7 }), new THREE.MeshStandardMaterial({ color: '#c0392b', roughness: 0.7 })]
    const junk = (m, sA, d, y, half, yaw = 0) => { const [x, z] = W(sA, d); m.traverse((o) => { if (o.isMesh) o.castShadow = true }); scene.add(m); crates.push({ m, half, r: Math.max(half.x, half.z), home: { pos: new V3(x, GY + y, z), yaw: alongYaw + yaw }, vel: new V3(), spin: new V3(), awake: false }) }
    const pallet = () => { const g = new THREE.Group(); for (const dz of [-0.45, -0.15, 0.15, 0.45]) { const t = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.025, 0.2), wood); t.position.set(0, 0.06, dz); g.add(t) } for (const dx of [-0.55, 0, 0.55]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 1.0), wood); r.position.x = dx; g.add(r) } return g }
    for (let i = 0; i < 6; i++) junk(pallet(), 5.3 + (i > 3 ? 1.5 : 0), 1.0, 0.075 + (i > 3 ? i - 4 : i) * 0.15, new V3(0.6, 0.075, 0.5), Math.sin(i * 2.1) * 0.12)
    { const lean = pallet(); lean.rotation.x = 1.25; put(lean, 8.6, 0.35, 0.5) }
    for (let i = 0; i < 7; i++) { const b = new THREE.Mesh(blob, i % 4 === 3 ? bagW : bagM); b.scale.set(0.36, 0.3, 0.34); junk(b, -16.2 - (i % 3) * 0.7, 0.6 + Math.floor(i / 3) * 0.7, 0.3, new V3(0.34, 0.28, 0.34), i) }
    for (let i = 0; i < 5; i++) junk(new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 0.8), card), -12, 2.6, 0.03 + i * 0.06, new V3(0.5, 0.03, 0.4), i * 0.3)
    for (let i = 0; i < 6; i++) junk(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.34), milk[i % 2]), 3.6 + (i % 2) * 0.38, 0.4, 0.15 + Math.floor(i / 2) * 0.3, new V3(0.17, 0.15, 0.17), 0)
    const cart = () => { const g = new THREE.Group(), wire = new THREE.MeshStandardMaterial({ color: '#b9bec2', roughness: 0.4, metalness: 0.6, transparent: true, opacity: 0.55, side: THREE.DoubleSide }); const bk = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 0.9, 3, 3, 4), new THREE.MeshStandardMaterial({ color: '#c9ced2', wireframe: true })); bk.position.y = 0.2; g.add(bk)
      const fl = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.02, 0.9), wire); g.add(fl); const hd = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.58, 6), new THREE.MeshStandardMaterial({ color: '#3f8f3a' })); hd.rotation.z = Math.PI / 2; hd.position.set(0, 0.48, -0.5); g.add(hd)
      for (const [wx, wz] of [[-0.24, -0.4], [0.24, -0.4], [-0.24, 0.4]]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 8), dark); wh.rotation.z = Math.PI / 2; wh.position.set(wx, -0.44, wz); g.add(wh); const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 4), steel); lg.position.set(wx, -0.22, wz); g.add(lg) } return g }
    junk(cart(), -6.5, 3.4, 0.5, new V3(0.3, 0.5, 0.48), 0.7); junk(cart(), 9.5, 3.6, 0.5, new V3(0.3, 0.5, 0.48), -0.4)
    // The NE-wing clutter: a storage container against the wall, tagged, and bread trays stacked taller than they should be.
    { const tan = new THREE.MeshStandardMaterial({ color: '#cfc6a4', roughness: 0.85 }), g = new THREE.Group(), body = new THREE.Mesh(new THREE.BoxGeometry(6.1, 2.6, 2.44), tan); body.position.y = 1.3; g.add(body)
      for (let i = -14; i <= 14; i++) { const rib = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.4, 2.5), tan); rib.position.set(i * 0.21, 1.3, 0); g.add(rib) }
      g.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true }); put(g, 13.5, 1.4, 0); boxes.push({ c: new V2(...W(13.5, 1.4)), a: new V2(tx, tz), hx: 3.1, hz: 1.3 }) }
    const tray = new THREE.MeshStandardMaterial({ color: '#a8342a', roughness: 0.8 })
    for (let i = 0; i < 10; i++) junk(new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.16, 0.56), tray), -3.2 + (i > 4 ? 0.75 : 0), 2.3, 0.08 + (i % 5) * 0.16, new V3(0.33, 0.08, 0.28), Math.sin(i) * 0.06)
    // What leaked out of the dumpsters.
    const spill = decalTex(128, 128, (x, w, h) => { for (let i = 0; i < 9; i++) { const g = x.createRadialGradient(40 + Math.random() * 50, 40 + Math.random() * 50, 2, 64, 64, 30 + Math.random() * 30); g.addColorStop(0, 'rgba(20,18,14,.55)'); g.addColorStop(1, 'rgba(20,18,14,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h) } }, 0)
    for (const [sA, d, sz] of [[-9, 2.6, 4], [-14.5, 2.8, 5], [-1.5, 3, 6], [6, 2.2, 3.5]]) decal(spill, ...W(sA, d), sz, sz * 0.7, alongYaw)
  }

  // Light poles stand on concrete footings painted safety yellow, scuffed by a thousand bumpers.
  const foot = new THREE.MeshStandardMaterial({ color: '#d6c79c', roughness: 0.9 }), cap = new THREE.MeshStandardMaterial({ color: '#a9a595', roughness: 0.9 })
  // Twin-head light poles on those footings: hit one hard and it comes down, the lamp glass shatters, and the Galaxie pays for it.
  const poleM = new THREE.MeshStandardMaterial({ color: '#3e4446', roughness: 0.6, metalness: 0.4 }), headM = new THREE.MeshStandardMaterial({ color: '#3a4042', roughness: 0.5, metalness: 0.4 })
  const PH = 2.5 * U, poleGeo = new THREE.CylinderGeometry(0.03 * U, 0.045 * U, PH, 10), headGeo = new THREE.BoxGeometry(0.32 * U, 0.05 * U, 0.14 * U), lensGeo = new THREE.PlaneGeometry(0.28 * U, 0.1 * U)
  for (const [x, z] of DATA.poles) { const m = new THREE.Group(), p = new THREE.Mesh(poleGeo, poleM); p.castShadow = true; m.add(p)
    const lensM = new THREE.MeshBasicMaterial({ color: '#fff3d6' }), lenses = []
    for (const side of [-1, 1]) { const h = new THREE.Mesh(headGeo, headM); h.position.set(side * 0.2 * U, PH / 2 - 0.05 * U, 0); h.castShadow = true; m.add(h)
      const l = new THREE.Mesh(lensGeo, lensM); l.rotation.x = Math.PI / 2; l.position.set(side * 0.2 * U, PH / 2 - 0.08 * U, 0); m.add(l); lenses.push(l) }
    scene.add(m); const y0 = surfaceAt(x, z) + 0.84
    crates.push({ m, half: new V3(0.18, PH / 2, 0.18), r: 0.32, lie: 0.2, home: { pos: new V3(x, y0 + PH / 2, z), yaw: 0 }, vel: new V3(), spin: new V3(), awake: false, rod: true, pivotLow: true, lamp: true, lenses }) }
  for (const [x, z] of DATA.poles) { const y = surfaceAt(x, z), f = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.33, 0.8, 14), foot); f.position.set(x, y + 0.4, z); f.castShadow = f.receiveShadow = true; scene.add(f); circles.push([x, z, 0.1])
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.08, 14), cap); c.position.set(x, y + 0.84, z); scene.add(c) }
}
for (const c of crates) if (c.home) { c.gy = surfaceAt(c.home.pos.x, c.home.pos.z); c.home.pos.y += c.gy - GY }
// Anything set down off the lot's asphalt (on grass, a sidewalk, the street) sits on what's actually under it, not floating.
for (const c of crates) if (c.home && !c.home.grounded) { c.home.grounded = true; const d = surfaceAt(c.home.pos.x, c.home.pos.z) - GY; if (Math.abs(d) > 0.02 && Math.abs(d) < 0.4) c.home.pos.y += d }
function resetCrates() { for (const k of balloons) { k.popped = false; k.b.visible = true; k.tether.visible = true }
 for (const c of crates) c.topple = null; if (pylonProp) { pylonProp.faceMat.map = pylonProp.lit; pylonProp.faceMat.emissiveMap = pylonProp.lit; pylonProp.faceMat.emissiveIntensity = 0.25; pylonProp.faceMat.needsUpdate = true; pylonProp.sparkT = 0 }
  for (const c of crates) { if (c.donut || c.fork || c.bird) { c.m.visible = false; c.awake = false; continue } if (c.forks) c.forks.visible = true; if (c.lenses) for (const l of c.lenses) l.visible = true; if (c.food) for (const f of c.food) f.visible = true; c.spilled = false; c.fell = false; c.m.position.copy(c.home.pos); c.m.quaternion.setFromEuler(_e.set(0, c.home.yaw, c.home.roll || 0, 'YXZ')); c.vel.set(0, 0, 0); c.spin.set(0, 0, 0); c.awake = false } }
resetCrates()
const nxGuess = (dx, dz) => { const l = Math.hypot(dx, dz) || 1; return { x: dx / l, z: dz / l } }
function pushCrates(car) {
  const fx = Math.sin(car.heading), fz = Math.cos(car.heading), speed = Math.hypot(car.vel.x, car.vel.y)
  for (const c of crates) {
    if (!c.m.visible) continue
    const p = c.m.position, dx = p.x - car.pos.x, dz = p.z - car.pos.y
    if (dx * dx + dz * dz > (c.pylon ? 36 : 16) || (!c.lamp && p.y - c.half.y > (c.gy ?? GY) + 1.0)) continue // (a light pole stands on its footing, so its base is high)
    const along = dx * fx + dz * fz, across = -dx * fz + dz * fx
    if (c.pylon && c.spilled) continue // once it's falling, let it fall
    if (c.topple) { // already down: a hit just shoves it along the ground
      if (Math.abs(along) < 2.75 + c.r && Math.abs(across) < 1.2 + c.r && c.topple.done) { c.topple.sv.set(car.vel.x * 0.8, 0, car.vel.y * 0.8); c.topple.spinY = (Math.random() - 0.5) * 3 }
      continue }
    const pa = 2.75 + c.r * 0.8 - Math.abs(along), pc = 1.05 + c.r * 0.8 - Math.abs(across)
    if (pa <= 0 || pc <= 0) continue
    if ((c.rod || c.sign) && !c.pylon) { // tall, thin things tip over away from the car and lie down
      const d = new V3(car.vel.x, 0, car.vel.y); if (d.lengthSq() < 0.01) d.set(nxGuess(dx, dz).x, 0, nxGuess(dx, dz).z); d.normalize()
      const edge = c.lie ?? c.half.x
      c.topple = { th: 0.05, w: 1.0 + Math.min(2.5, speed * 0.12), d, axis: new V3(d.z, 0, -d.x), pivot: new V3(p.x, c.gy ?? GY, p.z).addScaledVector(d, edge + 0.15), edge, q0: c.m.quaternion.clone(), bounced: false, sv: new V3(car.vel.x * 0.45, 0, car.vel.y * 0.45), spinY: (Math.random() - 0.5) * 1.5 }
      if (speed > 2) audio.clang(Math.min(0.7, 0.25 + speed / 30))
      if (c.lamp && !c.spilled) { c.spilled = true; for (const l of c.lenses) l.visible = false; const top = c.m.position.clone().addScaledVector(c.topple.d, c.half.y); for (let i = 0; i < 3; i++) burst(new V2(top.x + c.topple.d.x * c.half.y * 0.9 + (Math.random() - 0.5) * 2, top.z + c.topple.d.z * c.half.y * 0.9 + (Math.random() - 0.5) * 2), 6, true, false, '#e6f2ff'); setTimeout(() => audio.crash(0.9), 650)
        if (car === P) { game.armor = Math.max(1, game.armor - 14); hurt(5); flash('POLE DOWN!'); S.hit = Math.max(S.hit, 0.8); car.vel.multiplyScalar(0.35); $('armorBar').classList.remove('flashbar'); void $('armorBar').offsetWidth; $('armorBar').classList.add('flashbar') } else car.vel.multiplyScalar(0.5) }
      if (c.sign && !c.spilled && car === P) { c.spilled = true; game.armor = Math.max(1, game.armor - 3); hurt(1); flash('SIGN DOWN!'); $('armorBar').classList.remove('flashbar'); void $('armorBar').offsetWidth; $('armorBar').classList.add('flashbar') }
      car.vel.multiplyScalar(0.97); continue
    }
    // Knock it clear of the car, carrying the car's speed plus a hop and a tumble.
    let nx, nz
    if (pa < pc) { nx = Math.sign(along) * fx; nz = Math.sign(along) * fz; p.x += nx * pa; p.z += nz * pa }
    else { nx = -Math.sign(across) * fz; nz = Math.sign(across) * fx; p.x += nx * pc; p.z += nz * pc }
    const kick = 1.5 + speed * 0.35
    c.vel.set(car.vel.x * 0.85 + nx * kick, Math.min(5.5, 1.2 + speed * 0.28) * (0.7 + Math.random() * 0.5), car.vel.y * 0.85 + nz * kick)
    c.spin.set((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 7, (Math.random() - 0.5) * 9)
    if (c.heavy && c.m.position.distanceTo(c.home.pos) > 1.3) { c.vel.set(0, 0, 0); c.spin.set(0, 0, 0); car.vel.multiplyScalar(-0.25); continue } // on its leash: it only shoves so far, then it's a wall
    if (c.parked && car === P && (game.parkHitT ?? 0) <= 0 && speed > 3) { game.parkHitT = 0.6; game.armor = Math.max(1, game.armor - Math.min(9, 1.5 + speed * 0.45)); hurt(2); flash('DENT!'); S.hit = Math.max(S.hit, 0.6); audio.crash(Math.min(1, speed / 12)); $('armorBar').classList.remove('flashbar'); void $('armorBar').offsetWidth; $('armorBar').classList.add('flashbar') }
    if (c.heavy) { c.vel.multiplyScalar(c.parked ? 0.06 : 0.1); c.vel.y = 0; p.x = c.m.position.x; p.z = c.m.position.z; c.spin.set(0, (Math.random() - 0.5) * 1.2, 0); car.vel.multiplyScalar(0.55) } // a loaded dumpster only scoots and swings a little
    if (!c.awake && speed > 2 && game.t - (c.lastHit ?? -9) > 0.25) { c.lastHit = game.t; c.can ? audio.clang(Math.min(1, 0.4 + speed / 18)) : audio.thud(Math.min(1, 0.35 + speed / 20)) }
    if (c.vote && car === R && !game.georgeDown && game.state !== 'cutscene') { game.georgeDown = true; $('bubble2').textContent = 'HIT HIM HARDER! HE JUST RAN OVER THE SIGN FOR GEORGE — NOOO, VOTE GEORGE!'; $('bubble2').classList.add('show'); game.b2T = 3.6 }
    if (c.can && !c.spilled) { c.spilled = true; spillDonuts(c) }
    if (c.food && !c.spilled) { c.spilled = true; for (const f of c.food) { const wp = f.getWorldPosition(new V3()), q = f.getWorldQuaternion(new THREE.Quaternion()); f.visible = false
      const m = f.clone(); m.visible = true; m.position.copy(wp).y += 0.2; m.quaternion.copy(q); scene.add(m); const bb = new THREE.Box3().setFromObject(m), hs = bb.getSize(new V3()).multiplyScalar(0.5)
      const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 3.5
      crates.push({ m, half: hs, r: Math.max(hs.x, hs.z), home: null, donut: true, gy: c.gy, vel: new V3(car.vel.x * 0.5 + Math.cos(a) * sp, 2 + Math.random() * 2.5, car.vel.y * 0.5 + Math.sin(a) * sp), spin: new V3((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 12), awake: true }) } }
    if (c.forks && !c.spilled) { c.spilled = true; spillForks(c) }
    if (c.turkeyBin && !c.spilled) { c.spilled = true; spillTurkeys(c) }
    if (c.pylon && !c.spilled) { c.spilled = true
      // Topple away from the car rather than fly: a slow shove and a tip about the horizontal axis.
      // It falls flat on its face: pick the face away from the car, then pivot over the base's edge.
      const lxv = new V3(1, 0, 0).applyQuaternion(c.m.quaternion); lxv.y = 0; lxv.normalize()
      const d = lxv.clone().multiplyScalar(Math.sign(car.vel.x * lxv.x + car.vel.y * lxv.z) || 1)
      c.topple = { th: 0.06, w: 0.5 + Math.min(1.2, Math.hypot(car.vel.x, car.vel.y) * 0.06), d, axis: new V3(d.z, 0, -d.x), pivot: new V3(c.home.pos.x, c.gy ?? GY, c.home.pos.z).addScaledVector(d, c.half.x), q0: c.m.quaternion.clone(), bounced: false }
      c.vel.set(0, 0, 0); c.spin.set(0, 0, 0)
      c.faceMat.map = c.dead; c.faceMat.emissiveMap = c.dead; c.faceMat.emissiveIntensity = 0.05; c.faceMat.needsUpdate = true; c.sparkT = 1.6
      if (car === P) { game.armor = Math.max(1, game.armor - 4); hurt(1); audio.clang(0.8); flash('PRICES DOWN!')
        $('bubble2').textContent = 'THAT’S NOT EVEN THE FIRST TIME THAT SIGN HAS BEEN KNOCKED OVER.'; $('bubble2').classList.add('show'); game.b2T = 3.8 } }
    if (c.sign && !c.spilled && car === P) { c.spilled = true; game.armor = Math.max(1, game.armor - 3); hurt(1); flash('SIGN DOWN!'); audio.clang(0.5); $('armorBar').classList.remove('flashbar'); void $('armorBar').offsetWidth; $('armorBar').classList.add('flashbar') }
    c.awake = true
    car.vel.multiplyScalar(0.985)
  }
}
function updateCrates(dt) {
  updateBalloons(clock.elapsedTime)
  if (pylonProp && pylonProp.sparkT > 0) { pylonProp.sparkT -= dt; if (Math.random() < 0.35) { const p = pylonProp.m.position; burst(new V2(p.x + (Math.random() - 0.5) * 2, p.z + (Math.random() - 0.5) * 2), 2, true, false, Math.random() < 0.5 ? '#ffe27a' : '#9fd8ff') } }
  pushCrates(P); pushCrates(R)
  for (const c of crates) {
    if (c.topple) { const T = c.topple, H = c.half.y * 2
      if (!T.done) {
        T.w += (3 * 9.8 / (2 * H)) * Math.sin(T.th) * dt; T.th += T.w * dt
        if (T.th >= Math.PI / 2) { T.th = Math.PI / 2
          if (!T.bounced && T.w > 0.8) { T.bounced = true; T.w = -T.w * (c.pylon ? 0.18 : 0.25); if (c.pylon) { S.hit = Math.max(S.hit, 0.5); audio.crash(0.6) } else audio.thud(0.3); if (c.pylon) for (let i = 0; i < 6; i++) burst(new V2(c.m.position.x + (Math.random() - 0.5) * 4, c.m.position.z + (Math.random() - 0.5) * 4), 2, false, false, '#9a9a90') }
          else if (T.bounced && T.w >= 0) { T.w = 0; T.done = true } } }
      if (T.sv) { T.pivot.addScaledVector(T.sv, dt); T.sv.multiplyScalar(Math.exp(-dt * (T.done ? 4 : 1.5))); if (T.done && T.spinY) { T.yaw = (T.yaw ?? 0) + T.spinY * dt; T.spinY *= Math.exp(-dt * 4) } }
      const q = new THREE.Quaternion().setFromAxisAngle(T.axis, T.th)
      if (T.yaw) q.premultiply(new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), T.yaw))
      c.m.quaternion.copy(q).multiply(T.q0)
      const v0 = T.d.clone().multiplyScalar(-(T.edge ?? c.half.x)).add(new V3(0, c.half.y, 0)).applyQuaternion(q)
      c.m.position.copy(T.pivot).add(v0); c.awake = false; continue }
    if (!c.awake) continue
    const p = c.m.position
    c.vel.y -= 9.8 * dt; p.addScaledVector(c.vel, dt)
    const w = c.spin.length(); if (w > 1e-4) { _q.setFromAxisAngle(_v.copy(c.spin).divideScalar(w), w * dt); c.m.quaternion.premultiply(_q) }
    // Buildings and walls stop them (the same footprints the cars use).
    for (const o of boxes) {
      const dx = p.x - o.c.x, dz = p.z - o.c.y; if (Math.abs(dx) > o.hx + o.hz + 2 || Math.abs(dz) > o.hx + o.hz + 2) continue
      const u = dx * o.a.x + dz * o.a.y, v = -dx * o.a.y + dz * o.a.x, pu = o.hx + c.r * 0.7 - Math.abs(u), pv = o.hz + c.r * 0.7 - Math.abs(v)
      if (pu <= 0 || pv <= 0) continue
      let nx, nz, pen
      if (pu < pv) { nx = Math.sign(u) * o.a.x; nz = Math.sign(u) * o.a.y; pen = pu } else { nx = -Math.sign(v) * o.a.y; nz = Math.sign(v) * o.a.x; pen = pv }
      p.x += nx * pen; p.z += nz * pen
      const vn = c.vel.x * nx + c.vel.z * nz; if (vn < 0) { c.vel.x -= 1.4 * vn * nx; c.vel.z -= 1.4 * vn * nz }
    }
    // The ground: bounce a little, slide to a stop, and settle back flat on a face.
    // Round things (barrels, cans) can end up on their sides: rest on whichever way they fell.
    const up = _v.set(0, 1, 0).applyQuaternion(c.m.quaternion), uy = Math.abs(up.y)
    const rolls = c.barrel || c.can || c.fork || c.sign || c.rod, lying = rolls && (uy < 0.6 || c.fork || c.sign || (c.rod && uy < 0.85))
    const floor = (c.gy ?? GY) + (rolls ? uy * c.half.y + Math.sqrt(1 - uy * uy) * c.half.x : c.half.y)
    if (p.y < floor) {
      p.y = floor; if (c.vel.y < 0) c.vel.y *= -0.25
      if (c.pylon && c.spilled && !c.fell && uy < 0.25) { c.fell = true; c.spin.set(0, 0, 0); c.vel.multiplyScalar(0.3) }
      const tipping = c.pylon && c.spilled && !c.fell // a toppling pylon keeps falling until it's down, then stays down
      const fr = Math.exp(-6 * dt); c.vel.x *= fr; c.vel.z *= fr; if (!tipping) c.spin.multiplyScalar(Math.exp(-5 * dt))
      if (tipping) { c.spin.multiplyScalar(1 + dt * 2.5) } else {
      if (lying || c.fork || c.sign) { const hz = new V3(up.x || 0.01, 0, up.z).normalize(); _q.setFromUnitVectors(new V3(0, 1, 0), hz) }
      else { _e.setFromQuaternion(c.m.quaternion, 'YXZ'); _q.setFromEuler(_e.set(0, _e.y, 0, 'YXZ')) }
      c.m.quaternion.slerp(_q, 1 - Math.exp(-6 * dt)) }
      if (c.vel.lengthSq() < 0.01 && c.spin.lengthSq() < 0.02) { c.vel.set(0, 0, 0); c.spin.set(0, 0, 0); c.m.quaternion.copy(_q); c.awake = false }
    }
  }
  // Boxes shove each other apart (as rounded blocks) and wake their neighbors.
  for (let i = 0; i < crates.length; i++) for (let j = i + 1; j < crates.length; j++) {
    const a = crates[i], b = crates[j]; if ((!a.awake && !b.awake) || !a.m.visible || !b.m.visible) continue
    const pa = a.m.position, pb = b.m.position, d = _v.subVectors(pb, pa), dist = d.length(), min = (a.r + b.r) * 0.85
    if (dist >= min || dist < 1e-5) continue
    d.divideScalar(dist); const push = (min - dist) / 2
    pa.addScaledVector(d, -push); pb.addScaledVector(d, push)
    const rel = (b.vel.x - a.vel.x) * d.x + (b.vel.y - a.vel.y) * d.y + (b.vel.z - a.vel.z) * d.z
    if (rel < 0) { a.vel.addScaledVector(d, rel * 0.6); b.vel.addScaledVector(d, -rel * 0.6) }
    a.awake = b.awake = true
  }
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
function ladyBubble(text, t) { $('bubble4').textContent = text; $('bubble4').classList.add('show'); game.b4T = t }
function chrisSays(text, t) { if (game.b2T > 0.2) { game.chrisNext = [text, t]; return } $('bubble3').textContent = text; $('bubble3').classList.add('show'); game.b3T = t } // he waits for Becky to finish
function freeDrive() {
  if (game.state === 'cutscene') { R.pos.copy(R_START.pos); R.heading = R_START.heading; R.vel.set(0, 0) }
  game.state = 'free'; camMode = 0; R.vel.set(0, 0)
  for (const id of ['bubble', 'bubble2', 'bubble3', 'banner']) $(id).classList.remove('show')
  for (const c of cans) { c.live = false; c.mesh.visible = false }
  $('mission').style.display = 'none'; $('sodaBtn').style.display = 'none'; flash('FREE DRIVE'); objective('<b>Free drive</b> — no turkey, no Brad. <b>R</b> to play again.')
}
// Two pumpkin spice lattes after her three sodas: hot, sticky, and they hurt him more.
const latteMat = [new THREE.MeshStandardMaterial({ color: '#f4efe4', roughness: 0.6 }), new THREE.MeshStandardMaterial({ color: '#e7742a', roughness: 0.5 }), new THREE.MeshStandardMaterial({ color: '#f4efe4', roughness: 0.6 })]
const lattes = Array.from({ length: 2 }, () => { const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.075, 0.24, 12), latteMat); const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.096, 0.086, 0.09, 12), new THREE.MeshStandardMaterial({ color: '#8a5a2b' })); mesh.add(sleeve); mesh.visible = false; mesh.castShadow = true; scene.add(mesh); return { mesh, vel: new V3(), live: false, latte: true } })
function throwSoda() {
  if (game.state !== 'chase' || ((!game.sodaReady || game.soda <= 0) && game.lattes <= 0)) return
  const useLatte = !game.sodaReady || game.soda <= 0
  const c = (useLatte ? lattes : sodas).find((c) => !c.live); if (!c) return
  const dist = R.pos.distanceTo(P.pos); if (dist > 32) { flash('TOO FAR!'); return }
  const T = THREE.MathUtils.clamp(dist / 22, 0.5, 1.2)
  const aim = R.pos.clone().addScaledVector(R.vel, T * 0.9).add(new V2((Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.6))
  const from = P.pos.clone().addScaledVector(new V2(Math.cos(P.heading), -Math.sin(P.heading)), -0.5), y0 = GY + 1.7, y1 = GY + 1.2
  c.mesh.position.set(from.x, y0, from.y); c.mesh.visible = true; c.live = true
  c.vel.set((aim.x - from.x) / T, (y1 - y0 + 0.5 * CAN_G * T * T) / T, (aim.y - from.y) / T)
  if (useLatte) { game.lattes--; if (game.lattes === 1) { $('bubble2').textContent = 'PUMPKIN SPICE TO THE FACE!'; $('bubble2').classList.add('show'); game.b2T = 1.8 } } else game.soda--
}
function updateSodas(dt) {
  if (game.b3T > 0) { game.b3T -= dt; if (game.b3T <= 0) $('bubble3').classList.remove('show') }
  if (game.b2T > 0) { game.b2T -= dt; if (game.b2T <= 0 && game.state !== 'cutscene') $('bubble2').classList.remove('show') }
  if (game.forkReply > 0 && (game.forkReply -= dt) <= 0) { $('bubble2').textContent = 'DON’T TAKE THOSE, OR THE FARMERS WILL BE MAD.'; $('bubble2').classList.add('show'); game.b2T = 3.4 }
  if (game.b4T > 0) { game.b4T -= dt; if (game.b4T <= 0) $('bubble4').classList.remove('show') }
  if (game.chrisNext && game.b2T <= 0.2) { const [tx, tt] = game.chrisNext; game.chrisNext = null; chrisSays(tx, tt) }
  for (const c of [...sodas, ...lattes]) {
    if (!c.live) continue
    c.vel.y -= CAN_G * dt; c.mesh.position.addScaledVector(c.vel, dt); c.mesh.rotation.x += dt * 10; c.mesh.rotation.z += dt * 6
    const p = c.mesh.position, rel = new V2(p.x - R.pos.x, p.z - R.pos.y), f = R.f
    if (c.vel.y < 0 && Math.abs(rel.dot(f)) < R.hl && Math.abs(rel.x * f.y - rel.y * f.x) < R.hw && p.y < GY + 2.0) {
      // Fizz: a good deal less than a ram.
      c.live = false; c.mesh.visible = false; burst(new V2(p.x, p.z), 7, true, false, c.latte ? '#e7742a' : '#bfe3ff'); audio.crash(0.25)
      if (game.state === 'chase') {
        game.health = Math.max(0, game.health - (c.latte ? 10 : 6)); say(c.latte ? 'AAH! PUMPKIN SPICE!' : 'HEY! THAT’S STICKY!', 1.4); chrisSays('GREAT THROW, HONEY!', 2)
        $('rivalBar').classList.remove('flashbar'); void $('rivalBar').offsetWidth; $('rivalBar').classList.add('flashbar')
        if (game.health <= 0) { game.state = 'claim'; say('OKAY, OKAY! TAKE THE BIRD!', 4); flash('WRECKED!'); objective('Now grab the <b>last turkey</b> at the publick door.'); rival.M.paint.color.set('#5b5f52') }
      }
    } else if (p.y < GY + 0.1) { c.live = false; c.mesh.visible = false; burst(new V2(p.x, p.z), 3, true, false, '#bfe3ff') }
  }
}

function update(dt) {
  game.t += dt; game.hitCool -= dt; game.parkHitT = (game.parkHitT ?? 0) - dt
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
  rideBeds(dt, live)
  // Ploughing through a bush or hedge drags the car a little; wading the flood drags it more.
  { const f = window.__flood; if (f && P.pos.x > f.x0 && P.pos.x < f.x1 && P.pos.y > f.z0 && P.pos.y < f.z1) { P.vel.multiplyScalar(Math.exp(-dt * 1.1)); if (P.vel.length() > 3 && Math.random() < 0.4) burst(new V2(P.pos.x, P.pos.y), 2, false, true, '#8a8466') } }
  for (const [bx, bz, br] of bushes) if (Math.abs(P.pos.x - bx) < br + 1.2 && Math.abs(P.pos.y - bz) < br + 1.2 && Math.hypot(P.pos.x - bx, P.pos.y - bz) < br + 1.0) { P.vel.multiplyScalar(Math.exp(-dt * 1.6)); break }
  // Through the drive-thru: the barista hands over two pumpkin spice lattes to throw.
  { const t = Math.atan2(0.968, -0.249), wx = (-93.25 + 6.5 * Math.cos(t) - 0.3 * Math.sin(t)) * U, wz = (364.09 - 6.5 * Math.sin(t) - 0.3 * Math.cos(t)) * U
    if (!game.gotLattes && (s === 'chase' || s === 'claim') && Math.hypot(P.pos.x - wx, P.pos.y - wz) < 3.2) {
      game.gotLattes = true; game.lattes = 2; flash('+2 PUMPKIN SPICE LATTES'); game.psT = 30
      $('bubble2').textContent = TOUCH ? 'TWO PUMPKIN SPICE LATTES! TAP SODA TO THROW THEM AT HIM.' : 'TWO PUMPKIN SPICE LATTES! PRESS F TO THROW THEM AT HIM.'; $('bubble2').classList.add('show'); game.b2T = 3.5 } }
  // Past Megabucks, Becky's priorities change.
  { const t = Math.atan2(0.968, -0.249), mx = (-93.25 + 6.5 * Math.cos(t)) * U, mz = (364.09 - 6.5 * Math.sin(t)) * U
    if (Math.hypot(P.pos.x - mx, P.pos.y - mz) < 14 && (game.psT ?? 0) <= 0 && game.b2T <= 0) { $('bubble2').textContent = 'FORGET THE TURKEY, I’D RATHER HAVE PUMPKIN SPICE. CAN WE STOP? LET’S GET THE PUMPKIN SPICE.'; $('bubble2').classList.add('show'); game.b2T = 4.2; game.psT = 30 }
    game.psT = (game.psT ?? 0) - dt }
  // The lady outside Publick Liquors calls out to us by name.
  { const lq = LIQUOR_LADY; if (lq) { const d = Math.hypot(P.pos.x - lq.x, P.pos.y - lq.z)
    if (d < 24 && (game.liqT ?? 0) <= 0) { ladyBubble('CHRIS AND BECKY! TEQUILA’S ON SALE — COME AND GET IT!', 3.5); game.liqT = 30 }
    game.liqT = (game.liqT ?? 0) - dt } }
  // Under the sheriff's dog billboard.
  { const d = Math.hypot(P.pos.x - SHERIFF.x * U, P.pos.y - SHERIFF.z * U)
    if (d < 16 && (game.dogT ?? 0) <= 0 && game.b2T <= 0) { $('bubble2').textContent = 'MAN, ALL OF A SUDDEN I REALLY WANT A DOG.'; $('bubble2').classList.add('show'); game.b2T = 3; game.dogT = 30; game.dog2 = 2.4 }
    if (game.dog2 > 0 && (game.dog2 -= dt) <= 0) chrisSays('BUT WE HAVE CATS ALREADY.', 3)
    game.dogT = (game.dogT ?? 0) - dt }
  // Driving around or under the Call Christy Homes billboard, Becky notices the necklace.
  if (BB_VIEW.look) { const d = Math.hypot(P.pos.x - BB_VIEW.look.x, P.pos.y - BB_VIEW.look.z)
    if (d < 13 && (game.necklaceT ?? 0) <= 0 && game.b2T <= 0) { $('bubble2').textContent = 'I DON’T KNOW IF SHE’S SELLING HERSELF OR SELLING HOMES ON THAT BILLBOARD.'; $('bubble2').classList.add('show'); game.b2T = 4; game.necklaceT = 25 }
    game.necklaceT = (game.necklaceT ?? 0) - dt }
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
  updateCans(dt); updateSodas(dt); updateCrates(dt)
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

// Mulch beds in the lot: the Galaxie hops up onto the concrete curb, rides over, and takes a scrape.
const BEDS = (DATA.beds || []).map(([x, z, w, d, t, top]) => ({ x, z, hw: w / 2 + 0.05, hd: d / 2 + 0.05, c: Math.cos(t), s: Math.sin(t), h: top - GY }))
const onBed = (x, z) => { for (const b of BEDS) { const dx = x - b.x, dz = z - b.z, lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c; if (Math.abs(lx) < b.hw && Math.abs(lz) < b.hd) return b.h } return 0 }
BEDS.unshift(...lotIslands)
BEDS.push({ x: PED_BED[0] * U, z: PED_BED[1] * U, hw: 1.3, hd: 1.3, c: 1, s: 0, h: 0.36 }) // the round crossing-sign planter: a taller curb than the palm islands
{ const t = Math.atan2(0.968, -0.249), lx = 8.2, lz = 1.0 // the round stop-sign planter off the north end of the west strip
  BEDS.push({ x: (-93.25 + lx * Math.cos(t) + lz * Math.sin(t)) * U, z: (364.09 - lx * Math.sin(t) + lz * Math.cos(t)) * U, hw: 1.5, hd: 1.5, c: 1, s: 0, h: 0.36 }) }
Object.assign(P, { curbLift: 0, curbPitch: 0, curbRoll: 0, curbWheels: 0 })
function rideBeds(dt, live) {
  const fx = Math.sin(P.heading), fz = Math.cos(P.heading), rx = fz, rz = -fx
  const h = [[1.55, 0.78], [1.55, -0.78], [-1.5, 0.78], [-1.5, -0.78]].map(([a, c]) => onBed(P.pos.x + fx * a + rx * c, P.pos.y + fz * a + rz * c))
  const on = h.filter((v) => v > 0).length, k = 1 - Math.exp(-dt * 14)
  P.curbLift += ((h[0] + h[1] + h[2] + h[3]) / 4 - P.curbLift) * k
  P.curbPitch += (((h[2] + h[3]) - (h[0] + h[1])) / 2 / 3.05 - P.curbPitch) * k
  P.curbRoll += (((h[1] + h[3]) - (h[0] + h[2])) / 2 / 1.56 - P.curbRoll) * k
  // Each wheel that bangs up onto the curb is a jolt and a little scrape; the bed also scrubs speed.
  if (on > P.curbWheels) {
    const sp = Math.hypot(P.vel.x, P.vel.y)
    if (sp > 1.5) { S.hit = Math.max(S.hit, 0.25); audio.crash(0.12); if (live) { game.armor = Math.max(1, game.armor - 0.6 * (on - P.curbWheels)); $('armorBar').classList.remove('flashbar'); void $('armorBar').offsetWidth; $('armorBar').classList.add('flashbar') } }
  }
  if (on) P.vel.multiplyScalar(Math.exp(-dt * 0.22 * on)) // grass and mulch drag a little, not a lot
  P.curbWheels = on
}

// S keeps the camera's shake; the vehicles carry the rest.
const S = { hit: 0 }
function placeCars(t) {
  const k = 0.25
  P.gy = P.gy === undefined ? groundAt(P.pos) : P.gy + (groundAt(P.pos) - P.gy) * k; R.gy = R.gy === undefined ? groundAt(R.pos) : R.gy + (groundAt(R.pos) - R.gy) * k
  car.position.set(P.pos.x, P.gy + P.curbLift, P.pos.y); car.rotation.set(P.curbPitch, P.heading, P.curbRoll, 'YXZ')
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

// --- body damage: the hood buckles and the taillights break as the Galaxie takes hits ---------------------
const brokenTail = new THREE.MeshStandardMaterial({ color: '#2a0607', roughness: 0.9 })
let dmgShown = -1
function showDamage() {
  const d = THREE.MathUtils.clamp((100 - game.armor) / 75, 0, 1), step = Math.round(d * 20) / 20
  if (step === dmgShown) return
  const worse = step > dmgShown; dmgShown = step
  hoodSkin.visible = step > 0.04
  const p = hoodSkin.geometry.attributes.position, rest = hoodSkin.geometry.userData.rest
  for (let i = 0; i < p.count; i++) { const x = rest[i * 3], y = rest[i * 3 + 1], z = rest[i * 3 + 2], f = THREE.MathUtils.smoothstep(z, 1.4, 2.6)
    const fold = Math.exp(-(((z - 2.0) / 0.16) ** 2)) * (0.6 + 0.4 * Math.cos(x * 3.1)), ripple = Math.sin(x * 9 + z * 5) * Math.sin(z * 11) * f
    p.setXYZ(i, x, y + step * (0.16 * fold + 0.035 * ripple - 0.09 * f * f) - 0.004, z - step * 0.12 * f * f) }
  p.needsUpdate = true; hoodSkin.geometry.computeVertexNormals()
  tails.forEach((t, i) => { const broke = step >= [0.2, 0.4, 0.6, 0.8][[2, 1, 3, 0][i]]
    if (broke && t.material !== brokenTail && worse && game.state !== 'intro') { const w = t.getWorldPosition(new V3()); burst(new V2(w.x, w.z), 4, true, false, '#ff2a1a') }
    t.material = broke ? brokenTail : carM.taillight; t.scale.set(broke ? 0.85 : 1, 1, broke ? 0.85 : 1) })
}

// --- skid marks, sparks and smoke --------------------------------------------------
const SKIDS = 2400
const skidGeo = new THREE.PlaneGeometry(0.22, 0.5); skidGeo.rotateX(-Math.PI / 2)
const skidMesh = new THREE.InstancedMesh(skidGeo, new THREE.MeshBasicMaterial({ color: '#0d0d0d', transparent: true, opacity: 0.62, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), SKIDS)
skidMesh.count = 0; skidMesh.frustumCulled = false; scene.add(skidMesh)
let skidIdx = 0
const skidM = new THREE.Matrix4(), skidQ = new THREE.Quaternion(), skidP = new V3(), one = new V3(1, 1, 1), UP = new V3(0, 1, 0)
function laySkid(all) {
  for (const w of wheels.filter((w) => all || !w.front)) {
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
// Does the line from the car to the camera pass through a building's footprint (not a low barrier)?
let camLift = 0, camLiftT = 0, camSwing = 0, camArm = 1
function camBlocked(x0, z0, x1, z1) {
  let best = Infinity
  for (const b of boxes) {
    if (b.low || b.hx < 0.6) continue
    const ax = b.a.x, az = b.a.y, px = x0 - b.c.x, pz = z0 - b.c.y, dx = x1 - x0, dz = z1 - z0
    const u0 = px * ax + pz * az, v0 = -px * az + pz * ax, du = dx * ax + dz * az, dv = -dx * az + dz * ax
    let t0 = 0, t1 = 1
    for (const [p, d, h] of [[u0, du, b.hx + 0.4], [v0, dv, b.hz + 0.4]]) {
      if (Math.abs(d) < 1e-6) { if (Math.abs(p) > h) { t0 = 2; break } continue }
      let ta = (-h - p) / d, tb = (h - p) / d; if (ta > tb) [ta, tb] = [tb, ta]
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) break
    }
    if (t0 <= t1 && t0 < 1 && t1 > 0.05) best = Math.min(best, Math.max(0, t0))
  }
  return best
}
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
    // Keep the camera out of buildings: if a house, shop or bank stands between the car and the camera,
    // swing round to the nearest clear side (and rise a little); only if every side is blocked, go up high.
    const hitAt = (off) => camBlocked(carP.x, carP.z, carP.x + Math.sin(yaw + off) * dist * 1.15, carP.z + Math.cos(yaw + off) * dist * 1.15)
    const clear = (off) => hitAt(off) === Infinity
    let pick = null
    for (const off of [0, 0.5, -0.5, 1.0, -1.0, 1.5, -1.5, 2.1, -2.1, Math.PI]) if (clear(off)) { pick = off; break }
    if (pick !== null && Math.abs(pick - camSwing) > 0.3 && clear(camSwing)) pick = camSwing // don't flip sides while the current one is still clear
    // Boxed in on every side (a drive-thru lane, a tight gap between houses): pull the camera in on its arm instead.
    const arm = pick === null ? THREE.MathUtils.clamp(hitAt(camSwing) * 1.15 * 0.85, 0.3, 1) : 1
    camLiftT = pick === null ? 0 : Math.min(1, Math.abs(pick) * 0.35)
    camSwing += ((pick ?? camSwing) - camSwing) * (1 - Math.exp(-dt * 4))
    camLift += (camLiftT - camLift) * (1 - Math.exp(-dt * (camLiftT > camLift ? 6 : 2.5)))
    camArm += (arm - camArm) * (1 - Math.exp(-dt * (arm < camArm ? 12 : 3)))
    const yw = yaw + camSwing, d2 = dist * camArm, h2 = height * (0.55 + 0.45 * camArm) + camLift * 4
    want = carP.clone().add(new V3(Math.sin(yw) * d2 * Math.cos(orbitPitch), h2 + Math.sin(orbitPitch) * d2, Math.cos(yw) * d2 * Math.cos(orbitPitch)))
    look = carP.clone().addScaledVector(f, camMode === 0 ? 2.4 : 0.6).add(new V3(0, 1.1, 0))
    fov = 54 + Math.min(14, Math.abs(P.fwd) * 0.45)
  }
  if (!camPos.lengthSq() || snap) { camPos.copy(want); camLook.copy(look) }
  camPos.lerp(want, 1 - Math.exp(-(game.state === 'intro' ? 2 : 5) * dt)); camLook.lerp(look, 1 - Math.exp(-9 * dt))
  camera.position.copy(camPos); skyDome.position.copy(camPos) // the sky travels with you
  if (S.hit > 0) { camera.position.add(new V3((Math.random() - 0.5) * S.hit * 0.3, (Math.random() - 0.5) * S.hit * 0.3, 0)); S.hit = Math.max(0, S.hit - dt * 3) }
  camera.lookAt(camLook)
  camera.fov += (fov - camera.fov) * (1 - Math.exp(-3 * dt)); camera.updateProjectionMatrix()
  // Move the shadow camera only in whole shadow-map texels, so shadow edges don't crawl and flicker as the car moves.
  { const tex = 110 / sun.shadow.mapSize.x, rt = _sr.crossVectors(_up, sunDir).normalize(), upv = _su.crossVectors(sunDir, rt).normalize()
    const a = Math.round(carP.dot(rt) / tex) * tex, b = Math.round(carP.dot(upv) / tex) * tex, c = carP.dot(sunDir)
    _sp.set(0, 0, 0).addScaledVector(rt, a).addScaledVector(upv, b).addScaledVector(sunDir, c)
    sun.position.copy(_sp).addScaledVector(sunDir, 200); sun.target.position.copy(_sp) }
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
    // A balloon popping: a sharp, short crack.
    pop() {
      if (!ctx || muted) return
      const src = ctx.createBufferSource(); src.buffer = noise; const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900
      const g = ctx.createGain(); g.gain.value = 0.9; g.gain.setTargetAtTime(0, ctx.currentTime + 0.01, 0.025); src.connect(hp); hp.connect(g); g.connect(master); src.start(); src.stop(ctx.currentTime + 0.2)
    },
    // A dull cardboard thump for the boxes.
    thud(s) {
      if (!ctx || muted) return
      const src = ctx.createBufferSource(); src.buffer = noise; src.playbackRate.value = 0.6 + Math.random() * 0.3
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420 + Math.random() * 200
      const g = ctx.createGain(); g.gain.value = 0.55 * s; g.gain.setTargetAtTime(0, ctx.currentTime + 0.03, 0.05)
      src.connect(lp); lp.connect(g); g.connect(master); src.start(); src.stop(ctx.currentTime + 0.35)
      const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = 110 + Math.random() * 40; og.gain.value = 0.35 * s
      og.gain.setTargetAtTime(0, ctx.currentTime, 0.04); o.connect(og); og.connect(master); o.start(); o.stop(ctx.currentTime + 0.3)
    },
    // A galvanized trash can: a ringing, inharmonic clang plus a crash of noise.
    clang(s) {
      if (!ctx || muted) return
      const t = ctx.currentTime
      for (const f of [523, 811, 1187, 1659]) { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f * (0.97 + Math.random() * 0.06); const g = ctx.createGain(); g.gain.value = 0.09 * s; g.gain.setTargetAtTime(0, t, 0.18 + Math.random() * 0.12); o.connect(g); g.connect(master); o.start(); o.stop(t + 1.2) }
      const src = ctx.createBufferSource(); src.buffer = noise; const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1500
      const g = ctx.createGain(); g.gain.value = 0.5 * s; src.connect(hp); hp.connect(g); g.connect(master); src.start()
    },
    fanfare() {
      if (!ctx || muted) return
      ;[392, 494, 587, 784].forEach((f, i) => { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f; const g = ctx.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(0.18, ctx.currentTime + i * 0.14, 0.01); g.gain.setTargetAtTime(0, ctx.currentTime + i * 0.14 + 0.25, 0.08); o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + 1.5) })
    },
    toggle() { muted = !muted; flash(muted ? 'SOUND OFF' : 'SOUND ON') },
  }
})()

// --- HUD ------------------------------------------------------------------------
// Little ammo icons: his cranberry cans, her soda cans, and the lattes once she has them.
const CRAN_SVG = '<svg viewBox="0 0 12 18"><rect x="1" y="2" width="10" height="14" rx="1.5" fill="#a3152f"/><rect x="1" y="2" width="10" height="2" fill="#c9cdd0"/><rect x="1" y="14" width="10" height="2" fill="#c9cdd0"/><rect x="2.5" y="7" width="7" height="4" fill="#f4ecd8"/></svg>'
const SODA_SVG = '<svg viewBox="0 0 12 18"><rect x="1.5" y="1.5" width="9" height="15" rx="2" fill="#1f6fd0"/><rect x="2.5" y="1" width="7" height="1.6" rx=".8" fill="#c9cdd0"/><path d="M1.5 9 C4 7 8 11 10.5 9" stroke="#fff" stroke-width="1.6" fill="none"/></svg>'
const LATTE_SVG = '<svg viewBox="0 0 14 18"><path d="M2 3 H12 L10.5 17 H3.5 Z" fill="#f4efe4"/><rect x="1.3" y="1" width="11.4" height="2.4" rx="1" fill="#e7742a"/><path d="M2.6 8 H11.4 L11 12 H3 Z" fill="#8a5a2b"/></svg>'
const icon = (svg, gone) => gone ? svg.replace('<svg', '<svg class="gone"') : svg
let hudAmmoKey = ''
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
  { const key = `${game.cans}|${game.soda}|${game.lattes}|${game.gotLattes}|${game.sodaReady}`
    if (key !== hudAmmoKey) { hudAmmoKey = key
      $('cans').innerHTML = Array.from({ length: 10 }, (_, i) => icon(CRAN_SVG, i >= game.cans)).join('')
      $('sodas').innerHTML = Array.from({ length: 3 }, (_, i) => icon(SODA_SVG, !game.sodaReady || i >= game.soda)).join('') + (game.gotLattes ? Array.from({ length: 2 }, (_, i) => icon(LATTE_SVG, i >= game.lattes)).join('') : '') } }
  
  $('grabFill').style.width = `${game.grab * 100}%`
  // Only while he is actually at the door grabbing it.
  const grabbing = game.grab > (game.lastGrab ?? 0) + 1e-6 && game.state === 'chase'; game.lastGrab = game.grab
  game.grabShowT = grabbing ? 0.4 : (game.grabShowT ?? 0) - 1 / 60
  $('grabRow').classList.toggle('warn', game.grabShowT > 0 && game.state === 'chase')
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
  if (LIQUOR_LADY) { proj.set(LIQUOR_LADY.x, GY + 2.2, LIQUOR_LADY.z).project(camera); const b4 = $('bubble4'); b4.style.left = `${(proj.x * 0.5 + 0.5) * innerWidth}px`; b4.style.top = `${(-proj.y * 0.5 + 0.5) * innerHeight}px`; b4.style.visibility = proj.z < 1 ? 'visible' : 'hidden' }
  for (const id of ['bubble', 'bubble2', 'bubble3', 'bubble4']) { const e = $(id); if (!e.classList.contains('show')) continue
    const w = e.offsetWidth, x = parseFloat(e.style.left) || 0, m = 8
    e.style.left = `${THREE.MathUtils.clamp(x, w / 2 + m, innerWidth - w / 2 - m)}px` } // never off the edge of a phone screen
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
  // Rubber goes down when you slide, handbrake, brake hard or spin the tyres off the line.
  const dF = Math.abs(P.fwd) - Math.abs(P.lastFwd ?? P.fwd); P.lastFwd = P.fwd
  const hardStop = Math.abs(P.fwd) > 4 && dF < -0.3, launch = Math.abs(P.fwd) > 0.5 && Math.abs(P.fwd) < 9 && dF > 0.2
  if ((P.skid > 0.22 || hardStop || launch) && t - lastSkid > 0.022 && game.state !== 'intro') { laySkid(P.skid > 0.6 || hardStop); lastSkid = t }
  showDamage()
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
// Keep the title up long enough to read, however fast the load was: at least 3.5 s on screen,
// and always a beat after the bar fills.
{ const shown = performance.now() - (window.__loadStart ?? 0), wait = params.has('shot') ? 0 : Math.max(1200, 3500 - shown)
  try { $('bar').style.width = '100%' } catch {}
  setTimeout(() => { $('loading').classList.add('gone'); $('intro').classList.remove('gone') }, wait) }
if (params.has('play')) start()
requestAnimationFrame(frame)

// Test hooks.
window.__game = { balloons, THREE, world: world.scene, crates, throwSoda, dbg: { circles, boxes, regions, DATA }, PATH, rival, twin, sim: (secs) => { for (let i = 0; i < secs * 60; i++) update(1 / 60) }, game, P, R, camera, scene, setCam: (m) => { camMode = m }, keys, start, reset, DOOR, V3, GY, wheels }
