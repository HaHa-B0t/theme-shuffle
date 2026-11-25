# Theme shuffle

Paints a random animated backdrop behind the Claude Code desktop window and switches it every few minutes. Every session in every project shows the same backdrop and switches together, so no session needs to stay open to drive it.

The 38 scenes, their glass and their sounds are copied from the `theme-examples` plugin (Apache-2.0, see LICENSE).

It also has themes of its own, in `hooks/custom-themes.ts`:

- **Snowdrift**: night snowfall where the snow piles up as the session's context window fills, burying the pines and the cabin. A robin in a winter hat sits on a wooden sign that shows the context percentage, plus the 5-hour limit when it's known; the numbers turn a warning color past 80%. A snowman appears at 35% and gets a top hat at 65%. Each time the context grows, a skier swoops across the snow once. Each session shows its own level.

## Use

- `/theme-shuffle`: what it's doing now.
- `/theme-shuffle list`: opens a card with every theme. **Preview** shows one behind this chat for 20 seconds; the card counts down, and **Stop preview** goes back early. **Apply** puts it up in every session and lets the shuffle carry on. **Hold** puts it up in every session and keeps it there. The card also has Shuffle now and Start/Stop shuffle.
- `/theme-shuffle now`: switch right away.
- `/theme-shuffle hold`: keep the current theme everywhere; `on` starts shuffling again.
- `/theme-shuffle 10`: switch every 10 minutes (default 5).
- `/theme-shuffle light` / `dark` / `all`: only themes made for that kind of window.
- `/theme-shuffle aurora`: jump to one theme by name; the shuffle carries on from there.
- `/theme-shuffle off` / `on`: stop or start. Off keeps the current backdrop.

## With theme-examples

Both can be installed. Running `/custom-theme` (the card or a theme name) turns shuffle off everywhere so your pick works; `/theme-shuffle on` starts it again. While shuffle is on, theme-examples can't change the backdrop by itself, so the two never fight.

## Install

In a Claude Code session, type:

```
/plugin install theme-shuffle --marketplace HaHa-B0t/theme-shuffle
```

Answer `y` to add the marketplace, pick a scope, then restart the Claude app. The backdrops draw in the desktop app.
