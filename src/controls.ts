// Unified input: pointer-lock mouse + WASD on desktop, virtual joystick +
// drag-look + buttons on touch devices (iPhone / iPad).

export class Controls {
  moveX = 0 // strafe -1..1
  moveY = 0 // forward -1..1
  sprint = false
  yaw = 0
  pitch = 0
  interactHeld = false
  readonly isTouch: boolean

  private interactEdge = false
  private lightEdge = false
  private keys = new Set<string>()
  private lookTouchId: number | null = null
  private stickTouchId: number | null = null
  private lastLook = { x: 0, y: 0 }

  constructor(canvas: HTMLCanvasElement) {
    this.isTouch = 'ontouchstart' in window && navigator.maxTouchPoints > 0

    if (!this.isTouch) {
      canvas.addEventListener('click', () => {
        if (document.pointerLockElement !== canvas) canvas.requestPointerLock()
      })
      document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement !== canvas) return
        this.yaw -= e.movementX * 0.0023
        this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch - e.movementY * 0.0023))
      })
      document.addEventListener('keydown', (e) => {
        if (e.repeat) return
        this.keys.add(e.code)
        if (e.code === 'KeyE') {
          this.interactEdge = true
          this.interactHeld = true
        }
        if (e.code === 'KeyF') this.lightEdge = true
      })
      document.addEventListener('keyup', (e) => {
        this.keys.delete(e.code)
        if (e.code === 'KeyE') this.interactHeld = false
      })
    } else {
      this.bindTouch()
    }
  }

  private bindTouch() {
    const stick = document.getElementById('stick')!
    const knob = document.getElementById('knob')!

    stick.addEventListener('touchstart', (e) => {
      e.preventDefault()
      this.stickTouchId = e.changedTouches[0].identifier
    })
    const moveStick = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier !== this.stickTouchId) continue
        const r = stick.getBoundingClientRect()
        let dx = (t.clientX - (r.left + r.width / 2)) / (r.width / 2)
        let dy = (t.clientY - (r.top + r.height / 2)) / (r.height / 2)
        const len = Math.hypot(dx, dy)
        if (len > 1) {
          dx /= len
          dy /= len
        }
        this.moveX = dx
        this.moveY = -dy
        knob.style.transform = `translate(${dx * 34}px, ${dy * 34}px)`
        // push past the rim to sprint
        this.sprint = len > 0.92
      }
    }
    stick.addEventListener('touchmove', (e) => {
      e.preventDefault()
      moveStick(e)
    })
    const endStick = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier !== this.stickTouchId) continue
        this.stickTouchId = null
        this.moveX = 0
        this.moveY = 0
        this.sprint = false
        knob.style.transform = ''
      }
    }
    stick.addEventListener('touchend', endStick)
    stick.addEventListener('touchcancel', endStick)

    // Anywhere on the right half of the screen: drag to look.
    window.addEventListener(
      'touchstart',
      (e) => {
        for (const t of Array.from(e.changedTouches)) {
          const el = e.target as HTMLElement
          if (el.closest('#stick') || el.closest('#btns') || el.closest('.screen')) continue
          if (this.lookTouchId === null && t.clientX > window.innerWidth * 0.35) {
            this.lookTouchId = t.identifier
            this.lastLook = { x: t.clientX, y: t.clientY }
          }
        }
      },
      { passive: false }
    )
    window.addEventListener(
      'touchmove',
      (e) => {
        for (const t of Array.from(e.changedTouches)) {
          if (t.identifier !== this.lookTouchId) continue
          e.preventDefault()
          this.yaw -= (t.clientX - this.lastLook.x) * 0.0045
          this.pitch = Math.max(
            -1.45,
            Math.min(1.45, this.pitch - (t.clientY - this.lastLook.y) * 0.0045)
          )
          this.lastLook = { x: t.clientX, y: t.clientY }
        }
      },
      { passive: false }
    )
    const endLook = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === this.lookTouchId) this.lookTouchId = null
      }
    }
    window.addEventListener('touchend', endLook)
    window.addEventListener('touchcancel', endLook)

    const bind = (id: string, down: () => void, up?: () => void) => {
      const el = document.getElementById(id)!
      el.addEventListener('touchstart', (e) => {
        e.preventDefault()
        down()
      })
      el.addEventListener('touchend', (e) => {
        e.preventDefault()
        up?.()
      })
    }
    bind(
      'b-act',
      () => {
        this.interactEdge = true
        this.interactHeld = true
      },
      () => (this.interactHeld = false)
    )
    bind('b-light', () => (this.lightEdge = true))
    bind(
      'b-run',
      () => (this.sprint = true),
      () => (this.sprint = false)
    )
  }

  update() {
    if (!this.isTouch) {
      this.moveX = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0)
      this.moveY =
        (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) -
        (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0)
      this.sprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')
    }
  }

  consumeInteract(): boolean {
    const v = this.interactEdge
    this.interactEdge = false
    return v
  }

  consumeLightToggle(): boolean {
    const v = this.lightEdge
    this.lightEdge = false
    return v
  }
}
