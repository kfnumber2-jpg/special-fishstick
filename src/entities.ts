// Visuals for everything that moves or can be picked up. All models are
// built from primitives so the game needs zero downloaded assets.
import * as THREE from 'three'
import { nameSprite, smileTexture, tapeLabelTexture, exitDoorTexture } from './textures'

export type CreatureKind =
  | 'hound'
  | 'smiler'
  | 'skinstealer'
  | 'watcher'
  | 'crawler'
  | 'stilter'
  | 'howler'
  | 'mimic'

const PLAYER_COLORS = [0xd9c75a, 0x7ab0d9, 0xd97a7a, 0x8ad97a]

let tapeTex: THREE.Texture | null = null
let smileTex: THREE.Texture | null = null

// --- players -----------------------------------------------------------------

export function buildPlayerAvatar(name: string, colorIdx: number): THREE.Group {
  const g = new THREE.Group()
  const color = PLAYER_COLORS[colorIdx % PLAYER_COLORS.length]
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.35, 0.9, 4, 10),
    new THREE.MeshLambertMaterial({ color })
  )
  body.position.y = 0.95
  g.add(body)
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 12, 10),
    new THREE.MeshLambertMaterial({ color: 0xc9b896 })
  )
  head.position.y = 1.72
  g.add(head)
  // small headlamp glow so teammates read as friendly from afar
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xfff7c0 })
  )
  lamp.position.set(0, 1.74, 0.2)
  lamp.name = 'lamp'
  g.add(lamp)
  const tag = nameSprite(name)
  tag.position.y = 2.25
  tag.name = 'tag'
  g.add(tag)
  return g
}

// --- creatures ---------------------------------------------------------------

export function buildCreature(kind: CreatureKind): THREE.Group {
  switch (kind) {
    case 'hound':
      return buildHound()
    case 'smiler':
      return buildSmiler()
    case 'skinstealer':
      return buildSkinstealer()
    case 'watcher':
      return buildWatcher()
    case 'crawler':
      return buildCrawler()
    case 'stilter':
      return buildStilter()
    case 'howler':
      return buildHowler()
    case 'mimic':
      return buildMimic()
  }
}

function darkMat(color = 0x14120c) {
  return new THREE.MeshLambertMaterial({ color })
}

function eyes(g: THREE.Group, y: number, z: number, spread: number, color = 0xff2a1a, r = 0.05) {
  const mat = new THREE.MeshBasicMaterial({ color })
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 6), mat)
    e.position.set(s * spread, y, z)
    g.add(e)
  }
}

// Fast low quadruped, all sinew and red eyes.
function buildHound(): THREE.Group {
  const g = new THREE.Group()
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 1.5), darkMat(0x1a140e))
  body.position.y = 0.62
  g.add(body)
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.5), darkMat(0x120d08))
  head.position.set(0, 0.78, 0.92)
  g.add(head)
  eyes(g, 0.84, 1.18, 0.09)
  for (const [sx, sz] of [[-0.2, 0.55], [0.2, 0.55], [-0.2, -0.55], [0.2, -0.55]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.62, 0.12), darkMat(0x0e0a06))
    leg.position.set(sx, 0.31, sz)
    leg.name = 'leg'
    g.add(leg)
  }
  return g
}

// A grin floating in the dark. The body is barely there.
function buildSmiler(): THREE.Group {
  const g = new THREE.Group()
  if (!smileTex) smileTex = smileTexture()
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 14, 12),
    new THREE.MeshLambertMaterial({ color: 0x000000, transparent: true, opacity: 0.55 })
  )
  body.position.y = 1.5
  g.add(body)
  const smile = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: smileTex, transparent: true, depthWrite: false })
  )
  smile.scale.set(1.1, 1.1, 1)
  smile.position.y = 1.5
  smile.name = 'smile'
  g.add(smile)
  return g
}

// Looks exactly like a teammate until it's far too close.
export function buildSkinstealer(): THREE.Group {
  const g = buildPlayerAvatar('????', 0)
  g.userData.revealed = false
  return g
}

export function revealSkinstealer(g: THREE.Group) {
  if (g.userData.revealed) return
  g.userData.revealed = true
  g.traverse((o) => {
    if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshLambertMaterial) {
      o.material = new THREE.MeshLambertMaterial({ color: 0x241410 })
    }
    if (o.name === 'tag' || o.name === 'lamp') o.visible = false
  })
  eyes(g, 1.74, 0.18, 0.09, 0xff2a1a, 0.06)
  // unhinged jaw
  const jaw = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.34, 0.14),
    new THREE.MeshBasicMaterial({ color: 0x550000 })
  )
  jaw.position.set(0, 1.45, 0.16)
  g.add(jaw)
}

