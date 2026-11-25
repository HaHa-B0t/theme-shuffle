// Themes of this mod's own, beside the ones copied from theme-examples.
// A live theme redraws from the session's usage: its `live` builds the SVG from the latest figures.
import type { Theme } from './themes'
import type { LiveUsage } from '../types'

export type ShuffleTheme = Theme & { live?: (usage: LiveUsage) => string }

const W = 1600
const H = 1000

/** A small fixed pseudo-random sequence, so the same scene comes out on every call. */
function seeded(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

const r1 = (n: number): string => n.toFixed(1)

/** A pine in three tiers, with snow caps that thicken as `snow` (0 to 1) rises. */
function pine(x: number, base: number, h: number, fill: string, snow: number): string {
  const tiers = [
    { top: base - h, w: h * 0.32 },
    { top: base - h * 0.72, w: h * 0.42 },
    { top: base - h * 0.45, w: h * 0.52 },
  ]
  const trunk = `<rect x="${r1(x - h * 0.03)}" y="${r1(base - h * 0.2)}" width="${r1(h * 0.06)}" height="${r1(h * 0.2)}" fill="#2a1d18"/>`
  const body = tiers
    .map(t => {
      const bottom = t.top + h * 0.42
      // A cap on the tip of each tier: a small dusting at first, a deeper cap as snow rises.
      const ch = h * (0.05 + snow * 0.09)
      const hw = (t.w * ch) / (h * 0.42)
      return (
        `<path d="M${r1(x)} ${r1(t.top)}L${r1(x + t.w)} ${r1(bottom)}L${r1(x - t.w)} ${r1(bottom)}Z" fill="${fill}"/>` +
        `<path d="M${r1(x)} ${r1(t.top)}L${r1(x + hw)} ${r1(t.top + ch)}` +
        `Q${r1(x)} ${r1(t.top + ch * 0.6)} ${r1(x - hw)} ${r1(t.top + ch)}Z" fill="#e8eef9" opacity="0.92"/>`
      )
    })
    .join('')
  return trunk + body
}

/** A wavy snow surface from left to right at height `top`, filled to the bottom. */
function drift(top: number, amp: number, phase: number, fill: string): string {
  let d = `M0 ${H}L0 ${r1(top)}`
  for (let x = 0; x <= W; x += 80) {
    const y = top + Math.sin(x / 190 + phase) * amp + Math.sin(x / 67 + phase * 2) * amp * 0.35
    d += `L${x} ${r1(y)}`
  }
  return `<path d="${d}L${W} ${H}Z" fill="${fill}"/>`
}

/** One band of flakes, drawn twice (one screen apart) so the falling loop never shows a seam. */
function flakes(seed: number, count: number, size: number, opacity: number): string {
  const rnd = seeded(seed)
  let dots = ''
  for (let i = 0; i < count; i += 1) {
    const x = rnd() * W
    const y = rnd() * H
    const r = size * (0.6 + rnd() * 0.8)
    dots += `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}"/>`
  }
  return `<g>${dots}</g><g transform="translate(0 -${H})">${dots}</g>`
}

/** A robin in a knit winter hat, perched at (x, y) on the sign's top edge, bobbing slowly. */
function robin(x: number, y: number): string {
  return (
    `<g transform="translate(${x} ${y}) scale(1.7)"><g class="s-bob">` +
    `<path d="M14 -24L40 -14L36 -8L12 -14Z" fill="#4d3322"/>` +
    `<path d="M-6 -2V8M-8 8H-2M5 -2V8M3 8H9" stroke="#3a2a1c" stroke-width="2.2" stroke-linecap="round"/>` +
    `<ellipse cx="0" cy="-24" rx="26" ry="22" fill="#6e4a30"/>` +
    `<ellipse cx="-8" cy="-21" rx="17" ry="16" fill="#e0632f"/>` +
    `<ellipse cx="-4" cy="-8" rx="14" ry="7" fill="#efe4d2"/>` +
    `<path d="M2 -36Q22 -34 24 -18Q14 -22 4 -24Z" fill="#553823"/>` +
    `<circle cx="-14" cy="-48" r="15" fill="#6e4a30"/>` +
    `<circle cx="-20" cy="-43" r="9" fill="#e0632f"/>` +
    `<circle cx="-21" cy="-51" r="2.8" fill="#151010"/><circle cx="-22" cy="-52" r="0.9" fill="#ffffff"/>` +
    `<path d="M-33 -48L-42 -45.5L-33 -43Z" fill="#3a2a1c"/>` +
    `<path d="M-29 -57Q-16 -84 6 -73L1 -59Z" fill="#c8302c"/>` +
    `<path d="M-31 -59Q-14 -66 3 -58L2 -53Q-14 -60 -30 -54Z" fill="#f4f1ea"/>` +
    `<circle cx="7" cy="-74" r="6" fill="#f4f1ea"/>` +
    `</g></g>`
  )
}

/** A snowman standing on the snow at (x, base). It gets a top hat once the snow is deep. */
function snowman(x: number, base: number, hat: boolean): string {
  return (
    `<g transform="translate(${x} ${r1(base)})">` +
    `<path d="M-24 -96L-62 -122M-58 -118L-66 -130M24 -96L60 -124M56 -120L66 -132" stroke="#4a3022" stroke-width="4" stroke-linecap="round"/>` +
    `<circle cx="0" cy="-34" r="36" fill="#f2f5fb"/>` +
    `<circle cx="0" cy="-96" r="28" fill="#f2f5fb"/>` +
    `<circle cx="0" cy="-146" r="21" fill="#f2f5fb"/>` +
    `<path d="M-30 -36Q0 -18 30 -36" fill="none" stroke="#d3dcee" stroke-width="3"/>` +
    `<circle cx="0" cy="-104" r="3" fill="#222833"/><circle cx="0" cy="-90" r="3" fill="#222833"/><circle cx="0" cy="-76" r="3" fill="#222833"/>` +
    `<path d="M-20 -124Q0 -114 20 -124L18 -116Q0 -107 -18 -116Z" fill="#b8322c"/>` +
    `<path d="M10 -120L16 -96L24 -98L18 -118Z" fill="#b8322c"/>` +
    `<circle cx="-7" cy="-151" r="2.8" fill="#222833"/><circle cx="7" cy="-151" r="2.8" fill="#222833"/>` +
    `<path d="M-1 -145L-24 -140L-1 -140Z" fill="#e8822e"/>` +
    (hat
      ? `<rect x="-24" y="-168" width="48" height="6" rx="2" fill="#1c1f29"/><rect x="-15" y="-196" width="30" height="30" fill="#1c1f29"/><rect x="-15" y="-176" width="30" height="5" fill="#8a2a2a"/>`
      : '') +
    `</g>`
  )
}

/**
 * A skier who swoops once across the snow, left to right, when the context just grew.
 * Its resting place is off the left edge, so with motion reduced nothing stands in the scene.
 */
function skier(ground: number): string {
  return (
    `<g transform="translate(-140 ${r1(ground - 6)})"><g class="s-ski">` +
    `<circle cx="-30" cy="-6" r="7" fill="#ffffff" opacity="0.55"/><circle cx="-44" cy="-12" r="5" fill="#ffffff" opacity="0.4"/><circle cx="-56" cy="-4" r="4" fill="#ffffff" opacity="0.3"/>` +
    `<path d="M-26 2L44 2Q52 2 54 -4" stroke="#1d2433" stroke-width="4" fill="none" stroke-linecap="round"/>` +
    `<path d="M-8 -2L2 -26L16 -22L10 -2" fill="#2f4f8f"/>` +
    `<path d="M0 -28L8 -58L26 -52L18 -24Z" fill="#d23c33"/>` +
    `<path d="M10 -50L36 -36" stroke="#d23c33" stroke-width="7" stroke-linecap="round"/>` +
    `<path d="M36 -36L30 2" stroke="#9aa3b5" stroke-width="2.5"/>` +
    `<circle cx="22" cy="-66" r="10" fill="#f0c9a6"/>` +
    `<path d="M11 -68Q14 -82 26 -80Q34 -78 33 -66Z" fill="#f2b632"/>` +
    `</g></g>`
  )
}

/** Snowdrift: night snowfall whose ground snow rises with the context window. */
export function snowdriftSvg(usage: LiveUsage): string {
  const pct = clamp(Math.round(usage.context ?? 0), 0, 100)
  const fill = pct / 100
  // The snow line climbs from near the bottom; at 100% it reaches the cabin's roof peak and only the chimney shows.
  const ground = H - (40 + fill * 230)
  const warn = pct >= 80
  const signText = warn ? '#ffc2a8' : '#fff1d6'
  const five = usage.fiveHour === undefined ? '' : `${Math.round(usage.fiveHour)}%`

  const rnd = seeded(7)
  let stars = ''
  for (let i = 0; i < 70; i += 1) {
    const x = rnd() * W
    const y = rnd() * 420
    stars += `<circle class="s-tw" style="animation-delay:-${r1(rnd() * 9)}s" cx="${r1(x)}" cy="${r1(y)}" r="${r1(0.8 + rnd() * 1.4)}"/>`
  }

  const leftPines = [
    pine(70, H - 20, 330, '#16303a', fill),
    pine(250, H - 10, 420, '#1b3a43', fill),
    pine(470, H - 30, 260, '#16303a', fill),
  ].join('')
  const rightPines = [
    pine(1190, H - 25, 300, '#16303a', fill),
    pine(1540, H - 15, 390, '#1b3a43', fill),
  ].join('')

  const roofSnow = 6 + fill * 26
  // Lifted so its door line sits above the bottom edge a wide window crops away.
  const cabin =
    `<g transform="translate(0 -60)">` +
    `<rect x="1270" y="790" width="210" height="170" fill="#3b2a22"/>` +
    `<path d="M1270 806H1480M1270 830H1480M1270 854H1480M1270 878H1480M1270 902H1480M1270 926H1480" stroke="#2c1f19" stroke-width="3"/>` +
    `<rect class="s-glow" x="1325" y="840" width="48" height="44" rx="3" fill="#ffc86b"/>` +
    `<path d="M1349 840V884M1325 862H1373" stroke="#3b2a22" stroke-width="4"/>` +
    `<path d="M1250 800L1375 705L1500 800Z" fill="#4a2f25"/>` +
    `<path d="M1244 ${r1(802)}L1375 ${r1(703 - roofSnow * 0.4)}L1506 802Q1375 ${r1(800 - roofSnow)} 1244 802Z" fill="#eef3fb"/>` +
    `<rect x="1430" y="700" width="22" height="60" fill="#3b2a22"/>` +
    `<rect x="1426" y="${r1(694 - roofSnow * 0.25)}" width="30" height="${r1(6 + roofSnow * 0.25)}" rx="3" fill="#eef3fb"/>` +
    `</g>`

  const boardSnow = 4 + fill * 16
  const sign =
    `<g>` +
    `<rect x="150" y="300" width="14" height="${H - 300}" fill="#4a3022"/>` +
    `<rect x="56" y="200" width="204" height="${five ? 150 : 118}" rx="10" fill="#6b4428" stroke="#3e2617" stroke-width="5"/>` +
    `<path d="M52 204Q158 ${r1(196 - boardSnow)} 264 204L264 ${r1(206 + boardSnow * 0.4)}Q158 ${r1(212)} 52 ${r1(206 + boardSnow * 0.4)}Z" fill="#eef3fb"/>` +
    `<text x="158" y="272" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="54" fill="${signText}">${pct}%</text>` +
    `<text x="158" y="302" text-anchor="middle" font-family="sans-serif" font-size="20" letter-spacing="2" fill="#e9d6b4">CONTEXT</text>` +
    (five
      ? `<text x="158" y="336" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#e9d6b4">5h limit ${five}</text>`
      : '') +
    `</g>`

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">` +
    `<defs>` +
    `<linearGradient id="sd-sky" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#070d24"/><stop offset="0.6" stop-color="#16244a"/><stop offset="1" stop-color="#2a3a66"/>` +
    `</linearGradient>` +
    `<radialGradient id="sd-moon-glow"><stop offset="0" stop-color="#f4eed8" stop-opacity="0.35"/><stop offset="1" stop-color="#f4eed8" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="sd-window-glow"><stop offset="0" stop-color="#ffc86b" stop-opacity="0.45"/><stop offset="1" stop-color="#ffc86b" stop-opacity="0"/></radialGradient>` +
    `</defs>` +
    `<style>` +
    `.s-tw{fill:#dfe7ff;animation:sd-twinkle 9s ease-in-out infinite}` +
    `@keyframes sd-twinkle{0%,100%{opacity:.9}50%{opacity:.35}}` +
    `.s-glow{animation:sd-flicker 7s ease-in-out infinite}` +
    `@keyframes sd-flicker{0%,100%{opacity:1}50%{opacity:.82}}` +
    `.s-fall{fill:#ffffff}` +
    `.s-fall-a{animation:sd-fall 60s linear infinite;opacity:.55}` +
    `.s-fall-b{animation:sd-fall 42s linear infinite;opacity:.75}` +
    `.s-fall-c{animation:sd-fall 30s linear infinite;opacity:.9}` +
    `@keyframes sd-fall{from{transform:translateY(0)}to{transform:translateY(${H}px)}}` +
    `.s-sway{animation:sd-sway 14s ease-in-out infinite alternate}` +
    `@keyframes sd-sway{from{transform:translateX(-14px)}to{transform:translateX(14px)}}` +
    `.s-bob{animation:sd-bob 5s ease-in-out infinite}` +
    `@keyframes sd-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}` +
    `.s-ski{animation:sd-ski 9s ease-in-out 1 forwards}` +
    `@keyframes sd-ski{from{transform:translateX(0)}to{transform:translateX(${W + 300}px)}}` +
    `</style>` +
    `<rect width="${W}" height="${H}" fill="url(#sd-sky)"/>` +
    stars +
    `<circle cx="1420" cy="150" r="150" fill="url(#sd-moon-glow)"/>` +
    `<circle cx="1420" cy="150" r="48" fill="#f1ecd8"/>` +
    `<circle cx="1404" cy="138" r="9" fill="#dcd5bc"/><circle cx="1436" cy="166" r="6" fill="#dcd5bc"/>` +
    `<path d="M0 760L170 600L300 690L470 540L640 700L800 610L980 720L1150 580L1330 690L1470 620L1600 700V${H}H0Z" fill="#22305a"/>` +
    `<path d="M470 540L430 577L455 572L470 588L488 570L512 576ZM1150 580L1112 616L1136 610L1150 626L1168 609L1190 616ZM170 600L140 628L162 624L176 636L190 624Z" fill="#c9d3ea"/>` +
    `<g class="s-sway"><g class="s-fall s-fall-a">${flakes(11, 70, 1.6, 1)}</g></g>` +
    leftPines +
    rightPines +
    `<circle cx="1349" cy="802" r="110" fill="url(#sd-window-glow)"/>` +
    cabin +
    sign +
    drift(ground - 18, 10, 1.3, '#b9c7e3') +
    drift(ground, 14, 0.2, '#eaf0fa') +
    // The snowman is built once the snow is deep enough (35%), and dressed up with a hat at 65%.
    (pct >= 35 ? snowman(370, ground + 8, pct >= 65) : '') +
    robin(196, 188) +
    (usage.ski === true ? skier(ground) : '') +
    `<g class="s-sway"><g class="s-fall s-fall-b">${flakes(23, 55, 2.4, 1)}</g></g>` +
    `<g class="s-fall s-fall-c">${flakes(37, 30, 3.4, 1)}</g>` +
    `</svg>`
  )
}

export const CUSTOM_THEMES: readonly ShuffleTheme[] = [
  {
    id: 'snowdrift',
    title: 'Snowdrift',
    blurb: 'Night snowfall that piles up as the context window fills; a sign keeps the count.',
    window: 'dark',
    glass: { blur: 16, tint: '#101a38', opacity: 0.5 },
    scene: () => snowdriftSvg({ context: 20 }),
    live: snowdriftSvg,
  },
]
