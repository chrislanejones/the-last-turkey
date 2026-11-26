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
import { buildA1aSouthShops, handBuiltA1aShop } from '/home/claude/3d-world/st-aug-anastasia-beach/world/a1a-south-shops'
import { buildWestBlocks } from '/home/claude/3d-world/st-aug-anastasia-beach/world/west-blocks'
import { buildAnastasiaPlaza } from '/home/claude/3d-world/st-aug-anastasia-beach/world/anastasia-plaza'
import { PONCE_ROADS, PONCE_HOUSES } from '/home/claude/3d-world/st-aug-anastasia-beach/world/ponce-data'
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

let wb = false, loving = false, groundK = 0
/** A1A S past the plaza, redrawn as one road: two lanes and a centre turn lane, set back from the plaza's curb. */
const A1A_S: number[][] = [[-106.34, 340], [-104.07, 350], [-101.79, 360], [-99.51, 370], [-97.23, 380], [-94.95, 390], [-92.68, 400], [-90.4, 410], [-88.58, 418]] // dead straight, clear of the plaza's curb all the way
/** The neighborhood is lifted from Floridian Ave and set down south-west of the tip, where the map has a supermarket. */
const HS = [3.4, 14.6] // its street now meets A1A S at the tip: Farmers on the north corner, PCN Bank on the south
/** PCN Bank steps south to make room for the street. */
const BANK_MOVE = [0.5, 9.2]
const hoodCut = (x: number, z: number) => z > 391.5 && x > -102.6 // the part that would land on PCN Bank
const SIDING = ['#e6d3a3', '#9fc3c6', '#e9b79c', '#bfd0a4', '#f1dc97', '#b3bedb', '#dcc7b1', '#8fb5a6', '#e7c9d1']
/** The neighborhood west of A1A S that comes straight from the map's own west-blocks builder. */
const inHood = (x: number, z: number) => (x < -98.5 || (x < -96 && z > 391)) && x > -131 && z > 377 && z < 397
// The corner office at A1A S and Floridian (Farmers Defending Farmers), drawn by the game instead.
const FARMERS = { x: -100.2, z: 384.9, hw: 1.95, hd: 1.35, t: 0.19 }
const inFarmersOnly = (x: number, z: number) => { const dx = x - FARMERS.x, dz = z - FARMERS.z, lx = dx * Math.cos(FARMERS.t) - dz * Math.sin(FARMERS.t), lz = dx * Math.sin(FARMERS.t) + dz * Math.cos(FARMERS.t); return Math.abs(lx) < FARMERS.hw + .9 && Math.abs(lz) < FARMERS.hd + .9 }
// 280 Floridian Ave, the stucco office across the street: also drawn by the game.
const OFFICE280 = { x: -97.8, z: 393.0, hw: 2.25, hd: 1.85 }
const in280 = (x: number, z: number) => Math.abs(x - OFFICE280.x) < OFFICE280.hw + .9 && Math.abs(z - OFFICE280.z) < OFFICE280.hd + .9
// ...and the house the map squeezes in right behind the corner office, which overlapped it.
const inBehind = (x: number, z: number) => Math.hypot(x + 100.58, z - 381.06) < 1.9
const inFarmers = (x: number, z: number) => inFarmersOnly(x, z) || in280(x, z) || inBehind(x, z)
// Which neighborhood home's footprint (padded) holds a point, or -1.
const homeAt = (x: number, z: number, pad: number) => PONCE_HOUSES.findIndex(([hx, hz, w, d, deg]) => {
  const t = deg * Math.PI / 180, dx = x - hx, dz = z - hz, lx = dx * Math.cos(t) + dz * Math.sin(t), lz = -dx * Math.sin(t) + dz * Math.cos(t)
  return Math.abs(lx) < w / 2 + pad && Math.abs(lz) < d / 2 + pad
})
const add = (layer: Layer, input: BufferGeometry, color: string, x: number, y: number, z: number, rotation = 0, _glow?: string | null) => {
  if ((input as any).parameters?.height === 2.5 && layer === 'wood') DATA.poles.push([x * UNIT, z * UNIT])
  if (wb && inFarmers(x, z)) { input.dispose(); return }
  if (!wb && layer === 'architecture' && Math.hypot(x + 86.4, z - 394.4) < .5 && y > .05) { input.dispose(); return } // the price pylon: the game builds it, so it can fall // the corner office is built by the game
  let g = input.index ? input.toNonIndexed() : input.clone()
  input.dispose()
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k)
  if (!g.getAttribute('normal')) g.computeVertexNormals()
  g.rotateY(rotation); g.translate(x, y, z)
  if (layer === 'ground') g.translate(0, (groundK++ % 7) * .0002, 0) // overlapping paving never shares a plane: no flicker
  let fascia: number[] | null = null
  if (wb && !loving && layer === 'roof' && inHood(x, z)) {
    g.computeBoundingBox(); const b = g.boundingBox!, cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2
    const y0 = b.min.y, sx = b.max.x - b.min.x, sz = b.max.z - b.min.z // numbers: the box itself changes as the roof moves
    if (b.max.y - y0 > .15 && sx < 6 && sz < 6) {
      g.translate(-cx, -y0, -cz).scale(1.09, 1.55, 1.09).translate(cx, y0, cz)
      fascia = [cx, y0, cz, sx * 1.09, sz * 1.09]
    }
    const c0 = new Color(color); color = '#' + c0.multiplyScalar(.7).getHexString()
  }
  const c = new Color(color), n = g.getAttribute('position').count, v = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { v[i * 3] = c.r; v[i * 3 + 1] = c.g; v[i * 3 + 2] = c.b }
  g.setAttribute('color', new BufferAttribute(v, 3))
  g.userData = { mode, layer, wb }
  parts[layer].push(g)
  if (fascia) { loving = true; add('architecture', new BoxGeometry(fascia[3] + .04, .07, fascia[4] + .04), '#f7f5ee', fascia[0], fascia[1] - .02, fascia[2]); loving = false }
}
const DT = { cx: -93.25, cz: 364.09, t: Math.atan2(.968, -.249), x0: 6.0, x1: 7.6, clear: .8 } // open right through to the north end: pillars hold it up
let cutting = false
const box = (layer: Layer, color: string, x: number, y: number, z: number, w: number, h: number, d: number, turn = 0, glow?: string | null) => {
  // Megabucks' drive-thru: a lane cut clean through the strip's north end, roofed over above car height.
  if (!cutting && layer !== 'ground' && Math.abs(turn - DT.t) < 1e-3) {
    const c = Math.cos(DT.t), sn = Math.sin(DT.t), dx = x - DT.cx, dz = z - DT.cz, lx = dx * c - dz * sn, lz = dx * sn + dz * c
    if (Math.abs(lz) < 2.2 && lx - w / 2 < DT.x1 && lx + w / 2 > DT.x0 && y - h / 2 < DT.clear) {
      const at = (px: number) => [DT.cx + px * c + lz * sn, DT.cz - px * sn + lz * c]
      cutting = true
      const l0 = lx - w / 2, l1 = lx + w / 2
      if (DT.x0 - l0 > .005) { const [px, pz] = at((l0 + DT.x0) / 2); box(layer, color, px, y, pz, DT.x0 - l0, h, d, turn, glow) }
      if (l1 - DT.x1 > .005) { const [px, pz] = at((DT.x1 + l1) / 2); box(layer, color, px, y, pz, l1 - DT.x1, h, d, turn, glow) }
      const top = y + h / 2
      if (top - DT.clear > .005) { const lo = Math.max(DT.x0, l0), hi = Math.min(DT.x1, l1), [px, pz] = at((lo + hi) / 2); box(layer, color, px, (DT.clear + top) / 2, pz, hi - lo, top - DT.clear, d, turn, glow) }
      cutting = false
      return
    }
  }
  // Collide with the homes that were actually drawn (the map drops some lots), not the raw outlines.
  if (wb && !loving && layer === 'architecture' && h > .6 && w > .5 && d > .5 && inHood(x, z) && !inFarmers(x, z)) DATA.homes.push([x * UNIT, z * UNIT, w * UNIT, d * UNIT, turn])
  if (wb && !loving && layer === 'architecture' && h > .6 && w > 1.2 && d > 1.2 && inHood(x, z)) {
    // A home's body: beach-house siding colour, a foundation band, white corner boards.
    // Colour each wing by the house it actually belongs to, so one home isn't two-tone.
    let best = homeAt(x, z, .35), bd = 3
    if (best < 0) PONCE_HOUSES.forEach((hh, i) => { const dd = Math.hypot(hh[0] - x, hh[1] - z); if (dd < bd) { bd = dd; best = i } })
    if (best >= 0) color = SIDING[best % SIDING.length]
    loving = true
    const c = Math.cos(turn), sn = Math.sin(turn), y0 = y - h / 2
    add('architecture', new BoxGeometry(w + .04, .09, d + .04), '#8d877b', x, y0 + .045, z, turn)
    for (const ex of [-1, 1]) for (const ez of [-1, 1]) { const lx = ex * w / 2, lz = ez * d / 2; add('architecture', new BoxGeometry(.06, h, .06), '#f7f5ee', x + lx * c + lz * sn, y, z - lx * sn + lz * c, turn) }
    for (let k = 1; k * .13 < h - .05; k++) add('architecture', new BoxGeometry(w + .012, .008, d + .012), '#b9b2a0', x, y0 + k * .13, z, turn) // clapboard lines
    loving = false
  }
  // Mulch beds in the lot: cars can hop up onto these.
  if (!wb && layer === 'ground' && color === '#6b4f3a') DATA.beds.push([x * UNIT, z * UNIT, w * UNIT, d * UNIT, turn, (y + h / 2) * UNIT])
  if (wb && color === '#c7c3b4' && w === .7 && inHood(x, z)) DATA.drives.push([x * UNIT, z * UNIT, Math.sin(turn), Math.cos(turn), d * UNIT])
  add(layer, new BoxGeometry(w, h, d), color, x, y, z, turn, glow)
}
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
const palm = (...a: Parameters<typeof plants.palm>) => { if (wb && inFarmers(a[0], a[1])) return; if (thin) DATA.palms.push([a[0] * UNIT, a[1] * UNIT]); whole(a[0], () => plants.palm(...a)) }
// No shrubs or oaks growing up through the neighbors' roofs.
const inAHome = (x: number, z: number) => wb && (inFarmers(x, z) || x < -97 && x > -131 && z > 376 && z < 397 && homeAt(x, z, .45) >= 0)
const bush = (...a: Parameters<typeof plants.bush>) => { if (!inAHome(a[0], a[1])) whole(a[0], () => plants.bush(...a)) }
const tree = (...a: Parameters<typeof plants.tree>) => { if (!inAHome(a[0], a[1])) whole(a[0], () => plants.tree(...a)) }
const rand = (seed: number) => { const v = Math.sin(seed * 127.1 + 31.7) * 43758.5453; return v - Math.floor(v) }
const DATA = { cars: [] as number[][], palms: [] as number[][], poles: [] as number[][], walls: [] as number[][], drives: [] as number[][], homes: [] as number[][], beds: [] as number[][], barrels: [] as number[][], arcade: [] as number[][] }
let thin = false
const car = (x: number, z: number, seed: number, turn = 0, _driving = false, family?: number) => {
  if (wb && inHood(x, z)) return // keep the neighbors' driveways clear
  if (thin) { if (rand(seed * 1.37 + 5) > .13 || (Math.abs(x + 84.8) < 1.3 && z > 352 && z < 368) || (x > -85 && z > 364)) return; DATA.cars.push([x * UNIT, z * UNIT, turn]) }
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

// --- Anastasia Plaza ("publick"), final frame ------------------------------------
const PLAZA: [number, number][] = [[-102.7, 345.9], [-100.5, 355.3], [-92.5, 383.5], [-85, 383.6], [-84.8, 382.2], [-76.4, 354.5], [-71.6, 339.2], [-71.4, 336.1], [-73.7, 335.7], [-94.7, 336.3]]
const inPoly = (x: number, z: number, grow = 0) => {
  let hit = false
  for (let i = 0, j = PLAZA.length - 1; i < PLAZA.length; j = i++) {
    const [xi, zi] = PLAZA[i], [xj, zj] = PLAZA[j]
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) hit = !hit
  }
  if (hit || !grow) return hit
  return PLAZA.some(([px, pz], i) => { const [qx, qz] = PLAZA[(i + 1) % PLAZA.length]; return segDist(x, z, px, pz, qx, qz) < grow })
}
function segDist(x: number, z: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)))
  return Math.hypot(x - ax - dx * t, z - az - dz * t)
}
mode = 'final'
thin = true
buildAnastasiaPlaza(kit)
thin = false

