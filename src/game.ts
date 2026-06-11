// The game proper: first-person controller, chunk streaming, creature
// mirroring (the server simulates them, we render + interpolate), HUD,
// and all the horror dressing.
import * as THREE from 'three'
import { moveWithCollision } from '../shared/mapgen.js'
import { World } from './world'
import { Controls } from './controls'
import { Net, type ServerMsg } from './net'
import * as sfx from './audio'
import {
  buildCreature,
  buildExitDoor,
  buildPlayerAvatar,
  buildRelic,
  buildTape,
  buildWater,
  revealSkinstealer,
  type CreatureKind,
} from './entities'

const WALK_SPEED = 4.0
const SPRINT_SPEED = 6.4
const EYE_HEIGHT = 1.62
const SEND_MS = 80

interface RemotePlayer {
  group: THREE.Group
  tx: number
  tz: number
  tyaw: number
  hp: number
  down: boolean
  name: string
  relic: boolean
  ghost: boolean
}

interface RemoteCreature {
  kind: CreatureKind
  group: THREE.Group
  tx: number
  tz: number
  tyaw: number
  state: string
}

export function startGame(net: Net, init: ServerMsg, myName: string) {
  const canvas = document.getElementById('game') as HTMLCanvasElement
  const controls = new Controls(canvas)
  const seed = init.seed as number

  // --- renderer / scene -------------------------------------------------------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.setSize(innerWidth, innerHeight)
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x16120a)
  const fog = new THREE.FogExp2(0x16120a, 0.038)
  scene.fog = fog
  const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 120)
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(innerWidth, innerHeight)
  })

  const hemi = new THREE.HemisphereLight(0xfff3c2, 0x6b5c2e, 1.9)
  scene.add(hemi)
  const flashlight = new THREE.SpotLight(0xfff2cc, 90, 36, 0.5, 0.55, 1.9)
  flashlight.position.set(0, 0, 0.2)
  const flashTarget = new THREE.Object3D()
  flashTarget.position.set(0, 0, -6)
  camera.add(flashlight, flashTarget)
  flashlight.target = flashTarget
  const personalGlow = new THREE.PointLight(0xffe9b0, 2.2, 7, 1.6)
  camera.add(personalGlow)
  scene.add(camera)

  const world = new World(scene, seed)

  // --- state -------------------------------------------------------------------
  const me = {
    id: init.id as number,
    x: (init.spawn as { x: number }).x,
    z: (init.spawn as { z: number }).z,
    hp: 100,
    down: false,
    stamina: 100,
    battery: 100,
    exhausted: false,
    light: true,
  }
  let tapesLeft = init.tapesLeft as number
  let blackout = init.blackout as boolean
  let exitPos = init.exit as { x: number; z: number } | null
  let exitDoor: THREE.Group | null = null
  let gameOver = false
  let relicMesh: THREE.Group | null = null
  let hasRelic = false
  let invisUntil = 0

  // dev helpers: ?tp=x,z teleports on spawn; __seed lets tooling find chunks
  const tp = new URLSearchParams(location.search).get('tp')
  if (tp) {
    const [tx, tz] = tp.split(',').map(Number)
    if (Number.isFinite(tx) && Number.isFinite(tz)) {
      me.x = tx
      me.z = tz
    }
  }
  ;(window as unknown as Record<string, unknown>).__seed = seed

  const remotePlayers = new Map<number, RemotePlayer>()
  const creatures = new Map<number, RemoteCreature>()
  const tapes = new Map<number, THREE.Group>()

  // --- hud ----------------------------------------------------------------------
  const el = (id: string) => document.getElementById(id)!
  el('hud').classList.remove('hidden')
  if (controls.isTouch) el('touch').classList.remove('hidden')
  el('roomcode').textContent = 'ROOM ' + (init.room as string)
  const keyHint = (label: string) => (controls.isTouch ? `${label} — TAP ✋` : `${label} [E]`)

  let bannerTimer = 0
  function banner(text: string, ms = 3500) {
    el('banner').textContent = text
    el('banner').classList.remove('hidden')
    clearTimeout(bannerTimer)
    bannerTimer = window.setTimeout(() => el('banner').classList.add('hidden'), ms)
  }

  function updateTapeCounter() {
    el('tapes').textContent = `\u{1F4FC} ${8 - tapesLeft} / 8`
  }

  function updateRoster() {
    const rows: string[] = [
      `<div class="${me.down ? 'dead' : ''}">${hasRelic ? '👁 ' : ''}${myName} (you) ${me.down ? '☠' : me.hp}</div>`,
    ]
    for (const p of remotePlayers.values()) {
      rows.push(
        `<div class="${p.down ? 'dead' : ''}">${p.relic ? '👁 ' : ''}${p.name} ${p.down ? '☠' : p.hp}</div>`
      )
    }
    el('roster').innerHTML = rows.join('')
  }

  function placeRelicMesh(pos: { x: number; z: number }) {
    if (relicMesh) scene.remove(relicMesh)
    relicMesh = buildRelic()
    relicMesh.position.set(pos.x, 0, pos.z)
    scene.add(relicMesh)
  }

  // Ghosting: how teammates look while the Eye hides them.
  function setGhost(group: THREE.Group, on: boolean) {
    group.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Sprite) {
        const mat = o.material as THREE.Material
        mat.transparent = true
        mat.opacity = on ? 0.15 : 1
      }
    })
  }

  function redFlash() {
    const f = el('redflash')
    f.style.opacity = '1'
    setTimeout(() => (f.style.opacity = '0'), 180)
  }

  function setBlackout() {
    blackout = true
    world.setBlackout(true)
    hemi.intensity = 0.3
    fog.density = 0.065
    sfx.alarm()
    sfx.setHumIntensity(2.2)
    banner('THE LIGHTS ARE DYING. FIND THE EXIT DOOR.', 6000)
    el('compass').classList.remove('hidden')
    if (exitPos && !exitDoor) {
      exitDoor = buildExitDoor()
      exitDoor.position.set(exitPos.x, 0, exitPos.z)
      scene.add(exitDoor)
    }
  }

  // --- props from init -----------------------------------------------------------
  for (const t of init.tapes as { id: number; x: number; z: number }[]) {
    const g = buildTape()
    g.position.set(t.x, 0, t.z)
    scene.add(g)
    tapes.set(t.id, g)
  }
  if (init.relic) placeRelicMesh(init.relic as { x: number; z: number })
  const waters = new Map<number, THREE.Group>()
  const addWaters = (list: { id: number; x: number; z: number }[]) => {
    for (const w of list) {
      const g = buildWater()
      g.position.set(w.x, 0, w.z)
      scene.add(g)
      waters.set(w.id, g)
    }
  }
  addWaters(init.waters as { id: number; x: number; z: number }[])
  updateTapeCounter()
  updateRoster()
  if (blackout) setBlackout()

  // --- net handlers ----------------------------------------------------------------
  net.on('snap', (m) => {
    const players = m.players as {
      id: number
      n: string
      x: number
      z: number
      yaw: number
      hp: number
      down: boolean
      r: number
      inv: number
    }[]
    const seen = new Set<number>()
    for (const p of players) {
      if (p.id === me.id) {
        me.hp = p.hp
        if (p.down && !me.down) goDown()
        if (!p.down && me.down) getUp()
        continue
      }
      seen.add(p.id)
      let rp = remotePlayers.get(p.id)
      if (!rp) {
        const group = buildPlayerAvatar(p.n, p.id % 4)
        scene.add(group)
        rp = {
          group,
          tx: p.x,
          tz: p.z,
          tyaw: p.yaw,
          hp: p.hp,
          down: p.down,
          name: p.n,
          relic: false,
          ghost: false,
        }
        remotePlayers.set(p.id, rp)
        group.position.set(p.x, 0, p.z)
      }
      rp.tx = p.x
      rp.tz = p.z
      rp.tyaw = p.yaw
      rp.hp = p.hp
      rp.down = p.down
      rp.relic = !!p.r
      if (!!p.inv !== rp.ghost) {
        rp.ghost = !!p.inv
        setGhost(rp.group, rp.ghost)
      }
      rp.group.scale.y = p.down ? 0.3 : 1
    }
    for (const [id, rp] of remotePlayers) {
      if (!seen.has(id)) {
        scene.remove(rp.group)
        remotePlayers.delete(id)
      }
    }

    const list = m.creatures as { id: number; k: CreatureKind; x: number; z: number; yaw: number; s: string }[]
    const seenC = new Set<number>()
    for (const c of list) {
      seenC.add(c.id)
      let rc = creatures.get(c.id)
      if (!rc) {
        const group = buildCreature(c.k)
        group.position.set(c.x, 0, c.z)
        scene.add(group)
        rc = { kind: c.k, group, tx: c.x, tz: c.z, tyaw: c.yaw, state: c.s }
        creatures.set(c.id, rc)
      }
      rc.tx = c.x
      rc.tz = c.z
      rc.tyaw = c.yaw
      if (c.k === 'skinstealer' && c.s === 'reveal' && rc.state !== 'reveal') {
        revealSkinstealer(rc.group)
      }
      rc.state = c.s
    }
    for (const [id, rc] of creatures) {
      if (!seenC.has(id)) {
        scene.remove(rc.group)
        creatures.delete(id)
      }
    }
    updateRoster()
  })

  net.on('hit', (m) => {
    me.hp = m.hp as number
    redFlash()
    sfx.stinger()
    shake = 0.5
  })
  net.on('down', (m) => {
    if (m.id === me.id) goDown()
  })
  net.on('revived', (m) => {
    if (m.id === me.id) getUp()
    banner('REVIVED', 1500)
  })
  net.on('tape', (m) => {
    tapesLeft = m.left as number
    const g = tapes.get(m.id as number)
    if (g) {
      scene.remove(g)
      tapes.delete(m.id as number)
    }
    sfx.tapeChime()
    updateTapeCounter()
    if (tapesLeft > 0) banner(`TAPE RECOVERED — ${tapesLeft} LEFT`, 2500)
  })
  net.on('waterTaken', (m) => {
    const g = waters.get(m.id as number)
    if (g) {
      scene.remove(g)
      waters.delete(m.id as number)
    }
    if (m.by === me.id) {
      me.hp = m.hp as number
      banner('🥤 ALMOND WATER — +40 HP', 2000)
      sfx.tapeChime()
    }
  })
  net.on('mimicReveal', (m) => {
    const g = tapes.get(m.id as number)
    if (g) {
      scene.remove(g)
      tapes.delete(m.id as number)
    }
    banner("THAT WASN'T A TAPE", 2500)
    sfx.staticBurst(0.8, 0.15)
    shake = 0.7
  })
  net.on('howl', () => {
    banner('THE RED ROOMS HAVE A VOICE — RUN', 2500)
    sfx.stinger()
    sfx.staticBurst(0.7, 0.12)
  })
  net.on('blackout', (m) => {
    exitPos = m.exit as { x: number; z: number }
    setBlackout()
  })
  net.on('relicTaken', (m) => {
    if (relicMesh) {
      scene.remove(relicMesh)
      relicMesh = null
    }
    if (m.by === me.id) {
      hasRelic = true
      banner("👁 LEGENDARY — THE WANDERER'S EYE WILL SAVE YOU ONCE", 5000)
      sfx.tapeChime()
    } else {
      banner('SOMEONE FOUND THE EYE', 2500)
    }
    updateRoster()
  })
  net.on('relicSave', (m) => {
    if (m.id === me.id) {
      hasRelic = false
      invisUntil = performance.now() + 12000
      banner('THE EYE BURNS — NOTHING CAN SEE YOU', 4000)
      sfx.whisper()
      sfx.tapeChime()
      shake = 0.6
    } else {
      banner("THE EYE SAVED A WANDERER", 2500)
    }
    updateRoster()
  })
  net.on('seen', () => {
    sfx.staticBurst(0.6, 0.1)
    banner('something tall has noticed you', 2200)
  })
  net.on('reveal', () => {
    sfx.stinger()
    banner('THAT IS NOT YOUR FRIEND', 2000)
  })
  net.on('ambush', () => sfx.stinger())
  net.on('whisper', () => {
    sfx.whisper()
    shake = 0.8
    banner('it is right behind you', 1600)
  })
  net.on('joined', (m) => banner(`${m.n} ENTERED THE BACKROOMS`, 2000))
  net.on('left', () => banner('A WANDERER IS GONE', 2000))
  net.on('win', () => endScreen(true))
  net.on('wipe', () => endScreen(false))
  net.on('reset', (m) => {
    // fresh round, same maze
    gameOver = false
    blackout = false
    world.setBlackout(false)
    hemi.intensity = 1.9
    fog.density = 0.038
    sfx.setHumIntensity(1)
    exitPos = null
    if (exitDoor) {
      scene.remove(exitDoor)
      exitDoor = null
    }
    el('compass').classList.add('hidden')
    el('endscreen').classList.add('hidden')
    for (const g of tapes.values()) scene.remove(g)
    tapes.clear()
    for (const t of m.tapes as { id: number; x: number; z: number }[]) {
      const g = buildTape()
      g.position.set(t.x, 0, t.z)
      scene.add(g)
      tapes.set(t.id, g)
    }
    tapesLeft = (m.left as number) ?? 8
    placeRelicMesh(m.relic as { x: number; z: number })
    for (const g of waters.values()) scene.remove(g)
    waters.clear()
    addWaters(m.waters as { id: number; x: number; z: number }[])
    hasRelic = false
    invisUntil = 0
    const spawn = m.spawn as { x: number; z: number }
    me.x = spawn.x
    me.z = spawn.z
    me.hp = 100
    getUp()
    updateTapeCounter()
  })
  net.onclose = () => {
    if (!gameOver) {
      el('endscreen').classList.remove('hidden')
      el('endscreen').classList.add('lose')
      el('end-title').textContent = 'SIGNAL LOST'
      el('end-text').textContent = 'connection to the backrooms was severed. reload to descend again.'
    }
  }

  function goDown() {
    me.down = true
    banner('YOU ARE DOWN — a teammate can revive you', 5000)
  }
  function getUp() {
    me.down = false
  }

  function endScreen(win: boolean) {
    gameOver = true
    const s = el('endscreen')
    s.classList.remove('hidden', 'win', 'lose')
    s.classList.add(win ? 'win' : 'lose')
    el('end-title').textContent = win ? 'YOU ESCAPED' : 'THE BACKROOMS KEEP YOU'
    el('end-text').textContent = win
      ? 'all 8 lost tapes recovered. the door closes behind you.'
      : 'every wanderer has fallen. the hum continues forever.'
    if (!win) sfx.staticBurst(1.2, 0.2)
  }

  // --- interaction ------------------------------------------------------------------
  let reviveHold = 0
  function nearestWater(): number | null {
    for (const [id, g] of waters) {
      if (Math.hypot(g.position.x - me.x, g.position.z - me.z) < 2.2) return id
    }
    return null
  }
  function handleInteraction(dt: number) {
    const prompt = el('prompt')
    let text: string | null = null

    if (!me.down && !gameOver) {
      // escape door
      if (exitPos && Math.hypot(exitPos.x - me.x, exitPos.z - me.z) < 3.2) {
        text = keyHint('\u{1F6AA} ESCAPE')
        if (controls.consumeInteract()) net.send({ t: 'escape' })
      } else {
        // nearest tape
        let nearTape: number | null = null
        for (const [id, g] of tapes) {
          if (Math.hypot(g.position.x - me.x, g.position.z - me.z) < 2.2) {
            nearTape = id
            break
          }
        }
        if (nearTape !== null) {
          text = keyHint('\u{1F4FC} GRAB TAPE')
          if (controls.consumeInteract()) net.send({ t: 'grab', tape: nearTape })
        } else if (
          relicMesh &&
          Math.hypot(relicMesh.position.x - me.x, relicMesh.position.z - me.z) < 2.4
        ) {
          text = keyHint('👁 TAKE THE EYE')
          if (controls.consumeInteract()) net.send({ t: 'relicGrab' })
        } else if (me.hp < 100 && nearestWater() !== null) {
          text = keyHint('🥤 DRINK ALMOND WATER')
          if (controls.consumeInteract()) net.send({ t: 'water', id: nearestWater() })
        } else {
          // downed teammate
          let target: number | null = null
          for (const [id, p] of remotePlayers) {
            if (p.down && Math.hypot(p.group.position.x - me.x, p.group.position.z - me.z) < 2.6) {
              target = id
              break
            }
          }
          if (target !== null) {
            if (controls.interactHeld) {
              reviveHold += dt
              text = `REVIVING ${'█'.repeat(Math.ceil(reviveHold))}${'░'.repeat(Math.max(0, 3 - Math.ceil(reviveHold)))}`
              if (reviveHold >= 3) {
                net.send({ t: 'revive', target })
                reviveHold = 0
              }
            } else {
              reviveHold = 0
              text = keyHint('❤ HOLD TO REVIVE')
            }
          } else {
            reviveHold = 0
          }
        }
      }
      controls.consumeInteract() // discard stray presses
    } else if (me.down) {
      text = 'YOU ARE DOWN — wait for rescue'
    }

    if (text) {
      prompt.textContent = text
      prompt.classList.remove('hidden')
    } else {
      prompt.classList.add('hidden')
    }
  }

  // --- main loop -----------------------------------------------------------------------
  let shake = 0
  let lastSend = 0
  let stepTimer = 0
  let last = performance.now()

  function frame(now: number) {
    requestAnimationFrame(frame)
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    controls.update()

    // movement
    let speed = 0
    if (!me.down && !gameOver) {
      const wantSprint = controls.sprint && !me.exhausted && (controls.moveX !== 0 || controls.moveY !== 0)
      speed = wantSprint ? SPRINT_SPEED : WALK_SPEED
      if (wantSprint) {
        me.stamina = Math.max(0, me.stamina - 26 * dt)
        if (me.stamina <= 0) me.exhausted = true
      } else {
        me.stamina = Math.min(100, me.stamina + 13 * dt)
        if (me.stamina > 30) me.exhausted = false
      }
      // camera forward is (-sin yaw, -cos yaw); right is (cos yaw, -sin yaw)
      const sin = Math.sin(controls.yaw)
      const cos = Math.cos(controls.yaw)
      const dx = (-sin * controls.moveY + cos * controls.moveX) * speed * dt
      const dz = (-cos * controls.moveY - sin * controls.moveX) * speed * dt
      if (dx !== 0 || dz !== 0) {
        const moved = moveWithCollision(seed, me.x, me.z, dx, dz, 0.45)
        const really = Math.hypot(moved.x - me.x, moved.z - me.z)
        me.x = moved.x
        me.z = moved.z
        stepTimer -= really
        if (stepTimer <= 0) {
          sfx.footstep(wantSprint)
          stepTimer = wantSprint ? 2.4 : 2.0
        }
      }
    }

    // flashlight + battery
    if (controls.consumeLightToggle() && !me.down) {
      if (me.light) me.light = false
      else if (me.battery > 8) me.light = true
      sfx.staticBurst(0.06, 0.05)
    }
    if (me.light) {
      me.battery = Math.max(0, me.battery - dt * (100 / 240))
      if (me.battery <= 0) me.light = false
    } else {
      me.battery = Math.min(100, me.battery + dt * 1.6)
    }
    flashlight.visible = me.light && !me.down
    // dying battery flicker
    flashlight.intensity = me.battery < 20 ? 90 * (0.6 + 0.4 * Math.random()) : 90

    // camera
    const bobAmp = speed > 0 && (controls.moveX || controls.moveY) ? (speed > 5 ? 0.05 : 0.03) : 0
    const bob = Math.sin(now * 0.012 * (speed > 5 ? 1.4 : 1)) * bobAmp
    shake = Math.max(0, shake - dt * 2)
    const sx = shake * (Math.random() - 0.5) * 0.12
    const sy = shake * (Math.random() - 0.5) * 0.12
    camera.position.set(me.x + sx, (me.down ? 0.5 : EYE_HEIGHT) + bob + sy, me.z)
    camera.rotation.set(controls.pitch, controls.yaw, 0, 'YXZ')

    // hum/light flicker ambience
    hemi.intensity = (blackout ? 0.3 : 1.9) * (0.96 + 0.04 * Math.sin(now * 0.047) * Math.sin(now * 0.013))

    world.update(me.x, me.z)

    // interpolate remotes
    const k = 1 - Math.exp(-10 * dt)
    for (const rp of remotePlayers.values()) {
      rp.group.position.x += (rp.tx - rp.group.position.x) * k
      rp.group.position.z += (rp.tz - rp.group.position.z) * k
      rp.group.rotation.y += shortestAngle(rp.group.rotation.y, rp.tyaw) * k
    }
    let nearestDanger = Infinity
    for (const rc of creatures.values()) {
      rc.group.position.x += (rc.tx - rc.group.position.x) * k
      rc.group.position.z += (rc.tz - rc.group.position.z) * k
      rc.group.rotation.y += shortestAngle(rc.group.rotation.y, rc.tyaw) * k
      animateCreature(rc, now)
      const d = Math.hypot(rc.group.position.x - me.x, rc.group.position.z - me.z)
      if (rc.kind !== 'watcher' || d < 12) nearestDanger = Math.min(nearestDanger, d)
    }
    sfx.setHeartbeat(nearestDanger < 18 ? 1 - nearestDanger / 18 : 0)

    // relic spin + invisibility timer
    if (relicMesh) {
      const eye = relicMesh.getObjectByName('relic')!
      eye.rotation.y = now * 0.0015
      eye.position.y = 1.1 + Math.sin(now * 0.0025) * 0.1
      relicMesh.getObjectByName('iris')!.position.y = eye.position.y
    }
    const invisible = invisUntil > now
    const cross = el('crosshair')
    cross.textContent = invisible ? '◉' : '+'
    cross.style.color = invisible ? '#ffd84a' : ''
    if (invisUntil !== 0 && !invisible) {
      invisUntil = 0
      banner("THE EYE'S GIFT FADES — YOU ARE SEEN AGAIN", 3000)
      sfx.staticBurst(0.4, 0.08)
    }

    // almond water shimmer
    for (const g of waters.values()) {
      g.rotation.y = now * 0.001
    }

    // tapes bob + spin
    for (const g of tapes.values()) {
      const tape = g.getObjectByName('tape')!
      tape.rotation.y = now * 0.001
      tape.position.y = 0.8 + Math.sin(now * 0.002) * 0.08
    }
    if (exitDoor) exitDoor.rotation.y = Math.sin(now * 0.0005) * 0.05

    // compass to exit during blackout
    if (blackout && exitPos) {
      const ang = Math.atan2(exitPos.x - me.x, exitPos.z - me.z)
      const rel = ang - controls.yaw + Math.PI
      el('compass').style.transform = `translateX(-50%) rotate(${-rel}rad)`
    }

    handleInteraction(dt)

    // hud bars
    ;(el('hp') as HTMLElement).style.width = me.hp + '%'
    ;(el('stamina') as HTMLElement).style.width = me.stamina + '%'
    ;(el('battery') as HTMLElement).style.width = me.battery + '%'

    // net send
    if (now - lastSend > SEND_MS) {
      lastSend = now
      // the wire format for yaw is the facing angle in atan2(dx, dz) form
      net.send({
        t: 'state',
        x: +me.x.toFixed(2),
        z: +me.z.toFixed(2),
        yaw: +(controls.yaw + Math.PI).toFixed(3),
        light: me.light,
      })
    }

    renderer.render(scene, camera)
  }

  function animateCreature(rc: RemoteCreature, now: number) {
    const moving = Math.hypot(rc.tx - rc.group.position.x, rc.tz - rc.group.position.z) > 0.05
    switch (rc.kind) {
      case 'hound':
      case 'crawler': {
        let i = 0
        rc.group.traverse((o) => {
          if (o.name === 'leg') {
            o.rotation.x = moving ? Math.sin(now * 0.02 + i * 1.7) * 0.7 : 0
            i++
          }
        })
        break
      }
      case 'smiler': {
        rc.group.position.y = Math.sin(now * 0.003) * 0.15
        // the grin hides from your beam — you only see it in the dark
        const smile = rc.group.getObjectByName('smile') as THREE.Sprite
        const dx = rc.group.position.x - me.x
        const dz = rc.group.position.z - me.z
        const dist = Math.hypot(dx, dz)
        const facing =
          Math.cos(controls.yaw) * (dz / (dist || 1)) + Math.sin(controls.yaw) * (dx / (dist || 1))
        const lit = me.light && dist < 26 && facing < -0.8
        smile.material.opacity += ((lit ? 0.12 : 1) - smile.material.opacity) * 0.1
        break
      }
      case 'skinstealer': {
        rc.group.position.y = moving ? Math.abs(Math.sin(now * 0.012)) * 0.06 : 0
        break
      }
      case 'stilter': {
        // slow deliberate strides, head swaying near the ceiling
        let i = 0
        rc.group.traverse((o) => {
          if (o.name === 'stiltleg') {
            o.rotation.x = moving ? Math.sin(now * 0.004 + i * (Math.PI / 2)) * 0.22 : 0
            i++
          }
        })
        rc.group.rotation.z = Math.sin(now * 0.0021) * 0.04
        break
      }
      case 'howler': {
        // frantic gallop, jaw working
        let i = 0
        rc.group.traverse((o) => {
          if (o.name === 'limb') {
            o.rotation.x = moving ? Math.sin(now * 0.016 + i * Math.PI) * 0.7 : 0
            i++
          }
        })
        const jaw = rc.group.getObjectByName('jaw')
        if (jaw) jaw.position.y = 1.42 + Math.abs(Math.sin(now * 0.01)) * 0.12
        break
      }
      case 'mimic': {
        // skittering, top shell snapping
        rc.group.position.y = moving ? Math.abs(Math.sin(now * 0.02)) * 0.08 : 0
        const jaw = rc.group.getObjectByName('jaw')
        if (jaw) jaw.rotation.x = -0.35 - Math.abs(Math.sin(now * 0.012)) * 0.5
        break
      }
      case 'watcher': {
        // always faces you
        rc.group.rotation.y = Math.atan2(me.x - rc.group.position.x, me.z - rc.group.position.z)
        break
      }
    }
  }

  function shortestAngle(from: number, to: number): number {
    let d = (to - from) % (Math.PI * 2)
    if (d > Math.PI) d -= Math.PI * 2
    if (d < -Math.PI) d += Math.PI * 2
    return d
  }

  sfx.setHumIntensity(1)
  banner('FIND THE 8 LOST TAPES', 4000)
  requestAnimationFrame(frame)
}
