// Scenes, themes and sounds are copied from the theme-examples plugin (Apache-2.0, see LICENSE).
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import { CUSTOM_THEMES } from './custom-themes'
import type { ShuffleTheme } from './custom-themes'
import { overShader } from './interactive'
import { THEMES as COPIED, sceneFault, sceneOf } from './themes'
import type { CardState, LiveUsage } from '../types'

type Theme = ShuffleTheme
const THEMES: readonly Theme[] = [...CUSTOM_THEMES, ...COPIED]

const PLUGIN = 'theme-shuffle'
const COMMAND = 'theme-shuffle'
const PICKER = 'theme-examples'
const CARD = 'theme-shuffle-card'
const TICK_MS = 15_000

type Pool = 'all' | 'light' | 'dark'
/** on: the mod drives the backdrop. hold: it keeps the current theme everywhere instead of switching. */
type Settings = { on: boolean; hold: boolean; minutes: number; pool: Pool }
/** The theme every session shows, and when it was picked. One record for every session and project. */
type Current = { id: string; at: number }

const SETTINGS = 'settings'
const CURRENT = 'current'
const DEFAULTS: Settings = { on: true, hold: false, minutes: 5, pool: 'all' }

let ticker: Timer | undefined
let shown: string | undefined
// While a preview runs: the timer that ends it. Only this session previews; nothing is stored.
let previewEnding: Timer | undefined
const PREVIEW_MS = 20_000

// This session's figures for live themes. A write redraws the backdrop that reads it.
const usage = atom({ plugin: 'theme-shuffle', key: 'usage' } as const, {}, { shape: 'usage-2' })
// Where the theme card shows. A write redraws the card.
const card = atom({ plugin: 'theme-shuffle', key: 'card' } as const, {}, { shape: 'card-1' })

/**
 * Reads the context window and the 5-hour limit, and stores them only when a whole percent changed.
 * `ski` marks the update where the context grew, so Snowdrift's skier runs once for it.
 */
async function refreshUsage($: EngineInterface): Promise<void> {
  const now = await $.session.usage()
  const window = now.context.window
  const context =
    now.context.percent ?? (now.context.tokens !== undefined && window > 0 ? (now.context.tokens / window) * 100 : undefined)
  const fiveHour = now.rateLimits.find(limit => limit.kind === 'five_hour')?.percentUsed
  const was: LiveUsage = await read($, usage)
  const next: LiveUsage = {
    context: context === undefined ? undefined : Math.round(context),
    fiveHour: fiveHour === undefined ? undefined : Math.round(fiveHour),
  }
  if (was.context === next.context && was.fiveHour === next.fiveHour) return
  next.ski = was.context !== undefined && next.context !== undefined && next.context > was.context
  await update($, usage, () => next)
}

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

