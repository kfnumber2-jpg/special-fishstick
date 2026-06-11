// Deterministic infinite Backrooms map generator.
// Imported by BOTH the browser client (rendering + player collision) and the
// Node game server (creature AI + pickup placement), so the same seed yields
// the exact same endless maze everywhere. No state other than a chunk cache.

export const CELL = 4 // world units per grid cell
export const WALL_H = 3.4 // wall / ceiling height
export const CHUNK = 16 // cells per chunk side

// --- hashing / prng ------------------------------------------------------

export function hash(a, b, c, d = 0) {
  let h = (a | 0) * 0x9e3779b1
  h = Math.imul(h ^ (b | 0), 0x85ebca77)
  h = Math.imul(h ^ (c | 0), 0xc2b2ae3d)
  h = Math.imul(h ^ (d | 0), 0x27d4eb2f)
  h ^= h >>> 15
  h = Math.imul(h, 0x735a2d97)
  h ^= h >>> 13
  return h >>> 0
}

export function mulberry32(seed) {
  let t = seed >>> 0
  return function () {
    t = (t + 0x6d2b79f5) | 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

// --- chunk generation -----------------------------------------------------

const chunkCache = new Map()
const MAX_CACHED_CHUNKS = 600

// Openings through the shared edge between two chunks. Both neighbours call
// this with the same canonical key, so they always agree on where the
// passages are. Returns local offsets (1..CHUNK-3) along that edge.
function edgeOpenings(seed, cx, cy, vertical) {
  const h = hash(seed, vertical ? 0x5ed6e : 0x7ed6e, cx, cy)
  const n = 1 + (h % 3) // 1-3 doorways per chunk edge
  const out = []
  for (let i = 0; i < n; i++) {
    out.push(1 + (hash(seed, h, i, vertical ? 11 : 13) % (CHUNK - 3)))
  }
  return out
}

function carve(cells, x, y, w, h) {
  for (let j = y; j < y + h; j++) {
    for (let i = x; i < x + w; i++) {
      if (i >= 0 && i < CHUNK && j >= 0 && j < CHUNK) cells[j * CHUNK + i] = 0
    }
  }
}

function fill(cells, x, y, w, h) {
  for (let j = y; j < y + h; j++) {
    for (let i = x; i < x + w; i++) {
      if (i >= 0 && i < CHUNK && j >= 0 && j < CHUNK) cells[j * CHUNK + i] = 1
    }
  }
}

// Carve an L-shaped corridor (width 2) between two points — this is what
// guarantees every doorway in a chunk connects to every other one.
function carveL(cells, x0, y0, x1, y1, bendFirst) {
  if (bendFirst) {
    carve(cells, Math.min(x0, x1), y0, Math.abs(x1 - x0) + 2, 2)
    carve(cells, x1, Math.min(y0, y1), 2, Math.abs(y1 - y0) + 2)
  } else {
    carve(cells, x0, Math.min(y0, y1), 2, Math.abs(y1 - y0) + 2)
    carve(cells, Math.min(x0, x1), y1, Math.abs(x1 - x0) + 2, 2)
  }
}

export function getChunk(seed, cx, cy) {
  const key = seed + ':' + cx + ',' + cy
  const hit = chunkCache.get(key)
  if (hit) return hit
  if (chunkCache.size > MAX_CACHED_CHUNKS) chunkCache.clear()

  const cells = new Uint8Array(CHUNK * CHUNK) // 0 open, 1 wall
  const rng = mulberry32(hash(seed, cx, cy, 0xbac0))

  // Solid border; doorways punched through below.
  fill(cells, 0, 0, CHUNK, 1)
  fill(cells, 0, CHUNK - 1, CHUNK, 1)
  fill(cells, 0, 0, 1, CHUNK)
  fill(cells, CHUNK - 1, 0, 1, CHUNK)

  // Interior style varies per chunk so the maze keeps surprising you:
  // open halls with freestanding wall slabs, dense twisty mazes, or
  // partitioned room blocks.
  const style = hash(seed, cx, cy, 0x57e) % 3
  if (style === 0) {
    // Open hall with pillars and slabs (the classic Level 0 look).
    const slabs = 5 + Math.floor(rng() * 5)
    for (let i = 0; i < slabs; i++) {
      const x = 2 + Math.floor(rng() * (CHUNK - 6))
      const y = 2 + Math.floor(rng() * (CHUNK - 6))
      const len = 2 + Math.floor(rng() * 4)
      if (rng() < 0.5) fill(cells, x, y, len, 1)
      else fill(cells, x, y, 1, len)
      if (rng() < 0.3) fill(cells, x, y, 2, 2) // chunky pillar
    }
  } else if (style === 1) {
    // Twisty maze: many short wall segments.
    const segs = 14 + Math.floor(rng() * 8)
    for (let i = 0; i < segs; i++) {
      const x = 1 + Math.floor(rng() * (CHUNK - 4))
      const y = 1 + Math.floor(rng() * (CHUNK - 4))
      const len = 2 + Math.floor(rng() * 5)
      if (rng() < 0.5) fill(cells, x, y, len, 1)
      else fill(cells, x, y, 1, len)
    }
  } else {
    // Room blocks with gaps in their perimeters.
    for (let r = 0; r < 3; r++) {
      const x = 1 + Math.floor(rng() * 7)
      const y = 1 + Math.floor(rng() * 7)
      const w = 4 + Math.floor(rng() * 5)
      const h = 4 + Math.floor(rng() * 5)
      fill(cells, x, y, w, 1)
      fill(cells, x, y + h - 1, w, 1)
      fill(cells, x, y, 1, h)
      fill(cells, x + w - 1, y, 1, h)
      carve(cells, x + 1 + Math.floor(rng() * (w - 2)), y, 1, 1)
      carve(cells, x, y + 1 + Math.floor(rng() * (h - 2)), 1, 1)
    }
  }

  // Doorways to the four neighbours. North/west edges belong to the edge key
  // of the lower-coordinate chunk pair so both sides agree.
  const hub = {
    x: 5 + (hash(seed, cx, cy, 0xb0b) % 6),
    y: 5 + (hash(seed, cy, cx, 0xb0b) % 6),
  }
  for (const o of edgeOpenings(seed, cx, cy - 1, false)) {
    carve(cells, o, 0, 2, 1)
    carveL(cells, o, 1, hub.x, hub.y, (o & 1) === 0)
  }
  for (const o of edgeOpenings(seed, cx, cy, false)) {
    carve(cells, o, CHUNK - 1, 2, 1)
    carveL(cells, o, CHUNK - 3, hub.x, hub.y, (o & 1) === 0)
  }
  for (const o of edgeOpenings(seed, cx - 1, cy, true)) {
    carve(cells, 0, o, 1, 2)
    carveL(cells, 1, o, hub.x, hub.y, (o & 1) === 1)
  }
  for (const o of edgeOpenings(seed, cx, cy, true)) {
    carve(cells, CHUNK - 1, o, 1, 2)
    carveL(cells, CHUNK - 3, o, hub.x, hub.y, (o & 1) === 1)
  }

  // Spawn sanctuary: a clear plaza at the centre of chunk (0,0).
  if (cx === 0 && cy === 0) carve(cells, 5, 5, 6, 6)

  chunkCache.set(key, cells)
  return cells
}

// --- queries --------------------------------------------------------------

export function isWall(seed, gx, gy) {
  const cx = Math.floor(gx / CHUNK)
  const cy = Math.floor(gy / CHUNK)
  const cells = getChunk(seed, cx, cy)
  return cells[(gy - cy * CHUNK) * CHUNK + (gx - cx * CHUNK)] === 1
}

export function worldToCell(v) {
  return Math.floor(v / CELL)
}

export function cellCenter(g) {
  return g * CELL + CELL / 2
}

// Spiral-search the nearest open cell to (gx, gy).
export function findOpenCell(seed, gx, gy) {
  if (!isWall(seed, gx, gy)) return [gx, gy]
  for (let r = 1; r < 24; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue
        if (!isWall(seed, gx + dx, gy + dy)) return [gx + dx, gy + dy]
      }
    }
  }
  return [gx, gy]
}

