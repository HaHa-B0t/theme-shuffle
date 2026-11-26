// Calm sounds for the themes that came without one. Like ./sounds, each is numbers the desktop app turns into tones
// and noise once the person turns theme sound on (the speaker button at the top of the window). Every one is soft:
// slow washes, low pads and a few far-apart notes, never a beat. A scene's day and night entries share one sound,
// so going from one to the other keeps the ambience playing.
import type { Sound } from './sounds'

type Layer = Record<string, unknown>

// Building blocks, so each sound below reads as what it is. A swell is clamped to the app's slowest, 0.05 a second.
const wash = (wave: 'pink' | 'brown' | 'white', hz: number, to: number, gain: number, swell = 0.08, depth = 0.35): Layer => ({
  wave,
  drone: true,
  gain,
  filter: { type: 'bandpass', hz, to },
  tremolo: { hz: Math.max(0.05, swell), depth },
})
const rumble = (hz: number, gain: number, swell = 0.06): Layer => ({
  wave: 'brown',
  drone: true,
  gain,
  filter: { type: 'lowpass', hz },
  tremolo: { hz: Math.max(0.05, swell), depth: 0.3 },
})
const pad = (notes: string[], gain: number, wave: 'sine' | 'triangle' = 'sine', hz = 1200, swell = 0.07): Layer => ({
  wave,
  notes,
  drone: true,
  gain,
  filter: { type: 'lowpass', hz },
  tremolo: { hz: Math.max(0.05, swell), depth: 0.25 },
})
const notes = (
  wave: 'sine' | 'triangle' | 'bell',
  list: string[],
  scatter: number,
  gain: number,
  release = 1.2,
  glide = 0,
  pan = 0,
): Layer => ({ wave, notes: list, scatter, attack: 0.01, release, gain, glide, pan })
const ticks = (scatter: number, gain: number, hz = 3000, release = 0.03): Layer => ({
  wave: 'crackle',
  scatter,
  attack: 0.002,
  release,
  gain,
  filter: { type: 'highpass', hz },
})

/**
 * Soft cues on the theme's own chord (root, third, fifth): two rising notes when you send, a warm open fifth with a
 * light third on top when Claude is done, a falling pair when Claude asks, and a low soft thud on an error. No tool
 * cue: tool calls come too often for a sound.
 */
function cues(chord: string[], wave: 'sine' | 'bell' | 'triangle' = 'sine', room = 0.35) {
  const [root = 'C5', third = 'E5', fifth = 'G5'] = chord
  // The root an octave down (never below octave 2), for the error's low note.
  const low = root.replace(/(\d)$/, (_m, o: string) => String(Math.max(2, Number(o) - 1)))
  return {
    send: { reverb: room * 0.6, layers: [{ wave, notes: [root, fifth], step: 0.09, attack: 0.004, release: 0.25, gain: 0.22 }] },
    done: {
      reverb: room,
      layers: [
        { wave: 'sine', notes: [root, fifth], attack: 0.06, release: 1.2, gain: 0.16, filter: { type: 'lowpass', hz: 1200 } },
        { wave, notes: [third], attack: 0.004, release: 0.25, gain: 0.1 },
      ],
    },
    ask: { reverb: room * 0.6, layers: [{ wave, notes: [fifth, third], step: 0.16, attack: 0.006, release: 0.5, gain: 0.2 }] },
    error: {
      reverb: room * 0.5,
      layers: [
        { wave: 'sine', notes: [low], glide: -7, attack: 0.006, release: 0.4, gain: 0.22, filter: { type: 'lowpass', hz: 900 } },
        { wave: 'brown', attack: 0.004, release: 0.2, gain: 0.12, filter: { type: 'lowpass', hz: 500 } },
      ],
    },
  }
}

function sound(ambience: Layer[], reverb: number, chord: string[], wave?: 'sine' | 'bell' | 'triangle'): Sound {
  return { ambience: { reverb, layers: ambience }, cues: cues(chord, wave, Math.min(0.6, reverb + 0.1)) } as unknown as Sound
}

// Chords for the cues: root, third, fifth of each sound's key.
const C_CHORD = ['C5', 'E5', 'G5']
const D_CHORD = ['D5', 'F#5', 'A5']
const G_CHORD = ['G4', 'B4', 'D5']
const AM_CHORD = ['A4', 'C5', 'E5']
const F_CHORD = ['F4', 'A4', 'C5']

