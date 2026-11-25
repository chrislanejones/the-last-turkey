/**
 * Cuts a few blocks out of chrislanejones/3d-world (St. Augustine Beach) for the
 * Galaxie scene: the Envoy Suites resort, the Salt & Surf roof deck (and its
 * diners) across A1A, the Ocean Breeze motel, the pier block, a stretch of A1A.
 * It runs the town's own builders through a small kit instead of the whole-town
 * generator, then writes one GLB with a vertex-colored mesh per layer, in meters.
 */
import fs from 'node:fs'
import { BoxGeometry, BufferAttribute, BufferGeometry, Color, CylinderGeometry, Matrix4, Mesh, MeshStandardMaterial, Quaternion, Scene, Vector3 } from 'three'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
const W = '/home/claude/3d-world/st-aug-anastasia-beach/world'
import { buildEnvoySuites } from '/home/claude/3d-world/st-aug-anastasia-beach/world/envoy-suites'
import { buildWestA1ABusinesses } from '/home/claude/3d-world/st-aug-anastasia-beach/world/west-a1a-businesses'
import { buildPierPrecinct, buildVolleyballCourts } from '/home/claude/3d-world/st-aug-anastasia-beach/world/pier-precinct'
import { buildBeachPerson, type BeachPerson } from '/home/claude/3d-world/st-aug-anastasia-beach/world/coastal-people'
import { makeCarParts } from '/home/claude/3d-world/st-aug-anastasia-beach/world/car-kit'
import { vegetationKit } from '/home/claude/3d-world/st-aug-anastasia-beach/world/coastal-vegetation'
import { boulevardOffset, boulevardX } from '/home/claude/3d-world/st-aug-anastasia-beach/world/coast-layout'
void W

class NodeFileReader {
  result: ArrayBuffer | null = null
  onloadend: (() => void) | null = null
  readAsArrayBuffer(blob: Blob) { blob.arrayBuffer().then((b) => { this.result = b; this.onloadend?.() }) }
}
;(globalThis as any).FileReader = NodeFileReader

type Layer = 'architecture' | 'roof' | 'glass' | 'clear' | 'ground' | 'foliage' | 'wood' | 'water'
const LAYERS: Layer[] = ['architecture', 'roof', 'glass', 'clear', 'ground', 'foliage', 'wood', 'water']
const parts: Record<Layer, BufferGeometry[]> = { architecture: [], roof: [], glass: [], clear: [], ground: [], foliage: [], wood: [], water: [] }
/** 'layout': built in the town's pre-spread frame (A1A at X -6.7); 'final': built where it stands. */
let mode: 'layout' | 'final' = 'final'
const UNIT = 13.4 * 0.3048 // one town unit is 13.4 ft

const add = (layer: Layer, input: BufferGeometry, color: string, x: number, y: number, z: number, rotation = 0, _glow?: string | null) => {
  let g = input.index ? input.toNonIndexed() : input.clone()
  input.dispose()
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k)
  if (!g.getAttribute('normal')) g.computeVertexNormals()
  g.rotateY(rotation); g.translate(x, y, z)
  const c = new Color(color), n = g.getAttribute('position').count, v = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { v[i * 3] = c.r; v[i * 3 + 1] = c.g; v[i * 3 + 2] = c.b }
  g.setAttribute('color', new BufferAttribute(v, 3))
  g.userData = { mode, layer }
  parts[layer].push(g)
}
const box = (layer: Layer, color: string, x: number, y: number, z: number, w: number, h: number, d: number, turn = 0, glow?: string | null) =>
  add(layer, new BoxGeometry(w, h, d), color, x, y, z, turn, glow)
