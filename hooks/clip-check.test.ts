import { expect, test } from 'claude-code/testing'

import { checkClipsOncePerUpdate } from './clip-check'
import type { ClipCheckIo } from './clip-check'

function fake(playMs: number, version = '9.9.9') {
  const store = new Map<string, unknown>()
  const toasts: string[] = []
  let now = 0
  let plays = 0
  const io: ClipCheckIo = {
    version: async () => version,
    get: async key => store.get(key),
    set: async (key, value) => void store.set(key, value),
    now: async () => now,
    playSilence: async () => {
      plays += 1
      now += playMs
    },
    toast: text => void toasts.push(text),
  }
  return { io, store, toasts, plays: () => plays }
}

test('a skipped clip stays quiet and is checked once per version', async () => {
  const f = fake(0)
  await checkClipsOncePerUpdate(f.io)
  await checkClipsOncePerUpdate(f.io)
  expect(f.plays()).toBe(1)
  expect(f.toasts).toEqual([])
  expect(f.store.get('clip-check')).toEqual({ version: '9.9.9', works: false })
})

test('a clip that really plays brings one toast, ever', async () => {
  const f = fake(1000)
  await checkClipsOncePerUpdate(f.io)
  await checkClipsOncePerUpdate(f.io)
  expect(f.toasts.length).toBe(1)
  expect(f.toasts[0]).toContain('can play sound files now')
})
