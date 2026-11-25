import { expect, test } from 'claude-code/testing'

const CARD = {
  plugin: 'theme-shuffle',
  surface: 'desktop',
  component: 'Placed',
  props: { plugin: 'theme-shuffle', id: 'theme-shuffle-card' },
} as const

test('list opens the card and prints no theme list', async ($, on) => {
  on('ui.place', () => ({ value: { isPlaced: true, requestId: 'card' } }))
  const { text } = await $.command.run({ command: 'theme-shuffle', args: 'list' })
  expect(text).toBe('Pick a theme on the card.')
})

test('Preview shows the picture at the top; Hold puts the card away', async ($, on) => {
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
  on('clock.after', () => ({ value: {} }))
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
  expect((await ui.find({ type: 'Text', text: /Previewing Snowdrift/ }))?.text).toBe('Previewing Snowdrift')
  expect(await ui.find({ type: 'Svg' })).toBeDefined()
  expect((await ui.find({ type: 'Button', key: 'preview-snowdrift' }))?.props.label).toBe('Previewing')

  await ui.press({ key: 'hold-aurora' })
  expect(toasts).toEqual(['Holding Aurora in every session.'])
  expect(store.get('settings')).toMatchObject({ on: true, hold: true })
  expect(store.get('current')).toMatchObject({ id: 'aurora' })
  expect(await ui.find({ type: 'Button', key: 'hold-aurora' })).toBeUndefined()
  await ui.unmount()
})