const hipRoof = (w: number, d: number, rise: number) => {
  const ridge = Math.max(0, (w - d) / 2), x = w / 2, z = d / 2
  const p = [[-x, 0, -z], [x, 0, -z], [x, 0, z], [-x, 0, z], [-ridge, rise, 0], [ridge, rise, 0]]
  const tri = [[0, 4, 5], [0, 5, 1], [1, 5, 2], [2, 5, 4], [2, 4, 3], [3, 4, 0]]
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(tri.flat().flatMap((i) => p[i])), 3))
  g.computeVertexNormals(); return g
}
const roof = (x: number, y: number, z: number, w: number, d: number, rise: number, color: string) => {
  add('roof', hipRoof(w, d, rise), color, x, y, z)
  box('architecture', '#f5eee0', x, y - .05, z, w, .1, d)
}
const pole = (a: Vector3, b: Vector3, radius: number, color: string, layer: Layer = 'wood') => {
  const dir = b.clone().sub(a)
  const g = new CylinderGeometry(radius * .8, radius, dir.length(), 6)
  g.applyMatrix4(new Matrix4().compose(a.clone().add(b).multiplyScalar(.5), new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize()), new Vector3(1, 1, 1)))
  add(layer, g, color, 0, 0, 0)
}
/** Whole objects (plants, cars) move by one offset instead of being stretched. */
const whole = (x: number, build: () => void) => {
  const start = LAYERS.map((l) => parts[l].length)
  build()
  LAYERS.forEach((l, i) => parts[l].slice(start[i]).forEach((g) => { g.userData.dx = mode === 'layout' ? boulevardOffset(x) : 0 }))
}
const plants = vegetationKit(add as any, false)
const palm = (...a: Parameters<typeof plants.palm>) => whole(a[0], () => plants.palm(...a))
const bush = (...a: Parameters<typeof plants.bush>) => whole(a[0], () => plants.bush(...a))
const tree = (...a: Parameters<typeof plants.tree>) => whole(a[0], () => plants.tree(...a))
const rand = (seed: number) => { const v = Math.sin(seed * 127.1 + 31.7) * 43758.5453; return v - Math.floor(v) }
const car = (x: number, z: number, seed: number, turn = 0, _driving = false, family?: number) => {
  whole(x, () => {
    const start = LAYERS.map((l) => parts[l].length)
    for (const part of makeCarParts(seed, undefined, family).parts) {
      const layer: Layer = part.finish === 'glass' ? 'glass' : part.finish === 'rubber' ? 'wood' : 'architecture'
      add(layer, part.geometry, part.color, 0, .06, 0, 0)
    }
    LAYERS.forEach((l, i) => parts[l].slice(start[i]).forEach((g) => g.rotateY(turn).translate(x, 0, z)))
  })
}
const parkingRow = (x: number, z: number, count: number, seed: number, facing = 1, surface = '#727e7b') => {
  const pitch = .78, width = count * pitch
  box('ground', surface, x, .053, z, width + .25, .05, 1.65)
  box('ground', '#ded8c6', x, .085, z + facing * .77, width + .25, .1, .12)
  for (let i = 0; i <= count; i++) box('ground', '#eee7d5', x - width / 2 + i * pitch, .087, z, .035, .018, 1.4)
  for (let i = 0; i < count; i++) {
    const px = x - width / 2 + (i + .5) * pitch
    box('ground', '#c9c6b4', px, .13, z + facing * .55, .42, .075, .09)
    if (rand(seed + i) > .64) car(px, z + facing * .12, seed + i, facing < 0 ? Math.PI : 0)
  }
}
const lightPool = () => {}
const kit: any = { box, roof, pole, add, palm, bush, tree, parkingRow, car, lightPool }

// --- the town's own buildings -------------------------------------------------
mode = 'final'
buildEnvoySuites(kit)
mode = 'layout'
buildWestA1ABusinesses(kit)
buildPierPrecinct(kit)

// The layout spread, as hero-coast-model.ts applies it.
for (const layer of LAYERS) for (const g of parts[layer]) {
  if (g.userData.mode !== 'layout') continue
  if (g.userData.dx !== undefined) { g.translate(g.userData.dx, 0, 0); continue }
  const p = g.getAttribute('position')
  if (layer === 'ground') { for (let i = 0; i < p.count; i++) p.setX(i, boulevardX(p.getX(i))); g.computeVertexNormals() }
  else { g.computeBoundingBox(); const b = g.boundingBox!; g.translate(boulevardOffset((b.min.x + b.max.x) / 2), 0, 0) }
  g.userData.mode = 'final'
}
mode = 'final'
buildVolleyballCourts(kit)

