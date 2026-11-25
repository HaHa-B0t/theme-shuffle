/**
 * The session's figures a live theme draws from: percent of the context window, and of the 5-hour limit when known.
 * `ski` is true on the update where the context grew, so Snowdrift sends its skier across once.
 */
export type LiveUsage = { context?: number; fiveHour?: number; ski?: boolean }

/**
 * Where the theme card shows: in the band above the prompt where the surface places no rows, or put away.
 * `preview`: the theme being previewed in this session; `left`: its seconds to go.
 */
export type CardState = { inBand?: boolean; away?: boolean; preview?: string; left?: number }

declare module 'claude-code' {
  interface PluginState {
    'theme-shuffle': { usage: Shaped<LiveUsage>; card: Shaped<CardState> }
  }
}
