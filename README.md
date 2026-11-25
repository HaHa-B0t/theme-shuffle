# Theme shuffle

Paints a random animated backdrop behind the Claude Code desktop window and switches it every few minutes. Every session in every project shows the same backdrop and switches together, so no session needs to stay open to drive it.

The 38 scenes, their glass and their sounds are copied from the `theme-examples` plugin (Apache-2.0, see LICENSE).

## Use

- `/theme-shuffle`: what it's doing now.
- `/theme-shuffle now`: switch right away.
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
