import { expect, test } from 'claude-code/testing'

import { ambientFor } from './ambient'
import { CUSTOM_THEMES, snowdriftSvg } from './custom-themes'
import { THEMES, sceneFault, sceneOf } from './themes'

// The app refuses an Svg source over this many characters.
const SVG_LIMIT = 131_072

type Layer = { notes?: unknown[]; step?: number; attack?: number; release?: number; drone?: boolean; scatter?: number }
type Cue = { layers: Layer[] }

test('every scene draws and fits the Svg limit', () => {
  for (const theme of [...CUSTOM_THEMES, ...THEMES]) {
    expect(sceneFault(theme)).toBeUndefined()
    expect(sceneOf(theme).length).toBeLessThanOrEqual(SVG_LIMIT)
  }
  // Snowdrift at its fullest: deep snow, both figures, the skier mid-run, the phase block.
  expect(snowdriftSvg({ context: 100, fiveHour: 100, skiAt: 0 }, 1000).length).toBeLessThanOrEqual(SVG_LIMIT)
})

test('every theme has a sound, and every cue is short and well formed', () => {
  for (const theme of [...CUSTOM_THEMES, ...THEMES]) {
    const sound = (theme.sound ?? ambientFor(theme.id)) as { ambience?: { layers: Layer[] }; cues?: Record<string, Cue> }
    expect(sound).toBeDefined()
    const ambience = sound.ambience?.layers ?? []
    expect(ambience.length).toBeGreaterThan(0)
    expect(ambience.length).toBeLessThanOrEqual(8)
    for (const [name, cue] of Object.entries(sound.cues ?? {})) {
      expect(cue.layers.length).toBeGreaterThan(0)
      for (const layer of cue.layers) {
        // A cue layer plays and ends: no drone, no scatter, done within 4 seconds.
        expect(layer.drone).toBeUndefined()
        expect(layer.scatter).toBeUndefined()
        const count = layer.notes?.length ?? 1
        const length = (count - 1) * (layer.step ?? 0) + (layer.attack ?? 0.005) + (layer.release ?? 0.4)
        if (length > 4) throw new Error(`${theme.id} ${name} cue runs ${length} s`)
      }
    }
  }
  const aurora = ambientFor('aurora') as { cues: Record<string, unknown> }
  expect(aurora.cues.error).toBeDefined()
  expect(aurora.cues.tool).toBeUndefined()
})

test('Snowdrift: the skier runs only just after the context grew', () => {
  expect(snowdriftSvg({ context: 40, skiAt: 1000 }, 2000)).toContain('s-ski"')
  expect(snowdriftSvg({ context: 40, skiAt: 1000 }, 20_000)).not.toContain('class="s-ski"')
  expect(snowdriftSvg({ context: 40 }, 2000)).not.toContain('class="s-ski"')
})

test('Snowdrift: loops keep their phase across redraws, and an unknown context shows a dash', () => {
  expect(snowdriftSvg({ context: 20 }, 90_000)).toContain('.s-fall-a{animation-delay:-30.0s}')
  expect(snowdriftSvg({ context: 20 })).not.toContain('.s-fall-a{animation-delay')
  const unknown = snowdriftSvg({})
  expect(unknown).toContain('>—<')
  expect(unknown).not.toContain('>0%<')
  expect(snowdriftSvg({ context: 0 })).toContain('>0%<')
})
