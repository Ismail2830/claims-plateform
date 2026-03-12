// Web Audio API sound generator — no external audio files needed

export function canPlaySound(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return (
      localStorage.getItem('ism_sound_muted') !== 'true' &&
      document.visibilityState === 'visible'
    )
  } catch {
    return false
  }
}

export function muteSound(): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem('ism_sound_muted', 'true') } catch { /* silent */ }
}

export function unmuteSound(): void {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem('ism_sound_muted') } catch { /* silent */ }
}

export function isSoundMuted(): boolean {
  if (typeof window === 'undefined') return true
  try { return localStorage.getItem('ism_sound_muted') === 'true' } catch { return true }
}

export function playSound(type: 'welcome' | 'alert' | 'success'): void {
  if (typeof window === 'undefined') return
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return

    const ctx = new AudioContextClass()

    const playNote = (freq: number, startTime: number, duration: number, gain: number) => {
      const osc = ctx.createOscillator()
      const gainNode = ctx.createGain()
      osc.connect(gainNode)
      gainNode.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, startTime)
      gainNode.gain.setValueAtTime(0, startTime)
      gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.01)
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration)
      osc.start(startTime)
      osc.stop(startTime + duration + 0.05)
    }

    const now = ctx.currentTime

    if (type === 'welcome') {
      // Soft chime: C5 then E5
      playNote(523, now, 0.15, 0.3)
      playNote(659, now + 0.18, 0.15, 0.3)
    } else if (type === 'alert') {
      // Gentle ping at A5 with slight vibrato
      const osc = ctx.createOscillator()
      const gainNode = ctx.createGain()
      osc.connect(gainNode)
      gainNode.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, now)
      // slight vibrato
      osc.frequency.linearRampToValueAtTime(900, now + 0.05)
      osc.frequency.linearRampToValueAtTime(880, now + 0.1)
      osc.frequency.linearRampToValueAtTime(870, now + 0.15)
      osc.frequency.linearRampToValueAtTime(880, now + 0.2)
      gainNode.gain.setValueAtTime(0, now)
      gainNode.gain.linearRampToValueAtTime(0.25, now + 0.01)
      gainNode.gain.linearRampToValueAtTime(0, now + 0.2)
      osc.start(now)
      osc.stop(now + 0.25)
    } else if (type === 'success') {
      // C-E-G arpeggio
      playNote(523, now, 0.12, 0.3)
      playNote(659, now + 0.14, 0.12, 0.3)
      playNote(784, now + 0.28, 0.12, 0.3)
    }

    // Close context after all notes finish
    setTimeout(() => {
      ctx.close().catch(() => { /* silent */ })
    }, 1500)
  } catch {
    // Never crash if AudioContext not supported
  }
}