// The Square K at the south tip, and a paved pad joining it to the plaza.
buildA1aSouthShops(kit)
// The wedge between the two A1As narrows to a point south of the pumps.
const STATION: [number, number][] = [[-92.2, 381.5], [-85.2, 381.5], [-85.2, 392.7], [-87.6, 397.3], [-89.4, 397.3], [-92.0, 392.0]]
const inStation = (x: number, z: number) => {
  let hit = false
  for (let i = 0, j = STATION.length - 1; i < STATION.length; j = i++) {
    const [xi, zi] = STATION[i], [xj, zj] = STATION[j]
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) hit = !hit
  }
  return hit
}
box('ground', '#80868a', -88.1, .0475, 389.45, 8.2, .03, 16.1) // tops staggered a hair so overlapping paving doesn't flicker
// Palms on the grass at the very tip, where the welcome sign stands.
for (const [px, pz, sd] of [[-88.3, 398.1, 11], [-87.3, 399.0, 12], [-86.2, 397.4, 15], [-85.6, 396.4, 16]]) plants.palm(px, pz, sd, false)

// Construction barriers wall the drivable wedge in: concrete with an orange cap, and barrels.
const wallRun = (ax: number, az: number, bx: number, bz: number) => {
  const len = Math.hypot(bx - ax, bz - az), turn = Math.atan2(bx - ax, bz - az)
  // Stand the barrier just outside the line the cars stop at.
  const out = -side((ax + bx) / 2, (az + bz) / 2, turn) * .16, cx = (ax + bx) / 2 + Math.cos(turn) * out, cz = (az + bz) / 2 - Math.sin(turn) * out
  // The game collides with exactly what is drawn.
  DATA.walls.push([cx * UNIT, cz * UNIT, Math.sin(turn), Math.cos(turn), (len / 2 + .05) * UNIT])
  box('architecture', '#c9c7bd', cx, .14, cz, .16, .2, len + .1, turn)
  box('architecture', '#b9b7ad', cx, .05, cz, .26, .08, len + .1, turn)
  box('architecture', '#ee6a1a', cx, .255, cz, .1, .03, len + .1, turn)
  for (let d = .8; d < len; d += 3.1) {
    const x = ax + (bx - ax) * d / len, z = az + (bz - az) * d / len
    DATA.barrels.push([(x - Math.cos(turn) * out * 1.7) * UNIT, (z + Math.sin(turn) * out * 1.7) * UNIT]) // the game builds these, inside the wall, so cars can knock them over
  }
}
// A tall concrete curb with a sidewalk on the road side: enough to stop a car, without the construction look.
const curbRun = (ax: number, az: number, bx: number, bz: number, force = 0) => {
  const len = Math.hypot(bx - ax, bz - az), turn = Math.atan2(bx - ax, bz - az)
  const o = force || -side((ax + bx) / 2, (az + bz) / 2, turn), at = (d: number) => [(ax + bx) / 2 + Math.cos(turn) * o * d, (az + bz) / 2 - Math.sin(turn) * o * d]
  const [cx, cz] = at(.1), [sx, sz] = at(.45)
  DATA.walls.push([cx * UNIT, cz * UNIT, Math.sin(turn), Math.cos(turn), (len / 2 + .05) * UNIT])
  box('architecture', '#bdbab0', cx, .1, cz, .14, .15, len + .1, turn)
  box('architecture', '#d2cfc5', cx, .178, cz, .15, .012, len + .1, turn)
  box('ground', '#c4c1b6', sx, .062, sz, .52, .03, len + .1, turn)
  for (let d = .3; d < len; d += .45) { const x = ax + (bx - ax) * d / len + Math.cos(turn) * o * .45, z = az + (bz - az) * d / len - Math.sin(turn) * o * .45; box('ground', '#a9a69c', x, .0645, z, .52, .03, .012, turn) }
}
/** +1 or -1: which side of a wall run is inside the arena (barrels go there). */
function side(cx: number, cz: number, turn: number) {
  const nx = Math.cos(turn), nz = -Math.sin(turn), inA = (x: number, z: number) => inPoly(x, z) || inStation(x, z)
  return inA(cx + nx * .5, cz + nz * .5) ? 1 : -1
}
PLAZA.forEach(([ax, az], i) => { if (i <= 5) return; const [bx, bz] = PLAZA[(i + 1) % PLAZA.length]; wallRun(ax, az, bx, bz) })
// The east edge, with a gap at the plaza's entrance from A1A Beach Blvd.

