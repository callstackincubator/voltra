# Voltra design

Voltra looks like the rest of the Callstack product family: a near-black page, one bright
accent, white type, light grotesk headlines, uppercase mono labels, square corners, 1px
hairlines, no shadows or gradients, and dithered pixel art instead of photos or illustrations.
Its siblings are Appduct (cyan `#3ddcff`), Rozenite (crimson-rose `#ff4f7b`), Apex (lime
`#c6f432`), Simlock (orange `#ff7a1a`) and agent-device (violet `#a47bff`). Voltra's accent is
**Volt yellow `#ffd60a`**: the yellow of high-voltage signs and of the lightning bolt in
Voltra's mark.

**Scope.** This file governs every brand visual: the website at use-voltra.dev, its docs, the
social card, the README banner, slides, social posts, diagrams, conference banners and videos.
It does not govern the UI developers build with Voltra (their Live Activities and widgets) or
the example app in `example/`.

## Colour

| Token          | Value                     | Use                                                    |
| -------------- | ------------------------- | ------------------------------------------------------ |
| `bg`           | `#0a0a0a`                 | Page background                                        |
| `surface`      | `#111111`                 | Hovered cells, panels                                  |
| `field`        | `#161616`                 | Inputs, inline code, chips, pictured cards             |
| `line`         | `rgb(255 255 255 / 0.08)` | Hairlines: frame, section rows, cell borders           |
| `line-strong`  | `rgb(255 255 255 / 0.16)` | Window and input borders, outlined buttons             |
| `text`         | `#ffffff`                 | Headlines, primary text                                |
| `muted`        | `rgb(255 255 255 / 0.62)` | Body copy, nav links                                   |
| `faint`        | `rgb(255 255 255 / 0.5)`  | Metadata, section numbers, line numbers, code comments |
| `accent`       | `#ffd60a`                 | Mark, wordmark block, primary actions, second beats    |
| `accent-hover` | `#ffe771`                 | Hover on accent fills                                  |
| `accent-rgb`   | `255 214 10`              | `rgb(var(--accent-rgb) / a)` and the dither palette    |
| `on-accent`    | `#0a0a0a`                 | Text on accent fills, always dark                      |

- The accent is 14.0:1 on `bg`.
- Light-mode docs use `accent-deep` `#7a680a` (5.5:1 on white) for links and accent text, and
  `accent-rule` `#947e0c` (4.0:1) for rules and the current sidebar item.
- Use the accent sparingly: the mark and wordmark, the primary action, the second beat of a
  headline, strings and numbers in code, and live state in pictures and animations.
- Never use the accent for status. A yellow accent must not read as "warning": an error in a
  pictured UI is white text with an `ERR` label.
- Anything filled with the accent carries dark text. Greys are neutral, never tinted.
- Every piece of text meets 4.5:1 against its background, code punctuation included.
- `src/site/brand.ts` is the only place in the website that holds an accent hex.

## The mark

A stepped lightning bolt, taken from Voltra's original logo, on a 6×10 step grid:

```
....#.
...#..
..#...
.#....
#####.
.#####
....#.
...#..
..#...
.#....
```

- Render one filled square per `#`, in the accent, with crisp edges. Heights are whole
  multiples of 10 steps, so every step is a whole number of pixels.
- The lockup is: the mark, then the wordmark `VOLTRA` in Switzer 500 uppercase as dark text on
  an accent block with tight padding, then a `BY CALLSTACK` mono chip (`muted` on `#1a1a1a`).
  The chip is dropped on phones.
- Never round, outline, rotate, recolour or animate the mark smoothly, and never squeeze it into
  the 9×9 icon grid.

## Type