// Circle-vs-grid collision with axis-separated sliding. Returns final {x, z}.
export function moveWithCollision(seed, x, z, dx, dz, radius) {
  const tryAxis = (nx, nz) => {
    const minGx = worldToCell(nx - radius)
    const maxGx = worldToCell(nx + radius)
    const minGz = worldToCell(nz - radius)
    const maxGz = worldToCell(nz + radius)
    for (let gx = minGx; gx <= maxGx; gx++) {
      for (let gz = minGz; gz <= maxGz; gz++) {
        if (!isWall(seed, gx, gz)) continue
        const cx = Math.max(gx * CELL, Math.min(nx, gx * CELL + CELL))
        const cz = Math.max(gz * CELL, Math.min(nz, gz * CELL + CELL))
        if ((nx - cx) * (nx - cx) + (nz - cz) * (nz - cz) < radius * radius) {
          return false
        }
      }
    }
    return true
  }
  if (tryAxis(x + dx, z)) x += dx
  if (tryAxis(x, z + dz)) z += dz
  return { x, z }
}

// Grid DDA raycast — true if the straight line between the two points is
// unobstructed by walls. Used for creature line-of-sight.
export function hasLineOfSight(seed, x0, z0, x1, z1) {
  let gx = worldToCell(x0)
  let gz = worldToCell(z0)
  const gx1 = worldToCell(x1)
  const gz1 = worldToCell(z1)
  const dx = x1 - x0
  const dz = z1 - z0
  const stepX = dx > 0 ? 1 : -1
  const stepZ = dz > 0 ? 1 : -1
  let tMaxX = dx !== 0 ? ((gx + (dx > 0 ? 1 : 0)) * CELL - x0) / dx : Infinity
  let tMaxZ = dz !== 0 ? ((gz + (dz > 0 ? 1 : 0)) * CELL - z0) / dz : Infinity
  const tDeltaX = dx !== 0 ? Math.abs(CELL / dx) : Infinity
  const tDeltaZ = dz !== 0 ? Math.abs(CELL / dz) : Infinity
  for (let i = 0; i < 256; i++) {
    if (isWall(seed, gx, gz)) return false
    if (gx === gx1 && gz === gz1) return true
    if (tMaxX < tMaxZ) {
      tMaxX += tDeltaX
      gx += stepX
    } else {
      tMaxZ += tDeltaZ
      gz += stepZ
    }
  }
  return false
}
