// THE BACKROOMS — co-op game server.
// One process serves the built client (dist/) over HTTP and runs all game
// rooms over a websocket at /ws. The server is authoritative for creatures,
// tape pickups, damage, revives and the exit; clients are authoritative for
// their own movement (co-op game, no cheating incentive).

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { WebSocketServer } from 'ws'
import {
  cellCenter,
  findOpenCell,
  hasLineOfSight,
  isWall,
  moveWithCollision,
  worldToCell,
} from '../shared/mapgen.js'

const PORT = process.env.PORT || 8787
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(__dirname, '..', 'dist')

const TAPE_COUNT = 8
const MAX_PLAYERS = 4
const TICK_MS = 100
const SPAWN_POINT = { x: cellCenter(8), z: cellCenter(8) }

// --- rooms -----------------------------------------------------------------

const rooms = new Map()
let nextEntityId = 1

function makeRoomCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  let code
  do {
    code = Array.from({ length: 4 }, () => letters[(Math.random() * letters.length) | 0]).join('')
  } while (rooms.has(code))
  return code
}

// Flood-fill the open cells reachable from spawn so tapes and the exit are
// always placed somewhere the players can actually walk to.
function computeReachable(seed, radius) {
  const seen = new Map() // "x,y" -> distance in cells
  const q = [[8, 8, 0]]
  seen.set('8,8', 0)
  while (q.length) {
    const [x, y, d] = q.shift()
    if (d >= radius) continue
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx
      const ny = y + dy
      const k = nx + ',' + ny
      if (seen.has(k) || isWall(seed, nx, ny)) continue
      seen.set(k, d + 1)
      q.push([nx, ny, d + 1])
    }
  }
  return seen
}

function pickReachableCell(reachable, minDist, maxDist) {
  const candidates = []
  for (const [k, d] of reachable) {
    if (d >= minDist && d <= maxDist) candidates.push(k)
  }
  if (candidates.length === 0) return [8, 8]
  return candidates[(Math.random() * candidates.length) | 0].split(',').map(Number)
}

function createRoom(code) {
  const seed = (Math.random() * 0xffffffff) >>> 0
  const reachable = computeReachable(seed, 78)
  const room = {
    code,
    seed,
    reachable,
    players: new Map(),
    creatures: new Map(),
    tapes: [],
    tapesLeft: TAPE_COUNT,
    blackout: false,
    exit: null,
    over: false,
    spawnTimer: 0,
    emptySince: 0,
  }
  placeTapes(room)
  rooms.set(code, room)
  return room
}

function placeTapes(room) {
  room.tapes = []
  for (let i = 0; i < TAPE_COUNT; i++) {
    // Each tape sits in a deeper radius band, so the crew is pulled further
    // and further from the safe entrance.
    const band = 10 + i * 7
    const [gx, gy] = pickReachableCell(room.reachable, band, band + 6)
    const tape = { id: i, x: cellCenter(gx), z: cellCenter(gy), taken: false }
    room.tapes.push(tape)
    // Every tape has a crawler nesting on it, waiting.
    spawnCreature(room, 'crawler', tape.x, tape.z, { tape: i, state: 'hide' })
  }
}

// --- creatures ---------------------------------------------------------------

const CREATURE_KINDS = ['hound', 'smiler', 'skinstealer', 'watcher']

function spawnCreature(room, kind, x, z, extra = {}) {
  const c = {
    id: nextEntityId++,
    kind,
    x,
    z,
    yaw: Math.random() * Math.PI * 2,
    state: 'wander',
    stateT: 0,
    attackCd: 0,
    wx: x,
    wz: z,
    gaze: 0,
    ...extra,
  }
  room.creatures.set(c.id, c)
  return c
}

function alivePlayers(room) {
  return [...room.players.values()].filter((p) => !p.down)
}