// (the tip is curbed all round now; the station pad runs on to the palms)
// The neighbors' street (Floridian Ave): a barrier at its west end. Rosewood St, the cross street, is left out.
// A visible wall all the way round the west side: along the far edge of A1A S from the parade block,
// behind the neighbors' houses, across the street's west end, back along the fronts of the houses
// opposite, and down to the road block south of the gas station.
{
  const W0: [number, number][] = [[-108.55, 341], [-107.02, 346.83], [-104.6, 357.12], [-102.7, 365.1], [-99.5, 378.85], [-98.7, 382.6], [-96.95, 390.15], [-95.35, 397.2], [-121.1, 397.2], [-121.1, 406.1], [-101.5, 406.1], [-101.5, 414.6], [-91.2, 414.6], [-90.9, 416.8], [-83.2, 416.5]] // down A1A S, round the neighborhood, and across the road south of the tip
  const W = W0
  ;(DATA as any).treeRuns = []
  for (let i = 0; i + 1 < W.length; i++) {
    const [ax, az] = W[i], [bx, bz] = W[i + 1]
    if (i > 11) { wallRun(ax, az, bx, bz); continue }
    if (i < 7) { // along A1A S the trees and houses are the barrier: nothing drawn, just the edge you can't pass
      const len = Math.hypot(bx - ax, bz - az), turn = Math.atan2(bx - ax, bz - az)
      DATA.walls.push([(ax + bx) / 2 * UNIT, (az + bz) / 2 * UNIT, Math.sin(turn), Math.cos(turn), (len / 2 + .05) * UNIT]); continue }
    // Round the neighborhood and the bank it's a wall of trees: the game plants them, this is only what you bump into.
    const len = Math.hypot(bx - ax, bz - az), turn = Math.atan2(bx - ax, bz - az)
    DATA.walls.push([(ax + bx) / 2 * UNIT, (az + bz) / 2 * UNIT, Math.sin(turn), Math.cos(turn), (len / 2 + .05) * UNIT])
    ;(DATA as any).treeRuns.push([ax * UNIT, az * UNIT, bx * UNIT, bz * UNIT])
  }
}
// A wall down the lot's west side, from publick to the Square K: no cutting in from A1A S.
// You have to come in past the gas station.
curbRun(-102.7, 345.9, -101.99, 348.95); curbRun(-101.37, 351.6, -100.5, 355.3); // gap for the picnic tables
curbRun(-100.5, 355.3, -92.15, 392.0, -1); curbRun(-92.15, 392.0, -90.65, 398.6, -1) // one straight curb, parallel to the road, all the way to the tip // ...ending at the north edge of the Square K building, so Bumpkin's drive-thru is open from the west
// Road closed across A1A S too, at the same two places.
wallRun(-108.6, 340.2, -99.9, 342.54) // the west block runs right up to the lot's corner barrier
// East side of the station: open at the pumps' exit to A1A Beach Blvd.

