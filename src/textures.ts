// All textures are painted on canvases at boot — no asset files. Tuned to
// match the reference shots: pale-yellow chevron wallpaper, mustard speckled
// carpet, off-white drop-ceiling tiles.
import * as THREE from 'three'

function canvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas')
  c.width = c.height = size
  return [c, c.getContext('2d')!]
}

function speckle(
  ctx: CanvasRenderingContext2D,
  size: number,
  count: number,
  colors: string[],
  maxR = 1.6
) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[(Math.random() * colors.length) | 0]
    ctx.globalAlpha = 0.25 + Math.random() * 0.5
    const r = 0.4 + Math.random() * maxR
    ctx.beginPath()
    ctx.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

function asTexture(c: HTMLCanvasElement, repeatX = 1, repeatY = 1): THREE.Texture {
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeatX, repeatY)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

export function wallpaperTexture(): THREE.Texture {
  const size = 512
  const [c, ctx] = canvas(size)
  ctx.fillStyle = '#cfc98a'
  ctx.fillRect(0, 0, size, size)

  // Vertical columns of stacked chevrons, like the classic Level 0 wallpaper.
  const colW = 64
  for (let col = 0; col < size / colW; col++) {
    const x = col * colW + colW / 2
    for (let y = -32; y < size + 32; y += 48) {
      ctx.strokeStyle = col % 2 === 0 ? '#a8b6b8' : '#b5ad6e'
      ctx.lineWidth = 7
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(x - 16, y + 22)
      ctx.lineTo(x, y)
      ctx.lineTo(x + 16, y + 22)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(120,110,60,0.5)'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(x - 16, y + 30)
      ctx.lineTo(x, y + 8)
      ctx.lineTo(x + 16, y + 30)
      ctx.stroke()
    }
    // thin separator lines between columns
    ctx.strokeStyle = 'rgba(110,100,55,0.35)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(col * colW, 0)
    ctx.lineTo(col * colW, size)
    ctx.stroke()
  }
  speckle(ctx, size, 1500, ['#b9b378', '#ded8a0', '#9c9560'])
  // damp stains near the bottom edge
  for (let i = 0; i < 8; i++) {
    const g = ctx.createRadialGradient(
      Math.random() * size, size - Math.random() * 60, 4,
      Math.random() * size, size - 20, 70
    )
    g.addColorStop(0, 'rgba(90,80,40,0.18)')
    g.addColorStop(1, 'rgba(90,80,40,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, size - 140, size, 140)
  }
  return asTexture(c, 1, 1)
}

export function carpetTexture(): THREE.Texture {
  const size = 512
  const [c, ctx] = canvas(size)
  ctx.fillStyle = '#86793f'
  ctx.fillRect(0, 0, size, size)
  speckle(ctx, size, 14000, ['#6e6334', '#9c8f4d', '#5d5329', '#a89a58', '#4a4220'], 1.2)
  // faint matted streaks
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = `rgba(60,52,24,${0.04 + Math.random() * 0.05})`
    ctx.lineWidth = 6 + Math.random() * 14
    ctx.beginPath()
    const y = Math.random() * size
    ctx.moveTo(0, y)
    ctx.bezierCurveTo(size / 3, y + 30 * (Math.random() - 0.5), (2 * size) / 3, y + 30 * (Math.random() - 0.5), size, y)
    ctx.stroke()
  }
  return asTexture(c, 4, 4)
}

export function ceilingTexture(): THREE.Texture {
  const size = 512
  const [c, ctx] = canvas(size)
  ctx.fillStyle = '#c9c3a2'
  ctx.fillRect(0, 0, size, size)
  speckle(ctx, size, 9000, ['#aaa482', '#b8b292', '#979065'], 1.0)
  // 2x2 tile grid per texture repeat
  ctx.strokeStyle = 'rgba(80,75,50,0.55)'
  ctx.lineWidth = 5
  for (let i = 0; i <= 2; i++) {
    ctx.beginPath()
    ctx.moveTo((i * size) / 2, 0)
    ctx.lineTo((i * size) / 2, size)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, (i * size) / 2)
    ctx.lineTo(size, (i * size) / 2)
    ctx.stroke()
  }
  // water damage blotches
  for (let i = 0; i < 6; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const g = ctx.createRadialGradient(x, y, 2, x, y, 26 + Math.random() * 30)
    g.addColorStop(0, 'rgba(105,90,45,0.30)')
    g.addColorStop(1, 'rgba(105,90,45,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
  }
  return asTexture(c, 2, 2)
}

export function tapeLabelTexture(): THREE.Texture {
  const size = 256
  const [c, ctx] = canvas(size)
  ctx.fillStyle = '#111'
  ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = '#e8e2cf'
  ctx.fillRect(20, 78, size - 40, 100)
  ctx.fillStyle = '#1a1a1a'
  ctx.font = 'bold 34px Courier, monospace'
  ctx.textAlign = 'center'
  ctx.fillText('LOST TAPE', size / 2, 122)
  ctx.font = '22px Courier, monospace'
  ctx.fillText('DO NOT WATCH', size / 2, 156)
  ctx.strokeStyle = '#900'
  ctx.lineWidth = 4
  ctx.strokeRect(20, 78, size - 40, 100)
  return asTexture(c)
}

export function exitDoorTexture(): THREE.Texture {
  const size = 256
  const [c, ctx] = canvas(size)
  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, size, size)
  const g = ctx.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, size / 2)
  g.addColorStop(0, '#fffef0')
  g.addColorStop(0.5, '#dcd8b0')
  g.addColorStop(1, '#0a0a0a')
  ctx.fillStyle = g
  ctx.fillRect(8, 8, size - 16, size - 16)
  return asTexture(c)
}

export function nameSprite(text: string, color = '#ffe9a8'): THREE.Sprite {
  const [c, ctx] = canvas(256)
  c.height = 64
  ctx.font = 'bold 36px Courier, monospace'
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  ctx.fillRect(0, 0, 256, 64)
  ctx.fillStyle = color
  ctx.fillText(text.slice(0, 12), 128, 44)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }))
  sprite.scale.set(1.6, 0.4, 1)
  return sprite
}

export function smileTexture(): THREE.Texture {
  const size = 256
  const [c, ctx] = canvas(size)
  ctx.clearRect(0, 0, size, size)
  ctx.strokeStyle = '#ffffff'
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = '#dffcff'
  ctx.shadowBlur = 18
  // two hollow eyes
  ctx.lineWidth = 7
  ctx.beginPath()
  ctx.arc(88, 92, 17, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(168, 92, 17, 0, Math.PI * 2)
  ctx.stroke()
  // wide grin of teeth
  ctx.lineWidth = 10
  ctx.beginPath()
  ctx.arc(size / 2, 110, 78, 0.25 * Math.PI, 0.75 * Math.PI)
  ctx.stroke()
  for (let i = 0; i <= 8; i++) {
    const a = 0.27 * Math.PI + (i / 8) * 0.46 * Math.PI
    const x = size / 2 + Math.cos(a) * 78
    const y = 110 + Math.sin(a) * 78
    ctx.beginPath()
    ctx.moveTo(x, y - 10)
    ctx.lineTo(x, y + 10)
    ctx.lineWidth = 5
    ctx.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