// Tall, motionless silhouette with a pale face.
function buildWatcher(): THREE.Group {
  const g = new THREE.Group()
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, 2.6, 8), darkMat(0x0a0908))
  body.position.y = 1.3
  g.add(body)
  const face = new THREE.Mesh(
    new THREE.CircleGeometry(0.16, 10),
    new THREE.MeshBasicMaterial({ color: 0xcfc6ae })
  )
  face.position.set(0, 2.35, 0.17)
  face.name = 'face'
  g.add(face)
  return g
}

// Wide, flat, far too many legs. Nests on the tapes.
function buildCrawler(): THREE.Group {
  const g = new THREE.Group()
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), darkMat(0x171008))
  body.scale.set(1.4, 0.45, 1.4)
  body.position.y = 0.32
  g.add(body)
  eyes(g, 0.4, 0.55, 0.14, 0xffd02a, 0.06)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.5, 0.07), darkMat(0x0d0a05))
    leg.position.set(Math.cos(a) * 0.62, 0.25, Math.sin(a) * 0.62)
    leg.rotation.z = Math.cos(a) * 0.5
    leg.rotation.x = -Math.sin(a) * 0.5
    leg.name = 'leg'
    g.add(leg)
  }
  return g
}

// Head at the ceiling, body all spindly stilt legs — the thing from the
// footage. Each leg is two thin segments bent at a high knee.
function buildStilter(): THREE.Group {
  const g = new THREE.Group()
  const mat = darkMat(0x0c0a07)
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), mat)
  torso.scale.set(1, 1.5, 0.8)
  torso.position.y = 2.55
  g.add(torso)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), mat)
  head.position.set(0, 3.05, 0.08)
  g.add(head)
  eyes(g, 3.07, 0.2, 0.06, 0xd8d4c0, 0.035)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4
    const hip = new THREE.Group()
    hip.position.set(Math.cos(a) * 0.22, 2.4, Math.sin(a) * 0.22)
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 1.5, 5), mat)
    upper.position.y = -0.6
    upper.rotation.z = Math.cos(a) * 0.55
    upper.rotation.x = -Math.sin(a) * 0.55
    hip.add(upper)
    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.02, 1.6, 5), mat)
    lower.position.set(Math.cos(a) * 0.75, -1.65, Math.sin(a) * 0.75)
    lower.rotation.z = -Math.cos(a) * 0.28
    lower.rotation.x = Math.sin(a) * 0.28
    hip.add(lower)
    hip.name = 'stiltleg'
    g.add(hip)
  }
  return g
}

// Lord of the red rooms: a gaunt hunched runner, all ribs and jaw, lit from
// inside by the same red as the halls it owns.
function buildHowler(): THREE.Group {
  const g = new THREE.Group()
  const mat = darkMat(0x1a0806)
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), mat)
  body.scale.set(0.8, 1.25, 1.1)
  body.position.set(0, 1.15, 0)
  body.rotation.x = 0.5
  g.add(body)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), mat)
  head.scale.set(0.8, 0.9, 1.3)
  head.position.set(0, 1.55, 0.45)
  g.add(head)
  // wide red jaw
  const jaw = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.1, 0.4),
    new THREE.MeshBasicMaterial({ color: 0xff2418 })
  )
  jaw.position.set(0, 1.42, 0.58)
  jaw.name = 'jaw'
  g.add(jaw)
  eyes(g, 1.65, 0.22, 0.62, 0xff2418, 0.05)
  for (const side of [-1, 1]) {
    for (const fz of [0.35, -0.3]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.04, 1.1, 5), mat)
      leg.position.set(side * 0.3, 0.55, fz)
      leg.name = 'limb'
      g.add(leg)
    }
  }
  return g
}