// Scales: pentatonic, so any notes that fall together still sound calm.
const C_PENTA = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6']
const D_PENTA = ['D5', 'E5', 'F#5', 'A5', 'B5', 'D6']
const G_PENTA = ['G4', 'A4', 'B4', 'D5', 'E5', 'G5']
const A_MINOR = ['A4', 'C5', 'D5', 'E5', 'G5', 'A5']
const F_PENTA = ['F4', 'G4', 'A4', 'C5', 'D5', 'F5']

/** Gentle surf: a slow wave that breaks and pulls back, with foam hiss on top. */
const SHORE = sound(
  [
    wash('pink', 300, 900, 0.55, 0.09, 0.55),
    wash('white', 2500, 4200, 0.08, 0.09, 0.6),
    notes('sine', D_PENTA, 0.08, 0.1, 1.6),
  ],
  0.35,
  D_CHORD,
)

/** Under the surface: a deep hush, slow bubbles rising, a whale-low pad far off. */
const UNDERWATER = sound(
  [
    rumble(260, 0.6, 0.05),
    pad(['D3', 'A3'], 0.12, 'sine', 500, 0.05),
    notes('sine', ['A5', 'B5', 'D6', 'E6'], 0.25, 0.08, 0.15, 7),
  ],
  0.55,
  ['D4', 'F#4', 'A4'],
)

/** A still pond: soft water, a drip now and then, birds far away. */
const POND = sound(
  [
    wash('pink', 400, 650, 0.4, 0.12, 0.3),
    notes('sine', ['A5', 'B5', 'D6', 'E6'], 0.1, 0.16, 0.12, 5),
    notes('sine', ['E6', 'G6', 'A6'], 0.05, 0.06, 0.4, 3, 0.6),
  ],
  0.3,
  G_CHORD,
)

/** A breeze through leaves, a few birds, insects at the edge of hearing. */
const GARDEN = sound(
  [
    wash('pink', 900, 1800, 0.3, 0.07, 0.45),
    notes('sine', ['B6', 'D7', 'E7', 'G6'], 0.12, 0.06, 0.18, 4, -0.5),
    { wave: 'sine', notes: ['E7'], scatter: 0.3, attack: 0.002, release: 0.05, gain: 0.025, tremolo: { hz: 18, depth: 0.8 }, pan: 0.5 },
  ],
  0.25,
  G_CHORD,
)

/** Night garden: crickets and a slow warm pad. */
const NIGHT_GARDEN = sound(
  [
    pad(['G3', 'D4'], 0.1, 'sine', 700),
    { wave: 'sine', notes: ['B6', 'C7'], scatter: 0.6, attack: 0.003, release: 0.08, gain: 0.03, tremolo: { hz: 24, depth: 0.9 }, pan: -0.4 },
    { wave: 'sine', notes: ['A6'], scatter: 0.35, attack: 0.003, release: 0.08, gain: 0.025, tremolo: { hz: 20, depth: 0.9 }, pan: 0.5 },
    wash('pink', 600, 900, 0.12, 0.05),
  ],
  0.35,
  G_CHORD,
)

/** Dawn: a soft rising pad and the first birds. */
const DAWN = sound(
  [pad(['C4', 'G4', 'E5'], 0.14, 'sine', 1400, 0.05), notes('sine', ['G6', 'A6', 'C7', 'E7'], 0.1, 0.05, 0.2, 5), wash('pink', 700, 1200, 0.12)],
  0.4,
  C_CHORD,
)

/** Dusk: the same pad, lower and warmer, and evening's first crickets. */
const DUSK = sound(
  [pad(['A3', 'E4', 'C5'], 0.15, 'triangle', 900, 0.05), notes('bell', A_MINOR, 0.06, 0.07, 2), { wave: 'sine', notes: ['B6'], scatter: 0.3, attack: 0.003, release: 0.08, gain: 0.02, tremolo: { hz: 22, depth: 0.9 } }],
  0.45,
  AM_CHORD,
)

/** Desert wind: a hollow gust that comes and goes, sand hissing on the crest. */
const DUNES = sound(
  [wash('pink', 250, 700, 0.5, 0.06, 0.6), wash('white', 3500, 5000, 0.05, 0.11, 0.7), pad(['D3', 'A3'], 0.07, 'sine', 500)],
  0.4,
  ['D4', 'F4', 'A4'],
)

/** Falling snow: a hushed wind and tiny bells, like ice in the branches. */
export const SNOW = sound(
  [wash('pink', 500, 1100, 0.32, 0.05, 0.45), notes('bell', ['E6', 'G6', 'A6', 'B6', 'D7'], 0.15, 0.05, 2.2), pad(['E3', 'B3'], 0.07, 'sine', 600)],
  0.5,
  ['E5', 'G5', 'B5'],
  'bell',
)