// Road closed: across A1A Beach Blvd south of the gas station, and north of the plaza.
wallRun(-71.1, 338.95, -68.7, 339.65)
// The station is shut off from A1A S, and the tip with the welcome sign is fenced: the only way in is from A1A Beach Blvd.
{ // the wedge of lot the straight curb takes in, paved
  const g = new BufferGeometry(); g.setAttribute('position', new BufferAttribute(new Float32Array([-100.5, .0462, 355.3, -92.15, .0462, 392.0, -92.4, .0462, 383.5]), 3)); g.computeVertexNormals(); add('ground', g, '#737b7c', 0, 0, 0) } // the boulevard side of the tip is open
// Driveway aprons across the grass at both openings.
box('ground', '#80868a', -84.4, .02, 391.3, 2.4, .03, 2.8); box('ground', '#80868a', -74.9, .053, 352.1, 2.6, .03, 2.8) // the first sits just under the station pad where they overlap

// The neighborhood street's last stretch, out to A1A S.
box('ground', '#737b7c', -93.1, .041, 389.3 + HS[1], 4.6, .03, 1.55)
// The streets and neighbors around it, from the town's OSM data.
const X0 = -110, X1 = -64, Zs = 328, Zn = 402
const near = (x: number, z: number) => x > X0 && x < X1 && z > Zs && z < Zn
const roads: number[][] = []
// Each road is one smooth ribbon (mitred at the bends, skirted at the edges) instead of overlapping boxes, so no notches or flicker.
const ribbon = (pts: number[][], half: number, y: number, ext: number) => {
  const n = pts.length, dir = (a: number[], b: number[]) => { const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l] }
  const P = pts.map((p) => p.slice()), d0 = dir(P[0], P[1]), d1 = dir(P[n - 2], P[n - 1])
  P[0] = [P[0][0] - d0[0] * ext, P[0][1] - d0[1] * ext]; P[n - 1] = [P[n - 1][0] + d1[0] * ext, P[n - 1][1] + d1[1] * ext]
  const L: number[][] = [], R: number[][] = []
  for (let i = 0; i < n; i++) {
    const a = i > 0 ? dir(P[i - 1], P[i]) : null, b = i < n - 1 ? dir(P[i], P[i + 1]) : null
    const na = a ? [a[1], -a[0]] : null, nb = b ? [b[1], -b[0]] : null
    let m = na && nb ? [na[0] + nb[0], na[1] + nb[1]] : (na || nb)!, ml = Math.hypot(m[0], m[1]) || 1; m = [m[0] / ml, m[1] / ml]
    const k = half / Math.max(.45, m[0] * (na || nb)![0] + m[1] * (na || nb)![1])
    L.push([P[i][0] + m[0] * k, P[i][1] + m[1] * k]); R.push([P[i][0] - m[0] * k, P[i][1] - m[1] * k])
  }
  const v: number[] = [], tri = (A: number[], B: number[], C: number[], up: number[]) => {
    const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], wx = C[0] - A[0], wy = C[1] - A[1], wz = C[2] - A[2]
    const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx
    if (nx * up[0] + ny * up[1] + nz * up[2] < 0) v.push(...A, ...C, ...B); else v.push(...A, ...B, ...C)
  }
  const y0 = y - .03
  for (let i = 0; i + 1 < n; i++) {
    const a = [L[i][0], y, L[i][1]], b = [R[i][0], y, R[i][1]], c = [L[i + 1][0], y, L[i + 1][1]], d = [R[i + 1][0], y, R[i + 1][1]]
    tri(a, b, c, [0, 1, 0]); tri(b, d, c, [0, 1, 0])
    for (const [p, q, s] of [[L[i], L[i + 1], 1], [R[i], R[i + 1], -1]] as [number[], number[], number][]) {
      const dd = dir(p, q), out = [dd[1] * s, 0, -dd[0] * s], A = [p[0], y, p[1]], B = [q[0], y, q[1]], C = [p[0], y0, p[1]], D = [q[0], y0, q[1]]
      tri(A, B, C, out); tri(B, D, C, out)
    }
  }
  const g = new BufferGeometry(); g.setAttribute('position', new BufferAttribute(new Float32Array(v), 3)); g.computeVertexNormals(); return g
}
let chainN = 0
for (const r of PONCE_ROADS) {
  let cur: number[][] | null = null
  const flush = () => { if (cur && cur.length > 1) add('ground', ribbon(cur, r.w * .75, .044 + (chainN++ % 4) * .003, r.w / 2), '#737b7c', 0, 0, 0); cur = null }
  const pt = (p: number[]) => p
  for (let i = 0; i + 1 < r.p.length; i++) {
    const [ax, az] = pt(r.p[i]), [bx, bz] = pt(r.p[i + 1]), mx = (ax + bx) / 2, mz = (az + bz) / 2
    if (!(near(mx, mz) || (mz >= Zn && mz < 419 && mx > -95 && mx < -78)) || inPoly(mx, mz) || inStation(mx, mz) || inHood(mx, mz) || (r.w === 1.2 && mz > 336 && mz < 407 && mx < -86) || (r.w === 1 && mz > 394 && mx < -82.5 && mx > -91) || (r.w === 1.5 && mz > 403.9 && mx < -84.5)) { flush(); continue } // A1A S is redrawn; no slip roads round the tip
    if (!cur) cur = [[ax, az]]
    cur.push([bx, bz])
    roads.push([ax, az, bx, bz, r.w])
  }
  flush()
}
add('ground', ribbon(A1A_S, 1.5, .044, .4), '#737b7c', 0, 0, 0)
for (let i = 0; i + 1 < A1A_S.length; i++) roads.push([...A1A_S[i], ...A1A_S[i + 1], 2.0])
// Asphalt right up to the plaza's curb: no grass strip between the road and the sidewalk.
add('ground', ribbon(A1A_S.filter(([, z]) => z > 345).map(([x, z]) => [x + 1.75, z]).filter(([, z]) => z < 401), .85, .040, 0), '#737b7c', 0, 0, 0)
// No hook round the tip: A1A Beach Blvd runs on south and meets A1A S in front of the surf shop.
{ const C = [[-84.1, 403.6], [-84.8, 405.6], [-85.6, 407.8], [-86.6, 410], [-87.9, 412.2], [-89.3, 414.2]]
  add('ground', ribbon(C, 1.125, .046, .3), '#737b7c', 0, 0, 0)
  for (let i = 0; i + 1 < C.length; i++) roads.push([...C[i], ...C[i + 1], 1.5]) }