function nearestPlayer(room, x, z) {
  let best = null
  let bestD = Infinity
  for (const p of alivePlayers(room)) {
    const d = (p.x - x) ** 2 + (p.z - z) ** 2
    if (d < bestD) {
      bestD = d
      best = p
    }
  }
  return best ? { p: best, dist: Math.sqrt(bestD) } : null
}

function wander(room, c, speed, dt) {
  const dx = c.wx - c.x
  const dz = c.wz - c.z
  if (dx * dx + dz * dz < 1 || c.stateT > 8) {
    const gx = worldToCell(c.x) + ((Math.random() * 17) | 0) - 8
    const gz = worldToCell(c.z) + ((Math.random() * 17) | 0) - 8
    const [ox, oz] = findOpenCell(room.seed, gx, gz)
    c.wx = cellCenter(ox)
    c.wz = cellCenter(oz)
    c.stateT = 0
  }
  stepToward(room, c, c.wx, c.wz, speed, dt)
}

function stepToward(room, c, tx, tz, speed, dt) {
  const dx = tx - c.x
  const dz = tz - c.z
  const d = Math.hypot(dx, dz)
  if (d < 0.01) return
  c.yaw = Math.atan2(dx, dz)
  const before = { x: c.x, z: c.z }
  const moved = moveWithCollision(room.seed, c.x, c.z, (dx / d) * speed * dt, (dz / d) * speed * dt, 0.5)
  c.x = moved.x
  c.z = moved.z
  // Stuck against a wall while chasing: nudge along the wall by retargeting
  // through an adjacent open cell so creatures keep flowing around corners.
  if (Math.hypot(c.x - before.x, c.z - before.z) < speed * dt * 0.2) {
    const gx = worldToCell(c.x)
    const gz = worldToCell(c.z)
    const options = [[gx + 1, gz], [gx - 1, gz], [gx, gz + 1], [gx, gz - 1]].filter(
      ([a, b]) => !isWall(room.seed, a, b)
    )
    if (options.length) {
      const [ox, oz] = options[(Math.random() * options.length) | 0]
      const slide = moveWithCollision(
        room.seed,
        c.x,
        c.z,
        (cellCenter(ox) - c.x) * 0.2,
        (cellCenter(oz) - c.z) * 0.2,
        0.5
      )
      c.x = slide.x
      c.z = slide.z
    }
  }
}

function tryAttack(room, c, target, dist, range, damage) {
  if (dist > range || c.attackCd > 0 || target.down) return false
  c.attackCd = 1.2
  target.hp = Math.max(0, target.hp - damage)
  send(target, { t: 'hit', hp: target.hp, by: c.kind })
  if (target.hp <= 0) {
    target.down = true
    broadcast(room, { t: 'down', id: target.id, by: c.kind })
    checkWipe(room)
  }
  return true
}