/** A clear night sky: a slow pad and a star-like bell now and then. */
const STARS = sound(
  [pad(['F3', 'C4', 'A4'], 0.13, 'sine', 900, 0.04), notes('bell', F_PENTA.map(n => n.replace('4', '6').replace('5', '6')), 0.08, 0.06, 2.8)],
  0.6,
  F_CHORD,
  'bell',
)

/** Aurora: a wide shimmering pad that slowly moves, over a cold wind. */
const AURORA = sound(
  [pad(['D3', 'A3', 'E4', 'F#4'], 0.14, 'triangle', 1000, 0.06), wash('pink', 400, 1400, 0.16, 0.04, 0.5), notes('bell', ['A5', 'B5', 'D6', 'E6'], 0.05, 0.05, 3)],
  0.6,
  D_CHORD,
  'bell',
)

/** Ember: a fire's soft crackle and a low warm hum. */
const FIRE = sound(
  [ticks(4, 0.12, 1800, 0.04), rumble(220, 0.35, 0.09), pad(['A2', 'E3'], 0.08, 'sine', 400)],
  0.2,
  AM_CHORD,
)

/** Drifting clouds: airy wind and a slow open chord. */
const CLOUDS = sound(
  [wash('pink', 600, 1500, 0.3, 0.04, 0.5), pad(['C4', 'G4', 'D5'], 0.1, 'sine', 1100, 0.04)],
  0.5,
  C_CHORD,
)

/** Mountains at night: a deep drone, wind on the ridge, an echoing note far away. */
const RANGE = sound(
  [rumble(300, 0.3, 0.05), wash('pink', 350, 800, 0.18, 0.05), notes('triangle', ['A3', 'E4', 'A4'], 0.04, 0.08, 3)],
  0.65,
  AM_CHORD,
)

/** A quiet station late at night: a soft hall hum and the board's flaps settling. */
const STATION = sound(
  [rumble(400, 0.25, 0.04), ticks(1.5, 0.08, 2200, 0.025), pad(['F3', 'C4'], 0.06, 'sine', 600)],
  0.45,
  F_CHORD,
)

/** A drafting room: paper, a pen scratching now and then, a soft pad. */
const STUDIO = sound(
  [wash('pink', 1500, 2500, 0.08, 0.1, 0.4), ticks(0.8, 0.06, 4000, 0.06), pad(['C4', 'G4'], 0.08, 'sine', 900)],
  0.3,
  C_CHORD,
)

/** A magnetic field: a low even hum that breathes. */
const HUM = sound(
  [pad(['C3', 'G3', 'C4'], 0.13, 'sine', 600, 0.05), notes('sine', ['G5', 'C6', 'D6'], 0.05, 0.05, 2)],
  0.45,
  C_CHORD,
)

/** Small creatures at play: soft wood taps and a light pad. */
const PLAYFUL = sound(
  [pad(['D4', 'A4'], 0.08, 'sine', 900), notes('triangle', D_PENTA, 0.25, 0.06, 0.2), wash('pink', 800, 1200, 0.08)],
  0.25,
  D_CHORD,
  'triangle',
)

/** By the theme's id, its day and night entries under one name. */
export const AMBIENT: Readonly<Record<string, Sound>> = {
  'honu-lagoon': SHORE,
  'plotter-tide': SHORE,
  'sea-sparkle': SHORE,
  'koi-mosaic': POND,
  'duck-pond': POND,
  'ripple-tank': POND,
  'night-reef': UNDERWATER,
  'deep-water': UNDERWATER,
  'halftone-dawn': DAWN,
  'halftone-dusk': DUSK,
  'dither-dunes': DUNES,
  'paper-garden': GARDEN,
  'garden-beetles': GARDEN,
  'snow-pines': SNOW,
  snowdrift: SNOW,
  'braille-stars': STARS,
  'star-chart': STARS,
  aurora: AURORA,
  ember: FIRE,
  'teletext-clouds': CLOUDS,
  'vector-range': RANGE,
  'departure-board': STATION,
  blueprint: STUDIO,
  'field-lines': HUM,
  semicolony: PLAYFUL,
}

/** Night versions with a sound of their own, where the night scene sounds different from the day one. */
const NIGHT: Readonly<Record<string, Sound>> = {
  'garden-beetles': NIGHT_GARDEN,
  'paper-garden': NIGHT_GARDEN,
}

/** The calm sound for a theme without one: by its id, or by its day entry's id for a night or kraft entry. */
export function ambientFor(id: string): Sound | undefined {
  const day = id.replace(/-(night|kraft)$/, '')
  if (day !== id && NIGHT[day] !== undefined) return NIGHT[day]
  return AMBIENT[id] ?? AMBIENT[day]
}