const houses: number[][] = []
const paints = ['#e9dcc0', '#d7c7a6', '#cfd8d2', '#e6d2b8', '#c9d3d8', '#e2c9a0']
PONCE_HOUSES.forEach(([x, z, w, d, deg, storeys], i) => {
  if (inHood(x, z)) return // the map's own detailed homes stand here
  if (!near(x, z) || inPoly(x, z, 1) || handBuiltA1aShop(x, z) || (x > -93.5 && x < -83 && z > 380 && z < 401)) return
  const h = (storeys ?? 1) * .78, turn = -deg * Math.PI / 180
  box('architecture', paints[i % paints.length], x, h / 2 + .02, z, w, h, d, turn)
  box('roof', i % 2 ? '#7a5846' : '#8d9596', x, h + .06, z, w + .12, .1, d + .12, turn)
  houses.push([x, z, Math.max(w, d) / 2 + .6])
})
let planted = 0
for (let x = X0 + 3; x < X1; x += 6.2) for (let z = Zs + 3; z < Zn; z += 6.6) {
  const s = Math.round(x * 17 + z * 5), px = x + (rand(s) - .5) * 2.6, pz = z + (rand(s + 9) - .5) * 2.6
  if ((inHood(px, pz) && pz > 386.5 && pz < 392.5) || inPoly(px, pz, 1.2) || (px > -93.6 && px < -82.6 && pz > 380 && pz < 401.5) || houses.some(([hx, hz, r]) => Math.hypot(px - hx, pz - hz) < r)) continue
  if (roads.some(([ax, az, bx, bz, w]) => segDist(px, pz, ax, az, bx, bz) < w + .7)) continue
  rand(s + 3) > .7 ? palm(px, pz, s, false) : tree(px, pz, s, .9 + rand(s + 4) * .5)
  planted++
}
;(DATA as any).roads = roads.map((r) => r.map((v) => +(v * UNIT).toFixed(2)))
console.log('roads', roads.length, 'houses', houses.length, 'plants', planted, 'parked', DATA.cars.length, 'palms', DATA.palms.length, 'poles', DATA.poles.length)

