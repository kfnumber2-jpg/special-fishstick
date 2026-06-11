// All sound is synthesised with WebAudio — fluorescent hum, footsteps on
// carpet, heartbeat when something is close, VHS static, jumpscare stingers.
// iOS only unlocks audio inside a user gesture, so call unlock() from the
// join-button handler.

let ctx: AudioContext | null = null
let humGain: GainNode | null = null
let heartGain: GainNode | null = null
let heartTimer = 0

export function unlock() {
  if (ctx) {
    void ctx.resume()
    return
  }
  ctx = new AudioContext()
  startHum()
  startHeartbeat()
}

function noiseBuffer(seconds: number): AudioBuffer {
  const buf = ctx!.createBuffer(1, ctx!.sampleRate * seconds, ctx!.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return buf
}

// The endless fluorescent buzz of Level 0.
function startHum() {
  const osc = ctx!.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.value = 120
  const osc2 = ctx!.createOscillator()
  osc2.type = 'sine'
  osc2.frequency.value = 59.7 // slightly detuned mains hum
  const filt = ctx!.createBiquadFilter()
  filt.type = 'lowpass'
  filt.frequency.value = 400
  humGain = ctx!.createGain()
  humGain.gain.value = 0.018
  osc.connect(filt)
  osc2.connect(filt)
  filt.connect(humGain)
  humGain.connect(ctx!.destination)
  osc.start()
  osc2.start()
}

export function setHumIntensity(v: number) {
  if (humGain && ctx) humGain.gain.setTargetAtTime(0.018 * v, ctx.currentTime, 0.5)
}

function startHeartbeat() {
  heartGain = ctx!.createGain()
  heartGain.gain.value = 0
  heartGain.connect(ctx!.destination)
  const thump = () => {
    if (!ctx) return
    const t = ctx.currentTime
    for (const off of [0, 0.18]) {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.setValueAtTime(55, t + off)
      o.frequency.exponentialRampToValueAtTime(30, t + off + 0.12)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.9, t + off)
      g.gain.exponentialRampToValueAtTime(0.001, t + off + 0.14)
      o.connect(g)
      g.connect(heartGain!)
      o.start(t + off)
      o.stop(t + off + 0.16)
    }
    heartTimer = window.setTimeout(thump, 850)
  }
  thump()
  void heartTimer
}

// danger: 0..1 — how close the nearest creature is.
export function setHeartbeat(danger: number) {
  if (heartGain && ctx) heartGain.gain.setTargetAtTime(danger * 0.5, ctx.currentTime, 0.3)
}

export function footstep(running: boolean) {
  if (!ctx) return
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(0.09)
  const filt = ctx.createBiquadFilter()
  filt.type = 'lowpass'
  filt.frequency.value = running ? 700 : 420
  const g = ctx.createGain()
  g.gain.setValueAtTime(running ? 0.16 : 0.09, ctx.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09)
  src.connect(filt)
  filt.connect(g)
  g.connect(ctx.destination)
  src.start()
}

export function stinger() {
  if (!ctx) return
  const t = ctx.currentTime
  for (const f of [220, 233, 466]) {
    const o = ctx.createOscillator()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(f, t)
    o.frequency.exponentialRampToValueAtTime(f * 0.5, t + 0.7)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.16, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.8)
    o.connect(g)
    g.connect(ctx.destination)
    o.start(t)
    o.stop(t + 0.85)
  }
  staticBurst(0.4, 0.1)
}

export function staticBurst(duration = 0.3, vol = 0.12) {
  if (!ctx) return
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(duration)
  const g = ctx.createGain()
  g.gain.setValueAtTime(vol, ctx.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  src.connect(g)
  g.connect(ctx.destination)
  src.start()
}

export function tapeChime() {
  if (!ctx) return
  const t = ctx.currentTime
  ;[523, 659, 784].forEach((f, i) => {
    const o = ctx!.createOscillator()
    o.type = 'triangle'
    o.frequency.value = f
    const g = ctx!.createGain()
    g.gain.setValueAtTime(0.0001, t + i * 0.09)
    g.gain.exponentialRampToValueAtTime(0.12, t + i * 0.09 + 0.02)
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.5)
    o.connect(g)
    g.connect(ctx!.destination)
    o.start(t + i * 0.09)
    o.stop(t + i * 0.09 + 0.55)
  })
  staticBurst(0.25, 0.06)
}

export function whisper() {
  if (!ctx) return
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(1.2)
  const filt = ctx.createBiquadFilter()
  filt.type = 'bandpass'
  filt.frequency.setValueAtTime(900, ctx.currentTime)
  filt.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 1.0)
  filt.Q.value = 8
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.08, ctx.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2)
  src.connect(filt)
  filt.connect(g)
  g.connect(ctx.destination)
  src.start()
}

export function alarm() {
  if (!ctx) return
  const t = ctx.currentTime
  for (let i = 0; i < 4; i++) {
    const o = ctx.createOscillator()
    o.type = 'square'
    o.frequency.value = i % 2 ? 392 : 311
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t + i * 0.45)
    g.gain.linearRampToValueAtTime(0.07, t + i * 0.45 + 0.05)
    g.gain.linearRampToValueAtTime(0.0001, t + i * 0.45 + 0.4)
    o.connect(g)
    g.connect(ctx.destination)
    o.start(t + i * 0.45)
    o.stop(t + i * 0.45 + 0.45)
  }
}
