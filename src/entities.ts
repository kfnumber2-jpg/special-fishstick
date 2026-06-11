// Visuals for everything that moves or can be picked up. All models are
// built from primitives so the game needs zero downloaded assets.
import * as THREE from 'three'
import { nameSprite, smileTexture, tapeLabelTexture, exitDoorTexture } from './textures'

export type CreatureKind = 'hound' | 'smiler' | 'skinstealer' | 'watcher' | 'crawler'

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