// The real neighborhood west of A1A S, from the map's own builder: homes with windows and doors,
// drives, mailboxes, streets and oaks. Only the part around Floridian Ave is kept.
wb = true
buildWestBlocks(kit)
wb = false
// Footprints of the neighborhood's homes, so the game can let cars cut through the yards but not the houses.
DATA.homes.push([FARMERS.x * UNIT, FARMERS.z * UNIT, FARMERS.hw * 2 * UNIT, FARMERS.hd * 2 * UNIT, FARMERS.t])

// Shoppers on the walk along the grocery front and under the north arcade.
const crowd: BeachPerson[] = []
const outfits = ['tee-shorts', 'tank-shorts', 'one-piece', 'tee-shorts', 'tank-shorts'] as const
const gt = Math.atan2(.8, .6), gc = Math.cos(gt), gs = Math.sin(gt)
let seed = 900
for (let i = 0; i < 8; i++) {
  const s = seed++, lx = -5.4 + i * 1.45 + (rand(s) - .5) * .3, lz = 4.8 + .28 + rand(s + 2) * .3
  if (Math.abs(lx + .6) < 1.9 && lz < 5.5) continue
  crowd.push({ id: `shop-${s}`, seed: s, outfit: outfits[s % outfits.length], x: -93.41 + lx * gc + lz * gs, z: 345.63 - lx * gs + lz * gc, pose: i % 3 === 0 ? 'walk' : 'chat', heading: gt + (rand(s + 3) - .5) * 2.4, y: .05 })
}
for (let i = 0; i < 3; i++) {
  const s = seed++
  crowd.push({ id: `arcade-${s}`, seed: s, outfit: outfits[s % outfits.length], x: -86.6 + i * 3.6 + (rand(s) - .5) * .4, z: 341.1 + (rand(s + 1) - .5) * .3, pose: i % 2 ? 'chat' : 'walk', heading: (rand(s + 3) - .5) * 2.6, y: .09 })
}
for (const p of crowd) buildBeachPerson({ box, add, pole } as any, p)
DATA.arcade = crowd.filter((p) => p.id.startsWith('arcade')).map((p) => [p.x * UNIT, p.z * UNIT])