function pickRandom(pool: Pool, not: string | undefined): Theme {
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

async function saveSettings($: EngineInterface, settings: Settings): Promise<void> {
  await $.store.set(SETTINGS, settings)
}

async function loadCurrent($: EngineInterface): Promise<Current | undefined> {
  try {
    return (await $.store.get(CURRENT)) as Current | undefined
  } catch {
    return undefined
  }
}

/** Puts a theme behind this session's chat, with its sound where the app takes it. */
async function show($: EngineInterface, theme: Theme): Promise<void> {
  if (shown === theme.id) return
  const base = {
    // The scene name goes under both names: newer apps read `scene`, older ones `id`.
    backdrop: { scene: theme.id, id: theme.id, glass: theme.glass },
    overrideColorScheme: theme.window,
  }
  try {
    await $.theme.set(theme.sound === undefined ? base : { ...base, sound: theme.sound })
  } catch {
    try {
      await $.theme.set(base)
    } catch {
      // An app that takes no window kind beside the backdrop: the backdrop alone.
      await $.theme.set({ backdrop: base.backdrop })
    }
  }
  shown = theme.id
}

/** Makes a theme the shared one now: the one named, or a random one from the pool. */
async function choose($: EngineInterface, settings: Settings, named?: Theme): Promise<Theme> {
  const was = await loadCurrent($)
  const theme = named ?? pickRandom(settings.pool, was?.id)
  const record: Current = { id: theme.id, at: await $.clock.now() }
  await $.store.set(CURRENT, record)
  return theme
}

/**
 * Every session runs this: when the shared theme is due, the first session to see it picks the next one;
 * every session then shows whatever the shared record names.
 */
async function sync($: EngineInterface): Promise<void> {
  // A preview owns this session's backdrop until it ends.
  if (previewEnding !== undefined) return
  const settings = await loadSettings($)
  if (!settings.on) {
    shown = undefined
    return
  }
  const current = await loadCurrent($)
  const now = await $.clock.now()
  const theme = themeOf(current?.id)
  const expired = now - (current?.at ?? 0) >= settings.minutes * 60_000
  if (theme === undefined) {
    // A theme a newer copy of this mod added: leave it be until its time is up, rather than overwrite it.
    if (current !== undefined && !expired) return
    await show($, await choose($, settings))
    return
  }
  const due = !settings.hold && (!inPool(theme, settings.pool) || expired)
  await show($, due ? await choose($, settings) : theme)
}

function quietly($: EngineInterface, step: () => Promise<void>): void {
  step().catch(error => {
    void $.ui.log(`theme-shuffle: ${String(error)}`, { to: 'debug' })
  })
}

const HELP =
  `/${COMMAND} list (pick on a card) | now | hold | on | off | <minutes> | light | dark | all | <theme name>. ` +
  'Applies to every session and project. Running /custom-theme turns shuffle off so your pick works.'

function describe(s: Settings, current: Theme | undefined): string {
  if (!s.on) return 'Shuffle is off. /custom-theme works again; the current backdrop stays until you pick one.'
  const title = current === undefined ? 'the current theme' : current.title
  if (s.hold) return `Holding ${title} in every session. /${COMMAND} on starts shuffling again.`
  return `Shuffling every ${s.minutes} min (${s.pool} themes) in every session. Now: ${title}.`
}

/** Shows a theme everywhere. `hold`: keep it; otherwise the shuffle carries on from it. */
async function showEverywhere($: EngineInterface, theme: Theme, hold: boolean): Promise<Settings> {
  const settings = { ...(await loadSettings($)), on: true, hold }
  await saveSettings($, settings)
  await choose($, settings, theme)
  shown = undefined
  await show($, theme)
  return settings
}

type CardElements = Pick<ReturnType<EngineInterface['ui']['resolve']>, 'Box' | 'Text' | 'Button'> & {
  Svg?: ReturnType<EngineInterface['ui']['resolve']>['Svg']
}

/** Ends a preview: back to the shared theme, and the card's picture cleared. */
async function endPreview($: EngineInterface): Promise<void> {
  previewEnding?.cancel()
  previewEnding = undefined
  shown = undefined
  await update($, card, (was: CardState): CardState => ({ ...was, preview: undefined }))
  const settings = await loadSettings($)
  const current = themeOf((await loadCurrent($))?.id)
  if (settings.on && current !== undefined) await show($, current)
}

/**
 * Shows a theme behind this session's chat for 20 seconds, and its picture at the top of the card.
 * It changes nothing for other sessions and stores nothing; a second preview restarts the 20 seconds.
 */
async function preview($: EngineInterface, theme: Theme): Promise<void> {
  previewEnding?.cancel()
  previewEnding = $.clock.after(PREVIEW_MS, () => quietly($, () => endPreview($)))
  shown = undefined
  await show($, theme)
  await update($, card, (was: CardState): CardState => ({ ...was, preview: theme.id }))
}

async function putCardAway($: EngineInterface): Promise<void> {
  await update($, card, (): CardState => ({ inBand: false, away: true }))
}

/** A pick on the card: the theme shown everywhere, and the card put away, as a menu closes on a choice. */
async function pickOnCard($: EngineInterface, theme: Theme, hold: boolean): Promise<void> {
  previewEnding?.cancel()
  previewEnding = undefined
  try {
    await showEverywhere($, theme, hold)
  } catch (error) {
    void $.ui.toast(`${theme.title} could not be shown: ${String(error)}`)
    return
  }
  void $.ui.toast(hold ? `Holding ${theme.title} in every session.` : `${theme.title} in every session; the shuffle carries on.`)
  await putCardAway($)
}

/** A theme's picture, as a still image: its own animation is switched off so the card stays light. */
function stillOf(theme: Theme, live: LiveUsage): string {
  const source = theme.live === undefined ? sceneOf(theme) : theme.live(live)
  return source.replace(/<\/svg>\s*$/, '<style>*{animation:none!important}</style></svg>')
}

/**
 * The card. Its head holds the shuffle's own buttons, then the themes in three groups.
 * Preview shows a theme here for 20 seconds and puts its picture at the top of the card.
 * Apply puts it up in every session and lets the shuffle carry on; Hold puts it up and keeps it.
 * The desktop draws a button's `label` and never its children, so both carry the same short word.
 * Only one picture at a time: a scene is up to about 124,000 characters, past what one card may draw many times over.
 */
function cardView(
  $: EngineInterface,
  { Box, Text, Button, Svg }: CardElements,
  settings: Settings,
  currentId: string | undefined,
  state: CardState,
  live: LiveUsage,
) {
  const previewing = themeOf(state.preview)
  const groups: { key: string; head: string; themes: Theme[] }[] = [
    { key: 'mine', head: 'My themes', themes: [...CUSTOM_THEMES] },
    { key: 'dark', head: 'For dark windows', themes: COPIED.filter(t => t.window === 'dark') },
    { key: 'light', head: 'For light windows', themes: COPIED.filter(t => t.window === 'light') },
  ]
  const toggleWord = settings.on && !settings.hold ? 'Stop shuffle' : 'Start shuffle'
  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1} gap="md">
      <Box flexDirection="row" flexWrap="wrap" gap={1}>
        <Text bold>Theme shuffle</Text>
        <Button
          key="now"
          label="Shuffle now"
          onPress={async () => {
            const settings = { ...(await loadSettings($)), on: true, hold: false }
            await saveSettings($, settings)
            shown = undefined
            await show($, await choose($, settings))
            await putCardAway($)
          }}
        >
          Shuffle now
        </Button>
        <Button
          key="toggle"
          label={toggleWord}
          onPress={async () => {
            const was = await loadSettings($)
            const running = was.on && !was.hold
            await saveSettings($, running ? { ...was, on: false } : { ...was, on: true, hold: false })
            if (running) shown = undefined
            else quietly($, () => sync($))
            void $.ui.toast(running ? 'Shuffle is off.' : `Shuffling every ${was.minutes} min.`)
            await putCardAway($)
          }}
        >
          {toggleWord}
        </Button>
        <Button key="close" label="Close" role="dismiss" autoFocus onPress={() => putCardAway($)}>
          Close
        </Button>
      </Box>
      <Text dimColor>{describe(settings, themeOf(currentId))}</Text>
      {previewing === undefined
        ? [<Text key="hint" dimColor>Press Preview on a theme to see it here and behind the chat for 20 seconds.</Text>]
        : [
            <Box key="picture" flexDirection="column" gap="xs">
              <Text bold>{`Previewing ${previewing.title}`}</Text>
              {Svg === undefined
                ? []
                : [<Svg key="still" source={stillOf(previewing, live)} alt={`${previewing.title}: ${previewing.blurb}`} width={320} height={200} />]}
            </Box>,
          ]}
      {groups.map(group => (
        <Box key={`group-${group.key}`} flexDirection="column" gap="md">
          <Text key={`head-${group.key}`} size="heading" bold>
            {group.head}
          </Text>
          {group.themes.map(theme => {
            const isNow = settings.on && currentId === theme.id
            return (
              <Box key={`theme-${theme.id}`} flexDirection="column" gap="xs">
                <Box flexDirection="row" flexWrap="wrap" justifyContent="space-between" columnGap="md" rowGap="xs">
                  <Text bold={isNow}>
                    {isNow ? '✓ ' : ''}
                    {theme.title}
                  </Text>
                  <Box flexDirection="row" gap={1}>
                    <Button
                      key={`preview-${theme.id}`}
                      label={state.preview === theme.id ? 'Previewing' : 'Preview'}
                      onPress={() => preview($, theme)}
                    >
                      {state.preview === theme.id ? 'Previewing' : 'Preview'}
                    </Button>
                    <Button key={`apply-${theme.id}`} label="Apply" onPress={() => pickOnCard($, theme, false)}>
                      Apply
                    </Button>
                    <Button key={`hold-${theme.id}`} label="Hold" onPress={() => pickOnCard($, theme, true)}>
                      Hold
                    </Button>
                  </Box>
                </Box>
                <Text dimColor>{theme.blurb}</Text>
              </Box>
            )
          })}
        </Box>
      ))}
    </Box>
  )
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    try {
      await $.command.register({
        name: COMMAND,
        description: 'Shuffle backdrops everywhere: list, now, hold, on, off, <minutes>, light, dark, all, or a theme name.',
        argumentHint: 'list|now|hold|on|off|<minutes>|light|dark|all|<name>',
      })
    } catch (error) {
      void $.ui.log(`theme-shuffle: /${COMMAND} not available (${String(error)})`)
    }
    ticker?.cancel()
    ticker = $.clock.every(TICK_MS, () => {
      quietly($, () => sync($))
      quietly($, () => refreshUsage($))
    })
    quietly($, () => sync($))
    quietly($, () => refreshUsage($))
    return next(e)
  })

  // The context window changes most at the end of a turn: redraw live themes then too.
  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    quietly($, () => refreshUsage($))
    return result
  })

  // While the mod drives the backdrop, theme-examples' own sets and clears are held, so the two never fight.
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
        await saveSettings($, { ...settings, on: false })
        shown = undefined
        void $.ui.toast(`Theme shuffle is off so you can pick. /${COMMAND} on starts it again.`)
      }
    }
    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if (e.props.plugin !== PLUGIN || e.surface !== 'desktop') return next(e)
    const theme = themeOf(typeof e.props.scene === 'string' ? e.props.scene : undefined)
    if (theme === undefined) return next(e)
    const { Svg, Shader } = $.ui.resolve(e)
    // A live theme is drawn fresh from this session's figures; reading the atom redraws it when they change.
    const source = theme.live === undefined ? sceneOf(theme) : theme.live(await read($, usage))
    return overShader(
      Shader,
      theme.shader,
      <Svg isInteractive alt={`${theme.title}: ${theme.blurb}`} source={source} />,
    )
  })

  on('ui.render', { component: 'Placed' }, async ($, e, next) => {
    if (e.props.plugin !== PLUGIN || e.props.id !== CARD) return next(e)
    const state: CardState = await read($, card)
    if (state.away === true) return next(e)
    return cardView($, $.ui.resolve(e), await loadSettings($), (await loadCurrent($))?.id, state, await read($, usage))
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const state: CardState = await read($, card)
    if (state.inBand !== true) return next(e)
    return cardView($, $.ui.resolve(e), await loadSettings($), (await loadCurrent($))?.id, state, await read($, usage))
  })

  on('command.run', { command: COMMAND }, async ($, e) => {
    const word = e.args.trim().toLowerCase()
    const settings = await loadSettings($)

    if (word === '') return { text: `${describe(settings, themeOf((await loadCurrent($))?.id))} ${HELP}` }

    if (word === 'list' || word === 'pick') {
      // A surface that places no rows gets the card above the prompt instead.
      const placed = await $.ui.place({ id: CARD })
      await update($, card, (): CardState => ({ inBand: !placed.isPlaced, away: false }))
      return { text: 'Pick a theme on the card.' }
    }

    const named = themeNamed(word)
    if (named !== undefined) {
      const after = await showEverywhere($, named, false)
      return { text: describe(after, named) }
    }

    let changed: Settings
    if (word === 'off') changed = { ...settings, on: false }
    else if (word === 'hold') changed = { ...settings, on: true, hold: true }
    else if (word === 'on' || word === 'now') changed = { ...settings, on: true, hold: false }
    else if (word === 'light' || word === 'dark' || word === 'all') changed = { ...settings, pool: word, on: true, hold: false }
    else if (/^\d+(\.\d+)?$/.test(word) && Number(word) >= 1) changed = { ...settings, minutes: Number(word), on: true, hold: false }
    else return { text: `No option or theme "${word}". ${HELP}` }

    await saveSettings($, changed)
    if (!changed.on) {
      shown = undefined
      return { text: describe(changed, undefined) }
    }

    // A new pick for "now", a different pool, or turning it back on; else keep the timing.
    const fresh = word === 'now' || !settings.on || changed.pool !== settings.pool
    const theme = fresh ? await choose($, changed) : themeOf((await loadCurrent($))?.id)
    if (theme !== undefined) {
      shown = fresh ? undefined : shown
      await show($, theme)
    }
    return { text: describe(changed, theme) }
  })
}
