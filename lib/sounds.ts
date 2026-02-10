// Delta 360 - Web Audio API synthesized notification sounds

import type { SoundName } from './types'

let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function playRadar() {
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(800, c.currentTime)
  osc.frequency.linearRampToValueAtTime(1400, c.currentTime + 0.15)
  osc.frequency.linearRampToValueAtTime(800, c.currentTime + 0.35)
  gain.gain.setValueAtTime(0.3, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.4)
  osc.connect(gain).connect(c.destination)
  osc.start()
  osc.stop(c.currentTime + 0.4)
}

function playChime() {
  const c = getCtx()
  ;[523, 659].forEach((freq, i) => {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.25, c.currentTime + i * 0.15)
    gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + i * 0.15 + 0.4)
    osc.connect(gain).connect(c.destination)
    osc.start(c.currentTime + i * 0.15)
    osc.stop(c.currentTime + i * 0.15 + 0.5)
  })
}

function playClick() {
  const c = getCtx()
  const bufferSize = c.sampleRate * 0.03
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }
  const source = c.createBufferSource()
  source.buffer = buffer
  const filter = c.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = 2000
  const gain = c.createGain()
  gain.gain.setValueAtTime(0.3, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.03)
  source.connect(filter).connect(gain).connect(c.destination)
  source.start()
}

function playAlert() {
  const c = getCtx()
  ;[0, 0.12].forEach(offset => {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'square'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.2, c.currentTime + offset)
    gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + offset + 0.08)
    osc.connect(gain).connect(c.destination)
    osc.start(c.currentTime + offset)
    osc.stop(c.currentTime + offset + 0.1)
  })
}

function playSonar() {
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(1200, c.currentTime)
  osc.frequency.exponentialRampToValueAtTime(600, c.currentTime + 0.5)
  gain.gain.setValueAtTime(0.3, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.6)
  osc.connect(gain).connect(c.destination)
  osc.start()
  osc.stop(c.currentTime + 0.7)
}

function playDrop() {
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(1800, c.currentTime)
  osc.frequency.exponentialRampToValueAtTime(200, c.currentTime + 0.25)
  gain.gain.setValueAtTime(0.3, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.3)
  osc.connect(gain).connect(c.destination)
  osc.start()
  osc.stop(c.currentTime + 0.35)
}

function playPulse() {
  const c = getCtx()
  ;[0, 0.2, 0.4].forEach(offset => {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'sine'
    osc.frequency.value = 440
    gain.gain.setValueAtTime(0.25, c.currentTime + offset)
    gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + offset + 0.12)
    osc.connect(gain).connect(c.destination)
    osc.start(c.currentTime + offset)
    osc.stop(c.currentTime + offset + 0.15)
  })
}

function playBeacon() {
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(600, c.currentTime)
  osc.frequency.linearRampToValueAtTime(900, c.currentTime + 0.3)
  osc.frequency.linearRampToValueAtTime(600, c.currentTime + 0.6)
  gain.gain.setValueAtTime(0, c.currentTime)
  gain.gain.linearRampToValueAtTime(0.3, c.currentTime + 0.1)
  gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.7)
  osc.connect(gain).connect(c.destination)
  osc.start()
  osc.stop(c.currentTime + 0.8)
}

function playRipple() {
  const c = getCtx()
  ;[261, 329, 392, 523].forEach((freq, i) => {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    const t = c.currentTime + i * 0.08
    gain.gain.setValueAtTime(0.2, t)
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25)
    osc.connect(gain).connect(c.destination)
    osc.start(t)
    osc.stop(t + 0.3)
  })
}

function playTrill() {
  const c = getCtx()
  ;[0, 0.06, 0.12, 0.18, 0.24].forEach((offset, i) => {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'sine'
    osc.frequency.value = i % 2 === 0 ? 1047 : 1319
    gain.gain.setValueAtTime(0.2, c.currentTime + offset)
    gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + offset + 0.05)
    osc.connect(gain).connect(c.destination)
    osc.start(c.currentTime + offset)
    osc.stop(c.currentTime + offset + 0.06)
  })
}

function playBlip() {
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(2400, c.currentTime)
  osc.frequency.exponentialRampToValueAtTime(800, c.currentTime + 0.08)
  gain.gain.setValueAtTime(0.35, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.1)
  osc.connect(gain).connect(c.destination)
  osc.start()
  osc.stop(c.currentTime + 0.12)
}

function playSiren() {
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(400, c.currentTime)
  osc.frequency.linearRampToValueAtTime(800, c.currentTime + 0.25)
  osc.frequency.linearRampToValueAtTime(400, c.currentTime + 0.5)
  osc.frequency.linearRampToValueAtTime(800, c.currentTime + 0.75)
  gain.gain.setValueAtTime(0.15, c.currentTime)
  gain.gain.setValueAtTime(0.15, c.currentTime + 0.65)
  gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.8)
  osc.connect(gain).connect(c.destination)
  osc.start()
  osc.stop(c.currentTime + 0.85)
}

const players: Record<SoundName, () => void> = {
  radar: playRadar,
  chime: playChime,
  click: playClick,
  alert: playAlert,
  sonar: playSonar,
  drop: playDrop,
  pulse: playPulse,
  beacon: playBeacon,
  ripple: playRipple,
  trill: playTrill,
  blip: playBlip,
  siren: playSiren,
}

export function playSound(name: SoundName) {
  try {
    players[name]?.()
  } catch {
    // AudioContext not available
  }
}

export function resumeAudio() {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()
}