// Every shopper gets a buggy: a gray basket on a frame, a green handle, a bag or two in it.
const bags = ['#a57a4a', '#d8332c', '#f2c521', '#46a04f', '#e8742c', '#f4f2ea']
crowd.forEach((p, i) => {
  const h = p.heading, c = Math.cos(h), sn = Math.sin(h), y0 = p.y ?? .05
  const at = (lx: number, lz: number) => [p.x + lx * c + lz * sn, p.z - lx * sn + lz * c] as const
  const part = (layer: Layer, color: string, lx: number, y: number, lz: number, w: number, hh: number, d: number) => { const [x, z] = at(lx, lz); box(layer, color, x, y0 + y, z, w, hh, d, h) }
  const z0 = .2 // the basket's middle, ahead of the shopper
  part('wood', '#b9bdc1', 0, .185, z0, .13, .012, .2)                 // basket floor
  for (const e of [-1, 1]) part('wood', '#c9cdd0', e * .062, .225, z0, .008, .08, .2)
  part('wood', '#c9cdd0', 0, .225, z0 + .098, .13, .08, .008)
  part('wood', '#c9cdd0', 0, .225, z0 - .098, .13, .08, .008)
  part('wood', '#8f9498', 0, .09, z0, .11, .012, .19)                 // lower rack
  for (const e of [-1, 1]) for (const v of [-1, 1]) {
    part('wood', '#8f9498', e * .055, .13, z0 + v * .085, .01, .1, .01)
    part('wood', '#2a2d30', e * .055, .03, z0 + v * .085, .014, .035, .035)
  }
  part('wood', '#2f8f3a', 0, .265, z0 - .115, .14, .014, .014)        // handle
  part('wood', bags[i % bags.length], -.02, .235, z0 + .03, .06, .07, .07)
  if (i % 2) part('wood', bags[(i + 3) % bags.length], .03, .225, z0 - .04, .05, .05, .06)
})