| Role             | Font       | Size                                      | Weight | Tracking          | Leading       |
| ---------------- | ---------- | ----------------------------------------- | ------ | ----------------- | ------------- |
| Hero headline    | Switzer    | `clamp(2rem, 1.3rem + 2.6vw, 3.5rem)`     | 500    | -0.035em          | 1.08          |
| Section headline | Switzer    | `clamp(1.75rem, 1.3rem + 1.6vw, 2.75rem)` | 500    | -0.03em           | 1.1           |
| Card title       | Switzer    | 1.125rem                                  | 500    | -0.01em           | 1.3           |
| Lede             | Switzer    | 1–1.125rem                                | 400    | 0                 | 1.55, `muted` |
| Body             | Switzer    | 0.9375rem                                 | 400    | 0                 | 1.55, `muted` |
| Label            | Geist Mono | 0.75rem                                   | 400    | 0.08em, UPPERCASE | —             |
| Code             | Geist Mono | 0.8125rem                                 | 400    | 0                 | 1.75          |
| Closing wordmark | Switzer    | as wide as the frame                      | 500    | -0.045em          | 0.8, `accent` |

- Both fonts are free and self-hosted as woff2 in `website/src/fonts/`: Switzer (ITF Free Font
  License) and Geist Mono (OFL). Fallbacks are Arial and the system monospace.
- Headlines run in two beats, the second in the accent, with no italics. When the beats are
  sentences, each starts on its own line.
- **The motto:** "Live Activities and widgets. _No Swift, no Kotlin._"
- Mono carries structure only: nav, buttons, tabs, section numbers, package names, metadata.
  Never set a full sentence in mono.
- Platforms always appear in this order: **iOS, Android**. Surfaces in this order: Live
  Activities, Dynamic Island, iOS widgets, Android widgets, ongoing notifications.

## Layout

- **The frame.** Content sits in one centred column, `min(100% - 2 × gutter, 75rem)`, whose
  left and right `line` hairlines run the full height of the page. Gutter
  `clamp(1rem, 3vw, 2rem)`, inner padding `clamp(1.25rem, 3vw, 2.5rem)`.
- **Sections** open on a full-width hairline row such as `[01]  WHAT YOU GET`, with the number
  in `faint`, then a headline block with generous top padding, then the content.
- **Cells.** Equal cells divided by `line` hairlines, with no gaps and no fills. A grid never
  ends on an empty cell: Voltra uses 8 feature cells (4, 2, 1 columns), 4 safety cells and 3
  steps.
- Spacing steps in 4px; section rhythm is `clamp(2.5rem, 6vw, 5rem)`. Radius is 0 everywhere.
  No shadows, no blur except the sticky nav's backdrop.
- At phone width the page is one column with a 16px gutter and never scrolls sideways.
- **Slides and video (16:9).** Keep the frame hairlines inset from the left and right edges and
  the `[NN]  LABEL` section head row at the top. Scale type from the hero headline: a title
  slide's headline is about 7% of the frame height, body about 2.5%.

## Components

- **Nav.** Sticky, `rgb(10 10 10 / 0.86)` with backdrop blur and a hairline below. Lockup left;
  `DOCS`, `IOS`, `ANDROID`, `GITHUB` in the centre; a dark `GET STARTED` button right.
- **Buttons.** Mono uppercase 0.75rem, 2.5rem tall, square, 120ms colour transitions. Primary is
  an accent fill with dark text; dark is `#1a1a1a` with white text.
- **CTA bar.** A full-frame-width accent block, `clamp(4.5rem, 9vw, 7rem)` tall, with
  `GET STARTED →` centred in mono.
- **Window.** For code and terminals: a `bg` fill, a `line-strong` border, and a bar with a mini
  accent `VOLTRA` tag, a mono title in `faint` (a file name, `zsh`) and three thin controls
  (×, –, □).
- **Code.** Zero-padded line numbers in `faint`; keywords and punctuation in dimmed white;
  functions, types and JSX tags in white; strings and numbers in the accent; comments in
  `faint`. Shell: commands white, plain arguments as text, only quoted strings in the accent.
  Docs code blocks have a hairline frame and no line numbers. Never draw ASCII diagrams.
