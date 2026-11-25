// Scenes, themes and sounds are copied from the theme-examples plugin (Apache-2.0, see LICENSE).
import type { EngineInterface, Register, Timer } from 'claude-code'

import { overShader } from './interactive'
import { THEMES, sceneFault, sceneOf } from './themes'
import type { Theme } from './themes'

const PLUGIN = 'theme-shuffle'
const COMMAND = 'theme-shuffle'
const PICKER = 'theme-examples'
const TICK_MS = 15_000

type Pool = 'all' | 'light' | 'dark'
type Settings = { on: boolean; minutes: number; pool: Pool }
/** The theme every session shows, and when it was picked. One record for every session and project. */
type Current = { id: string; at: number }

const SETTINGS = 'settings'
const CURRENT = 'current'
const DEFAULTS: Settings = { on: true, minutes: 5, pool: 'all' }

let ticker: Timer | undefined
let shown: string | undefined

function themeOf(id: string | undefined): Theme | undefined {
  return THEMES.find(theme => theme.id === id)
}

function keyOf(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function themeNamed(text: string): Theme | undefined {
  const key = keyOf(text)
  return THEMES.find(theme => theme.id === key || keyOf(theme.title) === key)
}

function inPool(theme: Theme, pool: Pool): boolean {
  return pool === 'all' || theme.window === pool
}

function pick(pool: Pool, not: string | undefined): Theme {
  const choices = THEMES.filter(theme => inPool(theme, pool) && theme.id !== not && sceneFault(theme) === undefined)
  return choices[Math.floor(Math.random() * choices.length)] ?? (THEMES[0] as Theme)
}

async function loadSettings($: EngineInterface): Promise<Settings> {
  try {
    const stored = (await $.store.get(SETTINGS)) as Partial<Settings> | undefined
    return { ...DEFAULTS, ...(stored ?? {}) }
  } catch {
    return DEFAULTS
  }
}

async function loadCurrent($: EngineInterface): Promise<Current | undefined> {
  try {
    const stored = (await $.store.get(CURRENT)) as Current | undefined
    return stored !== undefined && themeOf(stored.id) !== undefined ? stored : undefined
  } catch {
    return undefined
  }
}

/** Puts a theme behind this session's chat, with its sound where the app takes it. */
async function show($: EngineInterface, theme: Theme): Promise<void> {
  if (shown === theme.id) return
  const base = {
    backdrop: { scene: theme.id, glass: theme.glass },
    overrideColorScheme: theme.window,
  }
  try {
    await $.theme.set(theme.sound === undefined ? base : { ...base, sound: theme.sound })
  } catch {
    await $.theme.set(base)
  }
  shown = theme.id
}

/** Picks a new shared theme now: the one named, or a random one from the pool. */
async function choose($: EngineInterface, settings: Settings, named?: Theme): Promise<Theme> {
  const was = await loadCurrent($)
  const theme = named ?? pick(settings.pool, was?.id)
  const record: Current = { id: theme.id, at: await $.clock.now() }
  await $.store.set(CURRENT, record)
  return theme
}

/**
 * Every session runs this: when the shared theme is due, the first session to see it picks the next one;
 * every session then shows whatever the shared record names.
 */
async function sync($: EngineInterface): Promise<void> {
  const settings = await loadSettings($)
  if (!settings.on) {
    shown = undefined
    return
  }
  const current = await loadCurrent($)
  const now = await $.clock.now()
  const theme = themeOf(current?.id)
  const due =
    theme === undefined || !inPool(theme, settings.pool) || now - (current?.at ?? 0) >= settings.minutes * 60_000
  await show($, due || theme === undefined ? await choose($, settings) : theme)
}

function quietly($: EngineInterface, step: () => Promise<void>): void {
  step().catch(error => {
    void $.ui.log(`theme-shuffle: ${String(error)}`, { to: 'debug' })
  })
}

const HELP =
  `/${COMMAND} on | off | now | <minutes> | light | dark | all | <theme name>. ` +
  'Applies to every session and project. Running /custom-theme turns shuffle off so your pick works.'

function describe(s: Settings, current: Theme | undefined): string {
  if (!s.on) return 'Shuffle is off. /custom-theme works again; the current backdrop stays until you pick one.'
  const now = current === undefined ? '' : `. Now: ${current.title}`
  return `Shuffling every ${s.minutes} min (${s.pool} themes) in every session${now}.`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    try {
      await $.command.register({
        name: COMMAND,
        description: 'Shuffle backdrops everywhere: on, off, now, <minutes>, light, dark, all, or a theme name.',
        argumentHint: 'on|off|now|<minutes>|light|dark|all|<name>',
      })
    } catch (error) {
      void $.ui.log(`theme-shuffle: /${COMMAND} not available (${String(error)})`)
    }
    ticker?.cancel()
    ticker = $.clock.every(TICK_MS, () => quietly($, () => sync($)))
    quietly($, () => sync($))
    return next(e)
  })

  // While shuffle is on, theme-examples' own sets and clears are held, so the two never fight.
  on('theme.set', async ($, e, next) => {
    if (next.origin.plugin === PICKER && (await loadSettings($)).on) {
      return { isDrawn: false, reason: `theme-shuffle is on. Run /${COMMAND} off to pick your own theme.` }
    }
    return next(e)
  })

  on('theme.clear', async ($, e, next) => {
    if (next.origin.plugin === PICKER && (await loadSettings($)).on) {
      return { isDrawn: false, reason: `theme-shuffle is on. Run /${COMMAND} off to clear it.` }
    }
    return next(e)
  })

  // A person reaching for /custom-theme (the card or a name) wants to pick: shuffle steps aside everywhere.
  on('command.run', { command: 'custom-theme' }, async ($, e, next) => {
    const asked = e.args.trim().toLowerCase()
    if (e.origin.kind !== 'plugin' && asked !== 'list') {
      const settings = await loadSettings($)
      if (settings.on) {
        await $.store.set(SETTINGS, { ...settings, on: false })
        shown = undefined
        void $.ui.toast(`Theme shuffle is off so you can pick. /${COMMAND} on starts it again.`)
      }
    }
    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.props.plugin !== PLUGIN || e.surface !== 'desktop') return next(e)
    const theme = themeOf(typeof e.props.scene === 'string' ? e.props.scene : undefined)
    if (theme === undefined) return next(e)
    const { Svg, Shader } = $.ui.resolve(e)
    return overShader(
      Shader,
      theme.shader,
      <Svg isInteractive alt={`${theme.title}: ${theme.blurb}`} source={sceneOf(theme)} />,
    )
  })

  on('command.run', { command: COMMAND }, async ($, e) => {
    const word = e.args.trim().toLowerCase()
    const settings = await loadSettings($)
    let changed: Settings
    let named: Theme | undefined

    if (word === '') return { text: `${describe(settings, themeOf((await loadCurrent($))?.id))} ${HELP}` }
    if (word === 'off') changed = { ...settings, on: false }
    else if (word === 'on' || word === 'now') changed = { ...settings, on: true }
    else if (word === 'light' || word === 'dark' || word === 'all') changed = { ...settings, pool: word, on: true }
    else if (/^\d+(\.\d+)?$/.test(word) && Number(word) >= 1) changed = { ...settings, minutes: Number(word), on: true }
    else if ((named = themeNamed(word)) !== undefined) changed = { ...settings, on: true }
    else return { text: `No option or theme "${word}". ${HELP}` }

    await $.store.set(SETTINGS, changed)
    if (!changed.on) {
      shown = undefined
      return { text: describe(changed, undefined) }
    }

    // A new pick for "now", a name, a different pool or turning it back on; else keep the timing.
    const fresh = word === 'now' || named !== undefined || !settings.on || changed.pool !== settings.pool
    const theme = fresh ? await choose($, changed, named) : themeOf((await loadCurrent($))?.id)
    if (theme !== undefined) await show($, theme)
    return { text: describe(changed, theme) }
  })
}