DATA.homes = DATA.homes.filter(([x, z]) => !hoodCut(x / UNIT, z / UNIT)).map(([x, z, ...r]) => [x + HS[0] * UNIT, z + HS[1] * UNIT, ...r])
DATA.drives = DATA.drives.map(([x, z, ...r]) => [x + HS[0] * UNIT, z + HS[1] * UNIT, ...r])
fs.writeFileSync('src/plaza-data.json', JSON.stringify({ unit: UNIT, plaza: PLAZA.map(([x, z]) => [x * UNIT, z * UNIT]), station: STATION.map(([x, z]) => [x * UNIT, z * UNIT]), ...DATA }, (_k, v) => typeof v === 'number' ? Math.round(v * 1000) / 1000 : v))
const Z0 = Zs, Z1 = 420

// --- crop to about three blocks, merge per layer, write meters --------------------
const keep = (g: BufferGeometry) => {
  g.computeBoundingBox(); const b = g.boundingBox!
  const cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2
  if (g.userData.wb) {
    // Rosewood St is not part of the game: drop its pavement either side of Floridian Ave.
    const rose = [[-105.3, 395.86], [-106.85, 389.11], [-108.68, 381.96], [-110.02, 377.49], [-111.21, 372.37]]
    if (g.userData.layer === 'ground' && Math.abs(cz - 389.2) > 1.3 && rose.some((a, i) => i + 1 < rose.length && segDist(cx, cz, a[0], a[1], rose[i + 1][0], rose[i + 1][1]) < .8)) return false
    if (!inHood(cx, cz) || hoodCut(cx, cz)) return false
    if (g.userData.layer !== 'architecture' && g.userData.layer !== 'roof' && g.userData.layer !== 'ground' && cz > 390.2 && cx > -104.2) return false // no half-trees left over where the bank's block was cut away
    g.translate(HS[0], 0, HS[1]); return true
  }
  if ((g.userData.layer === 'foliage' || g.userData.layer === 'wood') && cx > -101 && cx < -92.8 && cz > 395.5 && cz < 404.8) return false // the old bank lot's trees don't come along (or stay in the street)
  if (cx > -99.5 && cx < -94.2 && cz > 396.9 && cz < 403.4) g.translate(BANK_MOVE[0], 0, BANK_MOVE[1])
  return cz > Z0 - 1 && cz < Z1 + 1 && cx > X0 - 1 && cx < X1 + 1
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
const out = process.argv[2] ?? '/tmp/plaza-raw.glb'
new GLTFExporter().parse(scene, (glb) => { fs.writeFileSync(out, Buffer.from(glb as ArrayBuffer)); console.log('wrote', out, (fs.statSync(out).size / 1e6).toFixed(2), 'MB') },
  (e) => { throw e }, { binary: true })