- **Command bar.** `$` in the accent, the command in mono, a `COPY` button, a `line-strong`
  border. Commands always use their shortest form (`npx skills add callstackincubator/voltra`).
- **Tabs.** Equal-width cells with mono labels in `faint`; the selected tab is white with a 2px
  accent underline.
- **Marquee.** A hairline row of mono labels scrolling left (about 38s per loop), each led by a
  6px accent square, both ends faded, paused on hover and still under reduced motion.
- **Pixel icons.** A 9×9 grid in `currentColor`, rendered at multiples of 9px with crisp edges.
  Voltra adds a `car` icon (the order tracker's `car.fill`) to the family set.
- **Device frames.** Phones are `#050505` rectangles with 4px pixel-stepped corners and a 1px
  `#313131` outline that follows every step. The iPhone lock screen has a stepped Dynamic Island
  pill, the date in mono and `9:41` in light Switzer, the Live Activity under the clock, stepped
  flashlight and camera buttons and a home indicator at the bottom. The Android home screen has
  a mono status row, a 4×2 widget across the top and app icons as dot squares. Never copy
  Apple's or Google's chrome or icons.
- **Pictures of Voltra's output.** Live Activities and widgets are drawn as `field` cards with a
  `line-strong` border: the car icon in the accent, the title in Switzer 500 white, the subtitle
  in `muted`, and a faint mono tag (`LIVE ACTIVITY`, `WIDGET · 4×2`). Their text is the real text
  from the docs' order-tracker example: "Driver en route / ETA 12 min" and "Driver arrived /
  Ready for pickup".
- **Closing.** The CTA bar, then the giant accent `VOLTRA` wordmark as wide as the frame, then
  one footer row: `© YEAR VOLTRA BY CALLSTACK` left and mono links right.

## Pixel imagery

All imagery is ordered dithering of a generated scene on a canvas.

- **Grain:** 2 CSS px cells, scaled with `image-rendering: pixelated`, fully filled.
- **Palette:** three tones with a 4×4 Bayer threshold between neighbours: `bg` `#0a0a0a`, the
  midtone `#54470a` (30% of the accent into `bg`), and the accent `#ffd60a`.
- **Cells (the signature scene).** From the docs: widgets sit on the home screen's cell grid
  (`targetCellWidth` × `targetCellHeight`). To redraw it:
  - A grid unit of `min(shorter side, 360 cells) / 7`, with a gap of 14% of a unit, aligned so a
    grid line runs through the focus (the product visual sits at the focus, 0..1 across, at
    half height).
  - Tiles of 4×2, 2×2, 2×1, 1×2 and 1×1 units, packed greedily row by row, each free grid cell
    taking the first size that fits from a seeded starting point.
  - Each tile: stepped corners, a 0.42 face, a bright (1.0) top rim, a lit (0.8) left edge, a
    shaded (0.3) bottom and right edge, and widget content: a title bar and a shorter line, a
    progress bar, or a large glyph block.
  - Brightness falls off from the focus to near black at the edges; the gaps hold a faint
    noise texture.
  - Motion: each tile refreshes every 6.5s at its own phase, with a scan line stepping down it
    in 16 steps over 0.9s, as if an update had just landed.
- **Flow.** Soft diagonal bands slowly turning, capped at about 0.55 so they stay mostly
  midtone. The quiet backdrop behind code, tabs and the editor.
- **Hollow (404 only).** The Cells scene with the 2×2 widget at the focus missing: its slot is
  dark, outlined by a dashed stepped line that flares as a sweep crosses it.
- Text never sits on dither: windows, devices and labels on a scene have solid `bg` fills.
- Never use photos, gradients, 3D renders, landscapes, skylines, or another family product's
  scene (ducts, crystals).

## Motion

- Animations tell the story without captions: real JSX written, real screens changing.
- Pixel motion moves in steps (`steps(16)` easing; dither at about 12 fps), never smoothly.
- UI transitions: 120ms for hovers, about 300ms for screen changes.
- Typed text is laid out at full length first, then revealed, so nothing reflows. Swapping
  states (en route → arrived) share one slot sized for the largest.
- Animation code loads only when its element nears the viewport, and loops run only while on
  screen. Dither starts after `load`, in a Web Worker on an OffscreenCanvas.
- The HTML carries the meaningful still frame: both phones showing "Driver arrived", and the
  editor's full file with the finished preview. Reduced motion and readers without JavaScript
  get that frame.
- **Video:** the same `steps()` easing, dither at about 12 fps, and cuts rather than
  cross-fades.

## Words

- Short and plain, as one colleague to another. Name the reader: "you", "your agent".
- No marketing adjectives, and no "just", "simply" or "easy". Leave API names out of headlines
  and ledes.
- Headlines run two beats. Ledes are one or two sentences.
- Page titles: `Voltra: Live Activities and widgets in React Native` on the home page and
  `Page title | Voltra` everywhere else, 60 characters at most, never `·`, `—` or `-` as a
  separator. `website/src/site/meta.ts` builds every title.
- Facts come only from the docs and the repo: no invented numbers, adopters, logos or
  testimonials. Every feature is presented as stable; the site carries no `EXPERIMENTAL` labels.
- Voltra is for React Native developers and their coding agents; the agent setup is the Voltra
  skill, `npx skills add callstackincubator/voltra`.

## Social card and banner

- **Social card** `website/public/og-image.jpg`, 1200×630: the lockup top left, the motto in two
  lines, and a band of the Cells scene along the bottom carrying two windows (`iOS · Live
Activity` and `Android · widget`, both showing "Driver arrived / Ready for pickup"), with
  `IOS · ANDROID` in mono at the bottom right. 48px safe margin.
- **README banner** `website/public/banner.jpg`, 1660×512: the same pieces side by side, with no
  frame hairlines.
- Both come from `website/og/og.html`. Regenerate them with `pnpm og` in `website/`; that also
  writes the favicons.

## Website

- **Home page** (`website/src/pages/index.astro`), in order:
  1. Nav.
  2. Hero (`src/components/home/Hero.astro`, `hero.ts`): the motto, the lede, `GET STARTED` and
     `READ THE DOCS`, and a `zsh` window with the install and skill commands. Below them, on the
     Cells scene, an iPhone lock screen with the order-tracker Live Activity beside an Android
     home screen with the same order in a widget; both go from empty to "Driver en route" to
     "Driver arrived", the Android widget with its refresh scan.
  3. Marquee of surfaces and tools.
  4. `[01] What you get`: eight feature cells.
  5. `[02] Push updates`: the server render snippet beside the copy.
  6. `[03] How it works`: the editor (`src/components/home/Editor.astro`, `editor.ts`), where
     the order tracker's JSX is written line by line and the preview builds the Live Activity
     with each element; then the three setup steps; then iOS, Android and Server tabs on the flow
     backdrop.
  7. `[04] Native, without native code`: four cells.
  8. `[05] FAQ`.
  9. Closing.
- **404** (`src/pages/404.astro`): the hollow scene behind a solid card with the `404` chip, "This
  widget never loaded. _The rest of Voltra did._", the requested path, Home and Docs buttons.
  `noindex`.
- **Docs** (`src/content/docs/`): Starlight with the site's lockup, fonts and footer; dark by
  default, `accent-deep` in light mode. Every page has a `description`. The sidebar lives in
  `astro.config.mjs`.
- **Where things live:** facts and copy in `src/site/content.ts`; the accent in
  `src/site/brand.ts`; scenes in `src/components/site/dither.ts`; device pictures in
  `src/components/home/` (`Phone`, `LockScreen`, `AndroidHome`); sections in
  `src/components/home/Sections.astro`; tokens in `src/styles/landing.css`; Vercel redirects in
  `vercel.json`.
