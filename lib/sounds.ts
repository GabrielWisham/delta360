// Delta 360 - Web Audio API synthesized notification sounds

import type { SoundName } from './types'

let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
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

const players: Record<SoundName, () => void> = {
  radar: playRadar,
  chime: playChime,
  click: playClick,
  alert: playAlert,
  sonar: playSonar,
  drop: playDrop,
}

export function playSound(name: SoundName) {
  try {
    players[name]?.()
  } catch {
    // AudioContext not available
  }
}

export function resumeAudio() {
  if (ctx?.state === 'suspended') ctx.resume()
}
