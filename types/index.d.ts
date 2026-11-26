/**
 * The session's figures a live theme draws from: percent of the context window, and of the 5-hour limit when known.
 * `skiAt` is when the context last grew (clock ms), so Snowdrift sends its skier across once, for a few seconds after.
 */
export type LiveUsage = { context?: number; fiveHour?: number; skiAt?: number }

/**
 * Where the theme card shows: in the band above the prompt where the surface places no rows, or put away.
 * `row`: the id of the card's row now standing (each `list` places a fresh one at the transcript's end).
 * `preview`: the theme being previewed in this session; `left`: its seconds to go.
 */
export type CardState = { inBand?: boolean; away?: boolean; row?: string; preview?: string; left?: number }

/**
 * The last theme put up in this session outside a preview, by any plugin: what a preview goes back to when shuffle is off.
 * `set` holds the `$.theme.set` attributes as they were given (the contract can't import their type, so it is an object).
 */
export type LastTheme = { set?: object }

declare module 'claude-code' {
  interface PluginState {
    'theme-shuffle': { usage: Shaped<LiveUsage>; card: Shaped<CardState>; last: Shaped<LastTheme> }
  }
}