// True when the target player's flashlight pins this creature in place:
// light on, creature in front of them, and nothing in between.
function caughtInBeam(room, c, p) {
  if (!p.light) return false
  const dx = c.x - p.x
  const dz = c.z - p.z
  const dist = Math.hypot(dx, dz)
  if (dist > 26) return false
  const toCreature = Math.atan2(dx, dz)
  let diff = toCreature - p.yaw
  while (diff > Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  if (Math.abs(diff) > 0.6) return false
  return hasLineOfSight(room.seed, p.x, p.z, c.x, c.z)
}

function tickCreature(room, c, dt) {
  c.stateT += dt
  c.attackCd = Math.max(0, c.attackCd - dt)
  const near = nearestPlayer(room, c.x, c.z)

  switch (c.kind) {
    case 'hound': {
      // Fast pack predator: patrols until it sees you, then runs you down.
      if (near && near.dist < 30 && hasLineOfSight(room.seed, c.x, c.z, near.p.x, near.p.z)) {
        c.state = 'chase'
        stepToward(room, c, near.p.x, near.p.z, 5.4, dt)
        tryAttack(room, c, near.p, near.dist, 1.4, 25)
      } else if (c.state === 'chase' && near && near.dist < 45) {
        // Lost sight: keep hunting toward last position for a while.
        stepToward(room, c, near.p.x, near.p.z, 4.0, dt)
        if (c.stateT > 6) c.state = 'wander'
      } else {
        c.state = 'wander'
        wander(room, c, 2.2, dt)
      }
      break
    }
    case 'smiler': {
      // Only exists in the dark. Freezes while a flashlight beam holds it,
      // closes terrifyingly fast the moment the light slips away.
      if (!near) {
        wander(room, c, 1.5, dt)
        break
      }
      const pinned = caughtInBeam(room, c, near.p)
      c.state = pinned ? 'frozen' : near.dist < 42 ? 'stalk' : 'wander'
      if (c.state === 'stalk') {
        stepToward(room, c, near.p.x, near.p.z, 6.6, dt)
        tryAttack(room, c, near.p, near.dist, 1.3, 35)
      } else if (c.state === 'wander') {
        wander(room, c, 1.5, dt)
      }
      break
    }
    case 'skinstealer': {
      // From a distance it looks like a fourth teammate. Don't approach.
      if (c.state === 'reveal') {
        if (near) {
          stepToward(room, c, near.p.x, near.p.z, 7.6, dt)
          if (tryAttack(room, c, near.p, near.dist, 1.4, 30)) {
            c.state = 'flee'
            c.stateT = 0
          }
        }
        if (c.stateT > 5) {
          c.state = 'mimic'
          c.stateT = 0
        }
      } else if (c.state === 'flee') {
        if (near) stepToward(room, c, c.x * 2 - near.p.x, c.z * 2 - near.p.z, 5.5, dt)
        if (c.stateT > 4) {
          c.state = 'mimic'
          c.stateT = 0
        }
      } else {
        c.state = 'mimic'
        wander(room, c, 1.6, dt)
        if (near && near.dist < 7) {
          c.state = 'reveal'
          c.stateT = 0
          broadcast(room, { t: 'reveal', id: c.id })
        }
      }
      break
    }
    case 'watcher': {
      // A still silhouette at the edge of the light. Stare too long and it
      // is suddenly right behind you.
      c.state = 'still'
      for (const p of alivePlayers(room)) {
        const dx = c.x - p.x
        const dz = c.z - p.z
        const dist = Math.hypot(dx, dz)
        if (dist < 36 && dist > 2) {
          let diff = Math.atan2(dx, dz) - p.yaw
          while (diff > Math.PI) diff -= Math.PI * 2
          while (diff < -Math.PI) diff += Math.PI * 2
          const staring = Math.abs(diff) < 0.18 && hasLineOfSight(room.seed, p.x, p.z, c.x, c.z)
          if (staring) {
            c.gaze += dt
            if (c.gaze > 1.4) {
              // Teleport behind the starer.
              const bx = p.x - Math.sin(p.yaw) * 4
              const bz = p.z - Math.cos(p.yaw) * 4
              const [gx, gz] = findOpenCell(room.seed, worldToCell(bx), worldToCell(bz))
              c.x = cellCenter(gx)
              c.z = cellCenter(gz)
              c.gaze = 0
              send(p, { t: 'whisper' })
            }
          }
        }
        if (dist < 1.6) {
          tryAttack(room, c, p, dist, 1.6, 20)
          room.creatures.delete(c.id) // dissolves after one touch
          return
        }
      }
      break
    }
    case 'crawler': {
      // Nests on a tape. Grabbing the tape (or getting close) wakes it.
      if (c.state === 'hide') {
        if (near && near.dist < 3) {
          c.state = 'burst'
          c.stateT = 0
          broadcast(room, { t: 'ambush', id: c.id })
        }
      } else if (c.state === 'burst') {
        if (near) {
          stepToward(room, c, near.p.x, near.p.z, 7.2, dt)
          tryAttack(room, c, near.p, near.dist, 1.3, 20)
        }
        if (c.stateT > 8) room.creatures.delete(c.id)
      }
      break
    }
  }
}

function tickRoom(room, dt) {
  if (room.over) return
  for (const c of [...room.creatures.values()]) tickCreature(room, c, dt)

  // Ambient spawner: the deeper the run (more tapes taken), the more things
  // are awake. Blackout doubles down — escaping is meant to be the hard part.
  room.spawnTimer -= dt
  if (room.spawnTimer <= 0) {
    room.spawnTimer = 4
    const taken = TAPE_COUNT - room.tapesLeft
    const cap = 3 + taken + (room.blackout ? 5 : 0)
    const roaming = [...room.creatures.values()].filter((c) => c.kind !== 'crawler').length
    const players = alivePlayers(room)
    if (roaming < cap && players.length > 0) {
      const p = players[(Math.random() * players.length) | 0]
      const ang = Math.random() * Math.PI * 2
      const dist = 30 + Math.random() * 20
      const [gx, gz] = findOpenCell(
        room.seed,
        worldToCell(p.x + Math.sin(ang) * dist),
        worldToCell(p.z + Math.cos(ang) * dist)
      )
      const kind = CREATURE_KINDS[(Math.random() * CREATURE_KINDS.length) | 0]
      spawnCreature(room, kind, cellCenter(gx), cellCenter(gz))
    }
  }
}

function checkWipe(room) {
  if (room.players.size > 0 && alivePlayers(room).length === 0) {
    room.over = true
    broadcast(room, { t: 'wipe' })
    setTimeout(() => resetRoom(room), 6000)
  }
}

function resetRoom(room) {
  room.creatures.clear()
  room.tapesLeft = TAPE_COUNT
  room.blackout = false
  room.exit = null
  room.over = false
  placeTapes(room)
  for (const p of room.players.values()) {
    p.hp = 100
    p.down = false
    p.x = SPAWN_POINT.x
    p.z = SPAWN_POINT.z
  }
  broadcast(room, {
    t: 'reset',
    tapes: room.tapes.map((tp) => ({ id: tp.id, x: tp.x, z: tp.z })),
    spawn: SPAWN_POINT,
  })
}

// --- networking --------------------------------------------------------------

function send(p, msg) {
  if (p.ws.readyState === 1) p.ws.send(JSON.stringify(msg))
}

function broadcast(room, msg) {
  const s = JSON.stringify(msg)
  for (const p of room.players.values()) {
    if (p.ws.readyState === 1) p.ws.send(s)
  }
}

function snapshot(room) {
  return {
    t: 'snap',
    players: [...room.players.values()].map((p) => ({
      id: p.id,
      n: p.name,
      x: +p.x.toFixed(2),
      z: +p.z.toFixed(2),
      yaw: +p.yaw.toFixed(2),
      hp: p.hp,
      down: p.down,
      light: p.light,
    })),
    creatures: [...room.creatures.values()]
      .filter((c) => !(c.kind === 'crawler' && c.state === 'hide'))
      .map((c) => ({
        id: c.id,
        k: c.kind,
        x: +c.x.toFixed(2),
        z: +c.z.toFixed(2),
        yaw: +c.yaw.toFixed(2),
        s: c.state,
      })),
  }
}

function handleMessage(room, p, msg) {
  switch (msg.t) {
    case 'state': {
      if (p.down) break
      if (typeof msg.x === 'number' && typeof msg.z === 'number') {
        p.x = msg.x
        p.z = msg.z
        p.yaw = +msg.yaw || 0
        p.light = !!msg.light
      }
      break
    }
    case 'grab': {
      const tape = room.tapes[msg.tape]
      if (!tape || tape.taken || p.down) break
      if (Math.hypot(tape.x - p.x, tape.z - p.z) > 3) break
      tape.taken = true
      room.tapesLeft--
      // Grabbing a tape wakes its crawler even if you kept your distance.
      for (const c of room.creatures.values()) {
        if (c.kind === 'crawler' && c.tape === tape.id && c.state === 'hide') {
          c.state = 'burst'
          c.stateT = 0
          broadcast(room, { t: 'ambush', id: c.id })
        }
      }
      broadcast(room, { t: 'tape', id: tape.id, by: p.id, left: room.tapesLeft })
      if (room.tapesLeft === 0) startBlackout(room)
      break
    }
    case 'revive': {
      const target = room.players.get(msg.target)
      if (!target || !target.down || p.down) break
      if (Math.hypot(target.x - p.x, target.z - p.z) > 3) break
      target.down = false
      target.hp = 50
      broadcast(room, { t: 'revived', id: target.id, by: p.id })
      break
    }
    case 'escape': {
      if (!room.exit || p.down || room.over) break
      if (Math.hypot(room.exit.x - p.x, room.exit.z - p.z) > 4) break
      room.over = true
      broadcast(room, { t: 'win', by: p.id })
      setTimeout(() => resetRoom(room), 9000)
      break
    }
  }
}

// All tapes found: the lights die, the horde grows, and the exit door
// materialises far from where anyone is standing. Now get out.
function startBlackout(room) {
  room.blackout = true
  const [gx, gz] = pickReachableCell(room.reachable, 55, 75)
  room.exit = { x: cellCenter(gx), z: cellCenter(gz) }
  broadcast(room, { t: 'blackout', exit: room.exit })
}

// --- http + ws ----------------------------------------------------------------

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
}