// --- A1A, from Pope Rd to Atlantis Cir (final frame: A1A at X -24.7) -----------
const Z0 = -138, Z1 = -88, ZM = (Z0 + Z1) / 2, ZL = Z1 - Z0
box('ground', '#d0c6b1', -24.7, .016, ZM, 3.2, .04, ZL)       // sidewalks either side
box('ground', '#6f7877', -24.7, .048, ZM, 2.25, .035, ZL)     // asphalt
for (const [a, b] of [[-136.6, -133.2], [-130.4, -125.4], [-122.6, -110.4], [-107.6, -95.4], [-92.6, -88]]) {
  for (const x of [-24.77, -24.63]) box('ground', '#dfcea0', x, .068, (a + b) / 2, .035, .012, b - a)
  for (const x of [-25.52, -23.88]) box('ground', '#dcdccb', x, .068, (a + b) / 2, .025, .012, b - a)
}
// Cross streets: Pope Rd, Anastasia Lodge Dr, the pier drive, Atlantis Cir.
for (const z of [-131.8, -124, -109, -94]) {
  box('ground', '#6f7877', -36, .047, z, 22, .033, 2.2)
  for (let i = 0; i < 6; i++) box('ground', '#e9e6dc', -26.05, .07, z - .8 + i * .32, .35, .012, .16) // crosswalk
}
// A sand-and-grass lot under everything.
box('ground', '#a9ab8e', -14, -.01, ZM, 50, .02, ZL + 6)

// --- people: a crowd out front of the resort and on the Salt & Surf sidewalk -------
const crowd: BeachPerson[] = []
const outfits = ['tee-shorts', 'tank-shorts', 'one-piece', 'tee-shorts', 'tank-shorts'] as const
let seed = 300
for (const [x0, z0, n, face] of [[-23.33, -117.4, 8, -Math.PI / 2], [-26.05, -114.6, 8, Math.PI / 2], [-26.05, -119.9, 5, Math.PI / 2], [-23.33, -112.2, 4, -Math.PI / 2]] as const) {
  for (let i = 0; i < n; i++) {
    const s = seed++
    crowd.push({
      id: `crowd-${s}`, seed: s, outfit: outfits[s % outfits.length],
      x: x0 + (rand(s) - .5) * .16, z: z0 + (i - n / 2) * .42 + (rand(s + 7) - .5) * .2,
      pose: i % 3 === 0 ? 'walk' : 'chat', heading: face + (rand(s + 3) - .5) * 2.2, y: .053,
    })
  }
}
for (const p of crowd) buildBeachPerson({ box, add, pole } as any, p)

// --- crop to about three blocks, merge per layer, write meters --------------------
const keep = (g: BufferGeometry) => {
  g.computeBoundingBox(); const b = g.boundingBox!
  const cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2
  return cz > Z0 - 1 && cz < Z1 + 1 && cx > -40 && cx < 12
}
const scene = new Scene()
const mats: Record<Layer, MeshStandardMaterial> = {
  architecture: new MeshStandardMaterial({ vertexColors: true, roughness: .85 }),
  roof: new MeshStandardMaterial({ vertexColors: true, roughness: .75 }),
  glass: new MeshStandardMaterial({ vertexColors: true, roughness: .15, metalness: .6 }),
  clear: new MeshStandardMaterial({ vertexColors: true, roughness: .05, metalness: .2, transparent: true, opacity: .35 }),
  ground: new MeshStandardMaterial({ vertexColors: true, roughness: .95 }),
  foliage: new MeshStandardMaterial({ vertexColors: true, roughness: .8 }),
  wood: new MeshStandardMaterial({ vertexColors: true, roughness: .8 }),
  water: new MeshStandardMaterial({ vertexColors: true, roughness: .05, metalness: .1, color: '#7fd0e0' }),
}
let total = 0
for (const layer of LAYERS) {
  const list = parts[layer].filter(keep)
  if (!list.length) continue
  let g = mergeGeometries(list)!
  g = mergeVertices(g, 1e-4)
  g.scale(UNIT, UNIT, UNIT)
  g.computeBoundingBox()
  const tris = (g.index ? g.index.count : g.getAttribute('position').count) / 3
  total += tris
  console.log(layer.padEnd(13), String(list.length).padStart(6), 'parts', String(tris | 0).padStart(8), 'tris')
  const mesh = new Mesh(g, mats[layer]); mesh.name = layer
  scene.add(mesh)
}
console.log('total tris', total | 0, 'rss', process.memoryUsage().rss / 1e6 | 0, 'MB')
const out = process.argv[2] ?? 'dist/assets/st-aug-strip.glb'
new GLTFExporter().parse(scene, (glb) => { fs.writeFileSync(out, Buffer.from(glb as ArrayBuffer)); console.log('wrote', out, (fs.statSync(out).size / 1e6).toFixed(2), 'MB') },
  (e) => { throw e }, { binary: true })
