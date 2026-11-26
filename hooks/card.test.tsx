import { expect, test } from 'claude-code/testing'

const CARD = {
  plugin: 'theme-shuffle',
  surface: 'desktop',
  component: 'Placed',
  props: { plugin: 'theme-shuffle', id: 'theme-shuffle-card' },
} as const

test('list opens the card with its own wording and prints no theme list', async ($, on) => {
  on('ui.place', () => ({ value: { isPlaced: true, requestId: 'card' } }))
  const { text } = await $.command.run({ command: 'theme-shuffle', args: 'list' })
  expect(text).toBe('Theme shuffle card is open below.')
})

test('a second list places a fresh row, and only the newest row draws the card', async ($, on) => {
  const ids: string[] = []
  on('ui.place', (_, e) => {
    ids.push(String((e as { id: unknown }).id))
    return { value: { isPlaced: true, requestId: `r${ids.length}` } }
  })
  on('ui.render', ($$, e) => {
    const { Box } = $$.ui.resolve(e)
    return <Box key="none" />
  })
  await $.command.run({ command: 'theme-shuffle', args: 'list' })
  // Row ids carry a time stamp; wait a moment so the second differs.
  await new Promise(resolve => setTimeout(resolve, 5))
  await $.command.run({ command: 'theme-shuffle', args: 'list' })
  expect(ids.length).toBe(2)
  expect(ids[0]).not.toBe(ids[1])
  const old = await $.ui.mount({ ...CARD, props: { plugin: 'theme-shuffle', id: ids[0] as string } })
  expect(await old.find({ type: 'Button', key: 'close' })).toBeUndefined()
  await old.unmount()
  const fresh = await $.ui.mount({ ...CARD, props: { plugin: 'theme-shuffle', id: ids[1] as string } })
  expect(await fresh.find({ type: 'Button', key: 'close' })).toBeDefined()
  await fresh.unmount()
})

test('Preview counts down with Stop preview and no picture; Hold puts the card away', async ($, on) => {
  const set: string[] = []
  const toasts: string[] = []
  const store = new Map<string, unknown>()
  on('store.get', (_, e) => ({ value: store.get((e as { key: string }).key) }))
  on('store.set', (_, e) => {
    const { key, value } = e as { key: string; value: unknown }
    store.set(key, value)
    return { value: undefined }
  })
  on('theme.set', (_, e) => {
    const scene = (e.backdrop as { scene?: string } | undefined)?.scene
    if (scene !== undefined) set.push(scene)
    return { value: { isDrawn: true, requestId: 'backdrop' } }
  })
  let cleared = 0
  on('theme.clear', () => { cleared += 1; return { value: { isDrawn: true, requestId: 'clear' } } })
  on('clock.every', () => ({ value: {} }))
  on('clock.now', () => ({ value: 1_000_000 }))
  on('ui.toast', (_, e) => { toasts.push(String((e as { text?: unknown }).text)); return { value: undefined } })

  // Stands for the engine beneath: a put-away card draws nothing.
  on('ui.render', ($$, e) => {
    const { Box } = $$.ui.resolve(e)
    return <Box key="none" />
  })
  const ui = await $.ui.mount(CARD)
  expect(await ui.find({ type: 'Button', key: 'preview-snowdrift' })).toBeDefined()
  expect(await ui.find({ type: 'Svg' })).toBeUndefined()

  await ui.press({ key: 'preview-snowdrift' })
  expect((await ui.find({ type: 'Text', text: /Previewing Snowdrift/ }))?.text).toMatch(/^Previewing Snowdrift: back in ([1-9]|1[0-9]|20)s$/)
  expect(await ui.find({ type: 'Svg' })).toBeUndefined()
  expect((await ui.find({ type: 'Button', key: 'preview-snowdrift' }))?.props.label).toBe('Previewing')

  await ui.press({ key: 'stop-preview' })
  expect(await ui.find({ type: 'Button', key: 'stop-preview' })).toBeUndefined()
  // Nothing shared to go back to here, so the preview hands the window back to the app's own look.
  expect(cleared).toBe(1)

  await ui.press({ key: 'hold-aurora' })
  expect(toasts).toEqual(['Holding Aurora in every session.'])
  expect(store.get('settings')).toMatchObject({ on: true, hold: true })
  expect(store.get('current')).toMatchObject({ id: 'aurora' })
  expect(await ui.find({ type: 'Button', key: 'hold-aurora' })).toBeUndefined()
  await ui.unmount()
})