const httpServer = http.createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200)
    res.end('ok')
    return
  }
  let file = path.join(DIST, path.normalize(req.url.split('?')[0]).replace(/^([/\\])+/, ''))
  if (!file.startsWith(DIST)) {
    res.writeHead(403)
    res.end()
    return
  }
  if (req.url === '/' || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(DIST, 'index.html')
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404)
      res.end('not found — run `npm run build` first')
      return
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' })
    res.end(data)
  })
})

const wss = new WebSocketServer({ server: httpServer, path: '/ws' })

wss.on('connection', (ws) => {
  let room = null
  let player = null

  ws.on('message', (raw) => {
    let msg
    try {
      msg = JSON.parse(raw)
    } catch {
      return
    }
    if (!player) {
      if (msg.t !== 'join') return
      const code = (msg.room || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4)
      room = code && rooms.has(code) ? rooms.get(code) : createRoom(code || makeRoomCode())
      if (room.players.size >= MAX_PLAYERS) {
        ws.send(JSON.stringify({ t: 'full' }))
        ws.close()
        return
      }
      player = {
        id: nextEntityId++,
        ws,
        name: String(msg.name || 'WANDERER').slice(0, 12).toUpperCase() || 'WANDERER',
        x: SPAWN_POINT.x,
        z: SPAWN_POINT.z,
        yaw: 0,
        hp: 100,
        down: false,
        light: true,
      }
      room.players.set(player.id, player)
      send(player, {
        t: 'init',
        id: player.id,
        seed: room.seed,
        room: room.code,
        spawn: SPAWN_POINT,
        tapes: room.tapes.filter((tp) => !tp.taken).map((tp) => ({ id: tp.id, x: tp.x, z: tp.z })),
        tapesLeft: room.tapesLeft,
        blackout: room.blackout,
        exit: room.exit,
      })
      broadcast(room, { t: 'joined', id: player.id, n: player.name })
      return
    }
    handleMessage(room, player, msg)
  })

  ws.on('close', () => {
    if (!room || !player) return
    room.players.delete(player.id)
    broadcast(room, { t: 'left', id: player.id })
    if (room.players.size === 0) {
      const code = room.code
      setTimeout(() => {
        const r = rooms.get(code)
        if (r && r.players.size === 0) rooms.delete(code)
      }, 60_000)
    } else {
      checkWipe(room)
    }
  })
})

setInterval(() => {
  for (const room of rooms.values()) {
    if (room.players.size === 0) continue
    tickRoom(room, TICK_MS / 1000)
    broadcast(room, snapshot(room))
  }
}, TICK_MS)

httpServer.listen(PORT, () => {
  console.log(`backrooms server listening on :${PORT} (ws at /ws)`)
})
