// Streams the infinite maze around the player: builds a 3x3 ring of chunk
// meshes (instanced wall boxes + floor + ceiling + light panels) and drops
// chunks that fall out of range. Geometry comes from shared/mapgen.js, the
// same generator the server uses for creature AI.
import * as THREE from 'three'
import { CELL, CHUNK, LOW, WALL, WALL_H, chunkStyle, getChunk, hash } from '../shared/mapgen.js'
import { carpetTexture, ceilingTexture, wallpaperTexture } from './textures'

const VIEW_CHUNKS = 1 // ring radius in chunks (3x3 active)

export class World {
  private scene: THREE.Scene
  private seed: number
  private chunks = new Map<string, THREE.Group>()
  private wallMat: THREE.MeshLambertMaterial
  private floorMat: THREE.MeshLambertMaterial
  private ceilMat: THREE.MeshLambertMaterial
  private darkCeilMat: THREE.MeshLambertMaterial
  private redWallMat: THREE.MeshLambertMaterial
  private redFloorMat: THREE.MeshLambertMaterial
  private redCeilMat: THREE.MeshLambertMaterial
  private redPanelMat: THREE.MeshBasicMaterial
  panelMat: THREE.MeshBasicMaterial
  private wallGeo: THREE.BoxGeometry
  private lowGeo: THREE.BoxGeometry
  private panelGeo: THREE.PlaneGeometry

  constructor(scene: THREE.Scene, seed: number) {
    this.scene = scene
    this.seed = seed
    const wallTex = wallpaperTexture()
    const carpet = carpetTexture()
    carpet.repeat.set(CHUNK, CHUNK)
    const ceil = ceilingTexture()
    ceil.repeat.set(CHUNK / 2, CHUNK / 2)
    this.wallMat = new THREE.MeshLambertMaterial({ map: wallTex })
    this.floorMat = new THREE.MeshLambertMaterial({ map: carpet })
    this.ceilMat = new THREE.MeshLambertMaterial({ map: ceil })
    this.darkCeilMat = new THREE.MeshLambertMaterial({ color: 0x171410 })
    // red rooms: same textures, tinted hot — Lambert color multiplies the map
    this.redWallMat = new THREE.MeshLambertMaterial({ map: wallTex, color: 0xd84a38 })
    this.redFloorMat = new THREE.MeshLambertMaterial({ map: carpet, color: 0xb03326 })
    this.redCeilMat = new THREE.MeshLambertMaterial({ color: 0x2a0c08 })
    this.redPanelMat = new THREE.MeshBasicMaterial({ color: 0xff3b2e })
    this.panelMat = new THREE.MeshBasicMaterial({ color: 0xfff9d6 })
    this.wallGeo = new THREE.BoxGeometry(CELL, WALL_H, CELL)
    this.lowGeo = new THREE.BoxGeometry(CELL, 1.15, CELL)
    this.panelGeo = new THREE.PlaneGeometry(2.3, 2.3)
  }

  update(px: number, pz: number) {
    const ccx = Math.floor(px / (CHUNK * CELL))
    const ccy = Math.floor(pz / (CHUNK * CELL))
    const wanted = new Set<string>()
    for (let dx = -VIEW_CHUNKS; dx <= VIEW_CHUNKS; dx++) {
      for (let dy = -VIEW_CHUNKS; dy <= VIEW_CHUNKS; dy++) {
        const key = ccx + dx + ',' + (ccy + dy)
        wanted.add(key)
        if (!this.chunks.has(key)) {
          const g = this.buildChunk(ccx + dx, ccy + dy)
          this.chunks.set(key, g)
          this.scene.add(g)
        }
      }
    }
    for (const [key, g] of this.chunks) {
      if (!wanted.has(key)) {
        this.scene.remove(g)
        g.traverse((o) => {
          if (o instanceof THREE.InstancedMesh) o.dispose()
        })
        this.chunks.delete(key)
      }
    }
  }

  // Blackout: kill most of the ceiling glow.
  setBlackout(on: boolean) {
    this.panelMat.color.set(on ? 0x4a4430 : 0xfff9d6)
  }

  private buildChunk(cx: number, cy: number): THREE.Group {
    const group = new THREE.Group()
    const cells = getChunk(this.seed, cx, cy)
    const originX = cx * CHUNK * CELL
    const originZ = cy * CHUNK * CELL
    const sizeW = CHUNK * CELL
    // style 3 = sunken dark hall: black ceiling, almost every panel dead
    // style 4 = red rooms: everything tinted hot red, red glow panels
    const style = chunkStyle(this.seed, cx, cy)
    const dark = style === 3
    const red = style === 4
    const wallMat = red ? this.redWallMat : this.wallMat

    // full walls + chest-high barriers
    const addInstances = (value: number, geo: THREE.BoxGeometry, height: number) => {
      let count = 0
      for (let i = 0; i < cells.length; i++) if (cells[i] === value) count++
      if (count === 0) return
      const mesh = new THREE.InstancedMesh(geo, wallMat, count)
      const m = new THREE.Matrix4()
      let idx = 0
      for (let y = 0; y < CHUNK; y++) {
        for (let x = 0; x < CHUNK; x++) {
          if (cells[y * CHUNK + x] !== value) continue
          m.setPosition(originX + x * CELL + CELL / 2, height, originZ + y * CELL + CELL / 2)
          mesh.setMatrixAt(idx++, m)
        }
      }
      mesh.instanceMatrix.needsUpdate = true
      group.add(mesh)
    }
    addInstances(WALL, this.wallGeo, WALL_H / 2)
    addInstances(LOW, this.lowGeo, 1.15 / 2)

    // floor + ceiling
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(sizeW, sizeW),
      red ? this.redFloorMat : this.floorMat
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.set(originX + sizeW / 2, 0, originZ + sizeW / 2)
    group.add(floor)
    const ceil = new THREE.Mesh(
      new THREE.PlaneGeometry(sizeW, sizeW),
      red ? this.redCeilMat : dark ? this.darkCeilMat : this.ceilMat
    )
    ceil.rotation.x = Math.PI / 2
    ceil.position.set(originX + sizeW / 2, WALL_H, originZ + sizeW / 2)
    group.add(ceil)

    // light panels on a continuous world-aligned grid over open cells,
    // with the occasional dead panel so dark pockets exist for the smilers
    const panelCells: [number, number][] = []
    for (let y = 0; y < CHUNK; y++) {
      for (let x = 0; x < CHUNK; x++) {
        if (cells[y * CHUNK + x] === 1) continue
        const gx = cx * CHUNK + x
        const gy = cy * CHUNK + y
        const mod = (n: number, d: number) => ((n % d) + d) % d
        if (mod(gx, 3) !== 1 || mod(gy, 3) !== 1) continue
        // normal halls: 1 in 5 panels dead. dark halls: 4 in 5 dead.
        const roll = hash(this.seed, gx, gy, 0xdead) % 5
        if (dark ? roll !== 0 : roll === 0) continue
        panelCells.push([gx, gy])
      }
    }
    if (panelCells.length) {
      const panels = new THREE.InstancedMesh(
        this.panelGeo,
        red ? this.redPanelMat : this.panelMat,
        panelCells.length
      )
      const rot = new THREE.Matrix4().makeRotationX(Math.PI / 2)
      panelCells.forEach(([gx, gy], i) => {
        const pm = rot.clone()
        pm.setPosition(gx * CELL + CELL / 2, WALL_H - 0.03, gy * CELL + CELL / 2)
        panels.setMatrixAt(i, pm)
      })
      panels.instanceMatrix.needsUpdate = true
      group.add(panels)
    }

    return group
  }
}