// What a fake tape really is: the cassette split open into a mouth on legs.
function buildMimic(): THREE.Group {
  const g = new THREE.Group()
  const dark = darkMat(0x14110d)
  const shell = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.45), dark)
  shell.position.set(0, 0.55, 0)
  shell.rotation.x = -0.35
  shell.name = 'jaw'
  g.add(shell)
  const shellBottom = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.45), dark)
  shellBottom.position.set(0, 0.35, 0)
  g.add(shellBottom)
  // teeth between the shells
  for (let i = 0; i < 5; i++) {
    const tooth = new THREE.Mesh(
      new THREE.ConeGeometry(0.04, 0.14, 4),
      new THREE.MeshBasicMaterial({ color: 0xe8e2d0 })
    )
    tooth.position.set(-0.26 + i * 0.13, 0.42, 0.2)
    tooth.rotation.x = Math.PI
    g.add(tooth)
  }
  eyes(g, 0.62, 0.3, 0.18, 0xff4030, 0.04)
  for (const side of [-1, 1]) {
    for (const fz of [0.15, -0.15]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.45, 4), dark)
      leg.position.set(side * 0.32, 0.2, fz)
      leg.rotation.z = side * 0.5
      leg.name = 'limb'
      g.add(leg)
    }
  }
  return g
}

// --- props ---------------------------------------------------------------------

export function buildTape(): THREE.Group {
  const g = new THREE.Group()
  if (!tapeTex) tapeTex = tapeLabelTexture()
  const tape = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.1, 0.26),
    [
      new THREE.MeshLambertMaterial({ color: 0x101010 }),
      new THREE.MeshLambertMaterial({ color: 0x101010 }),
      new THREE.MeshLambertMaterial({ map: tapeTex }),
      new THREE.MeshLambertMaterial({ color: 0x101010 }),
      new THREE.MeshLambertMaterial({ color: 0x101010 }),
      new THREE.MeshLambertMaterial({ color: 0x101010 }),
    ]
  )
  tape.position.y = 0.8
  tape.name = 'tape'
  g.add(tape)
  const glow = new THREE.PointLight(0xb0c8ff, 1.4, 5)
  glow.position.y = 1.0
  g.add(glow)
  return g
}

// THE WANDERER'S EYE — the one legendary in each game. Carrying it saves
// you from a single killing strike by turning you invisible.
export function buildRelic(): THREE.Group {
  const g = new THREE.Group()
  const eye = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.22, 0),
    new THREE.MeshBasicMaterial({ color: 0xffd84a })
  )
  eye.position.y = 1.1
  eye.name = 'relic'
  g.add(eye)
  const iris = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x1a1206 })
  )
  iris.position.y = 1.1
  iris.name = 'iris'
  g.add(iris)
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.24, 0.7, 8),
    new THREE.MeshLambertMaterial({ color: 0x2a2418 })
  )
  pedestal.position.y = 0.35
  g.add(pedestal)
  const glow = new THREE.PointLight(0xffd84a, 2.5, 9)
  glow.position.y = 1.3
  g.add(glow)
  return g
}

// Almond water: the Backrooms' classic restorative. +40 hp per bottle.
export function buildWater(): THREE.Group {
  const g = new THREE.Group()
  const bottle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.11, 0.34, 8),
    new THREE.MeshLambertMaterial({ color: 0xbfe8ee, transparent: true, opacity: 0.85 })
  )
  bottle.position.y = 0.17
  g.add(bottle)
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 0.07, 8),
    new THREE.MeshLambertMaterial({ color: 0x2266aa })
  )
  cap.position.y = 0.38
  g.add(cap)
  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(0.112, 0.112, 0.14, 8),
    new THREE.MeshBasicMaterial({ color: 0xf4ecd8 })
  )
  label.position.y = 0.15
  g.add(label)
  const glow = new THREE.PointLight(0x9fdde8, 0.9, 4)
  glow.position.y = 0.5
  g.add(glow)
  return g
}

export function buildExitDoor(): THREE.Group {
  const g = new THREE.Group()
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 3.1, 0.3),
    new THREE.MeshLambertMaterial({ color: 0x222222 })
  )
  frame.position.y = 1.55
  g.add(frame)
  const door = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 2.7),
    new THREE.MeshBasicMaterial({ map: exitDoorTexture() })
  )
  door.position.set(0, 1.5, 0.17)
  g.add(door)
  const door2 = door.clone()
  door2.rotation.y = Math.PI
  door2.position.z = -0.17
  g.add(door2)
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.4),
    new THREE.MeshBasicMaterial({ color: 0x2dff7a })
  )
  sign.position.set(0, 3.35, 0)
  g.add(sign)
  const beacon = new THREE.PointLight(0x9fffba, 3, 24)
  beacon.position.y = 2.4
  g.add(beacon)
  return g
}
