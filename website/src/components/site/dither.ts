// The dithered pixel scenes behind the landing pages' windows: a scene generated in the browser
// and ordered-dithered at a fine grain into a ramp from near-black through a dark mix of the
// accent to the accent. Generated instead of shipped as an image, so it follows the accent.
//
// A scene is built once per size (the slow part: geometry and shading) and then animated
// cheaply, with a few arithmetic operations per cell each frame. Every scene runs in the dither
// worker (dither.worker.ts) or, where OffscreenCanvas is missing, on the page (dither-host.ts),
// and the social card imports this file too (og/og.html), so keep it free of DOM access.
//
// ---------------------------------------------------------------------------------------------
// ADDING THE PRODUCT'S SIGNATURE SCENE
//
// Every product gets one scene of its own: a metaphor taken from the product itself (its name,
// what it does, the vocabulary of its docs), drawn in the stepped, dithered language of the
// family. It goes behind the hero visual, on the social card and the banner. Voltra's is `cells`
// (below): widgets on the home screen cell grid. Appduct's `ducts` and Rozenite's crystals show
// the same method, but their ideas belong to those products. Never reuse a sibling's idea.
//
// To add one:
//   1. Write a SceneBuilder: `(cols, rows, focus, mark) => ({ frame: (t) => tones })`.
//      `cols` x `rows` are dither cells (2 CSS px each), `focus` is 0..1 across, where the
//      product visual sits, `t` is seconds. `frame` fills and returns one tone (0..1) per cell:
//      0 is the background, about 0.5 the dark accent mix, 1 the accent.
//   2. Do the geometry once, outside `frame` (which typed arrays hold what per cell: which
//      shape owns it, its shaded tone, how far along it is), and keep `frame` to a few
//      operations per cell. It runs 12 times a second.
//   3. Shade like the family: lit faces about 0.85, shaded faces about 0.55, a bright rim on
//      exposed top edges, a dark gap around each shape so it separates from the ones behind,
//      a faint haze or rock texture behind (0.1 to 0.2), never a gradient on its own.
//   4. Motion is slow and stepped: a glint sweeping across, pulses travelling along. Pick a
//      still moment (`animate` draws t = 9 under reduced motion) that tells the story.
//   5. Add it to `scenes`, then use it: `<Dither scene="yours" focus={0.7} />`, and in og.html.
//   6. Keep sizes tied to the shorter side of the scene, so phone-width scenes don't blow up.
//      No landscapes, photos, 3D renders or smooth gradients.
// ---------------------------------------------------------------------------------------------

// 4x4 Bayer matrix, normalised to 0..1: the threshold a cell's tone must beat to step up.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((n) => (n + 0.5) / 16)

// Integer-hashed value noise. `period` makes it wrap horizontally.
const hash = (x: number, y: number) => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}
const noise = (x: number, y: number, period = 0) => {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const x0 = period ? ((xi % period) + period) % period : xi
  const x1 = period ? (x0 + 1) % period : xi + 1
  const a = hash(x0, yi)
  const b = hash(x1, yi)
  const c = hash(x0, yi + 1)
  const d = hash(x1, yi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
const fbm = (x: number, y: number, octaves = 4, period = 0) => {
  let sum = 0
  let amp = 0.5
  let p = period
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise(x, y, p)
    x *= 2
    y *= 2
    p *= 2
    amp *= 0.5
  }
  return sum / (1 - Math.pow(0.5, octaves))
}
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

/** A scene at one size: `frame(t)` fills and returns the tone (0..1) of every cell. */
type Scene = { frame: (t: number) => Float32Array }
type SceneBuilder = (cols: number, rows: number, focus: number, mark: readonly string[]) => Scene

/** A horizontally wrapping noise texture, sampled with a sliding offset. */
function mistTexture(cols: number, rows: number, scaleX: number, scaleY: number) {
  const tex = new Float32Array(cols * rows)
  const period = Math.max(1, Math.round(scaleX))
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      tex[y * cols + x] = fbm((x / cols) * period, (y / rows) * scaleY, 4, period)
    }
  }
  return tex
}

// Cells: Voltra's signature scene. Widgets sit on the home screen's cell grid (the docs'
// targetCellWidth x targetCellHeight), so the scene packs widget tiles of every size (4x2, 2x2,
// 2x1, 1x2, 1x1) on a stepped grid aligned to `focus`, brightest around it and fading to black
// toward the edges. Each tile has stepped corners, a bright top rim, a lit left edge, a shaded
// bottom and right edge, and widget content: a title bar and a shorter line, a progress bar, or
// a big glyph block. The motion: every tile refreshes on its own phase, a stepped scan line
// wiping down it, as if an update had just landed.
//
// `hollow` (the 404 page): the 2x2 tile at the focus is missing. Its slot is dark, outlined by a
// dashed stepped line that flares as a refresh sweep passes across the grid.
function cellsScene(cols: number, rows: number, focus: number, hollow = false): Scene {
  const N = cols * rows
  const out = new Float32Array(N)
  const aspect = cols / rows
  // Sizes follow the shorter side and are capped, so phone-width scenes keep small tiles.
  const size = Math.min(rows, cols * 0.8)
  const u = Math.max(8, Math.round(Math.min(size, 360) / 7))
  const gap = Math.max(2, Math.round(u * 0.14))
  const fx = focus * cols
  const fy = rows * 0.5
  // The grid is aligned so that a grid line runs through the focus.
  const ox = (Math.round(fx) % u) - u
  const oy = (Math.round(fy) % u) - u
  const nc = Math.ceil((cols - ox) / u)
  const nr = Math.ceil((rows - oy) / u)
  const occ = new Uint8Array(nc * nr)
  const SIZES: [number, number][] = [
    [4, 2],
    [2, 2],
    [2, 1],
    [1, 1],
    [2, 2],
    [1, 2],
  ]
  type Tile = {
    gx: number
    gy: number
    w: number
    h: number
    seed: number
    depth: number
    kind: number
    hollow?: boolean
  }
  const tiles: Tile[] = []
  const place = (gx: number, gy: number, w: number, h: number, seed: number) => {
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) occ[(gy + yy) * nc + gx + xx] = 1
    const cx = ox + (gx + w / 2) * u
    const cy = oy + (gy + h / 2) * u
    const dn = Math.hypot((cx - fx) / (size * 1.1), (cy - fy) / (size * 0.8))
    const tile: Tile = {
      gx,
      gy,
      w,
      h,
      seed,
      depth: 0.04 + 0.96 * Math.exp(-dn * dn * 2.2),
      kind: Math.floor(hash(seed, 2) * 3),
    }
    tiles.push(tile)
    return tile
  }
  if (hollow) {
    // The missing widget: a 2x2 slot centred on the focus.
    const kx = Math.round((fx - ox) / u) - 1
    const ky = Math.round((fy - oy) / u) - 1
    if (kx >= 0 && ky >= 0 && kx + 2 <= nc && ky + 2 <= nr) place(kx, ky, 2, 2, -1).hollow = true
  }
  // Greedy packing: each free grid cell takes the first size, from a seeded start, that fits.
  for (let gy = 0; gy < nr; gy++) {
    for (let gx = 0; gx < nc; gx++) {
      if (occ[gy * nc + gx]) continue
      const seed = gy * 977 + gx
      const start = Math.floor(hash(seed, 1) * SIZES.length)
      let pick: [number, number] = [1, 1]
      for (let k = 0; k < SIZES.length; k++) {
        const [w, h] = SIZES[(start + k) % SIZES.length]!
        let ok = gx + w <= nc && gy + h <= nr
        for (let yy = 0; ok && yy < h; yy++)
          for (let xx = 0; ok && xx < w; xx++) if (occ[(gy + yy) * nc + gx + xx]) ok = false
        if (ok) {
          pick = [w, h]
          break
        }
      }
      place(gx, gy, pick[0], pick[1], seed)
    }
  }

  const owner = new Int16Array(N).fill(-1)
  const shade = new Float32Array(N)
  const vpos = new Float32Array(N) // 0 at a tile's top edge, 1 at its bottom
  const bg = new Float32Array(N)
  const diag = new Float32Array(N)
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const d = Math.hypot((x / cols - focus) * aspect, (y / rows - 0.5) * 1.2)
      const i = y * cols + x
      bg[i] = 0.1 * smooth(0.55, 0.9, fbm((x / cols) * 6 * aspect, (y / rows) * 6, 3)) * Math.exp(-d * d * 2)
      diag[i] = (x / cols) * aspect * 0.55 + y / rows
    }
  }
  const e = Math.max(1, Math.round(u * 0.06)) // rim and edge thickness
  const cr = Math.max(1, Math.round(u * 0.08)) // the stepped corner cut
  tiles.forEach((tl, k) => {
    const x0 = ox + tl.gx * u + Math.floor(gap / 2)
    const y0 = oy + tl.gy * u + Math.floor(gap / 2)
    const W = tl.w * u - gap
    const H = tl.h * u - gap
    const p = Math.round(u * 0.18)
    const bh = Math.max(2, Math.round(u * 0.1))
    for (let ly = 0; ly < H; ly++) {
      const y = y0 + ly
      if (y < 0 || y >= rows) continue
      for (let lx = 0; lx < W; lx++) {
        const x = x0 + lx
        if (x < 0 || x >= cols) continue
        if (Math.min(lx, W - 1 - lx) + Math.min(ly, H - 1 - ly) < cr) continue
        const i = y * cols + x
        if (tl.hollow) {
          // The empty slot: dark inside, a dashed line along its stepped outline.
          const edge = lx < e || ly < e || lx >= W - e || ly >= H - e
          owner[i] = edge && (x + y) % 8 < 4 ? -2 : -3
          continue
        }
        let tone = 0.42
        if (ly < e) tone = 1
        else if (lx < e) tone = 0.8
        else if (ly >= H - e || lx >= W - e) tone = 0.3
        else {
          const ix = lx - p
          const iy = ly - p
          const iw = W - 2 * p
          const ih = H - 2 * p
          if (ix >= 0 && iy >= 0 && ix < iw && iy < ih) {
            if (tl.kind === 0) {
              if (iy < bh && ix < iw * 0.62) tone = 0.88
              else if (iy >= bh * 2 && iy < bh * 3 && ix < iw * 0.36) tone = 0.66
            } else if (tl.kind === 1) {
              if (iy >= ih - bh) tone = ix < iw * (0.3 + 0.6 * hash(tl.seed, 4)) ? 0.92 : 0.24
              else if (iy < bh && ix < iw * 0.45) tone = 0.8
            } else if (ix < Math.min(iw, ih) * 0.45 && iy < Math.min(iw, ih) * 0.45) tone = 0.86
          }
        }
        owner[i] = k
        shade[i] = tone * tl.depth
        vpos[i] = ly / H
      }
    }
  })

  const T = 6.5 // seconds between two refreshes of one tile
  const phases = tiles.map((tl) => hash(tl.seed, 9) * T)
  return {
    frame: (t) => {
      const sweep = ((t * 0.09) % 1.9) - 0.3
      for (let i = 0; i < N; i++) {
        const k = owner[i]!
        if (k === -2) {
          // The missing widget's outline: faint, flaring as the sweep crosses it.
          const g = (diag[i]! - sweep * (1 + aspect * 0.55)) / 0.08
          out[i] = clamp01(0.5 + Math.exp(-g * g) * 0.6)
          continue
        }
        if (k === -3) {
          out[i] = 0
          continue
        }
        if (k < 0) {
          out[i] = bg[i]!
          continue
        }
        // The refresh: a scan line stepping down the tile in 16 steps over 0.9 s.
        const lt = (t + phases[k]!) % T
        let add = 0
        if (lt < 0.9) {
          const s = Math.floor((lt / 0.9) * 16) / 16
          const dv = vpos[i]! - s
          if (dv > -0.07 && dv <= 0) add = 0.5 * tiles[k]!.depth
          else if (dv < 0) add = 0.1 * tiles[k]!.depth
        }
        out[i] = clamp01(shade[i]! + add)
      }
      return out
    },
  }
}

const scenes = {
  // The signature: widget tiles on the home screen cell grid, refreshing around the focus.
  cells: (cols, rows, focus) => cellsScene(cols, rows, focus),

  // Hollow: the same grid with the widget at the focus missing, for the 404 page.
  hollow: (cols, rows, focus) => cellsScene(cols, rows, focus, true),

  // Soft, slowly turning bands of light on black: a quiet backdrop for code and commands.
  flow: (cols, rows) => {
    const out = new Float32Array(cols * rows)
    const aspect = cols / rows
    const warp = mistTexture(cols, rows, 2 * aspect, 2)
    return {
      frame: (t) => {
        const shift = Math.floor(t * 4) % cols
        for (let y = 0; y < rows; y++) {
          const v = y / rows
          const row = y * cols
          for (let x = 0; x < cols; x++) {
            const u = x / cols
            const w = warp[row + ((x + shift) % cols)]! * 3.2
            const band = 0.5 + 0.5 * Math.sin((u * 1.6 * aspect * 0.35 + v * 1.3) * Math.PI + w + t * 0.15)
            const edges = smooth(0, 0.3, u) * smooth(1, 0.7, u) * 0.4 + 0.6
            // Capped just above the midtone, so the bands stay the dark accent mix with only a
            // few accent pixels at their crests: quiet enough to sit behind code.
            out[row + x] = smooth(0.35, 1, band) * edges * (1 - Math.abs(u - 0.5) * 0.6) * 0.55
          }
        }
        return out
      },
    }
  },
} satisfies Record<string, SceneBuilder>

export type SceneName = keyof typeof scenes

/** A canvas on the page, or one handed to the dither worker (dither.worker.ts). */
type Surface = HTMLCanvasElement | OffscreenCanvas
type Painted = { key: string; scene: Scene; image: ImageData; px: Uint32Array; palette: number[] }
const cache = new WeakMap<Surface, Painted>()

/** Packs the three tones (background, a dark mix of the accent, the accent) as RGBA words. */
function palette(rgb: number[]) {
  const [r, g, b] = rgb as [number, number, number]
  const pack = (cr: number, cg: number, cb: number) =>
    (255 << 24) | (Math.round(cb) << 16) | (Math.round(cg) << 8) | Math.round(cr)
  const mix = (c: number) => 10 + (c - 10) * 0.3
  return [pack(10, 10, 10), pack(mix(r), mix(g), mix(b)), pack(r, g, b)]
}

/**
 * Draws frame t of a scene onto a canvas sized one pixel per cell; CSS scales it up with
 * `image-rendering: pixelated`. The scene and the pixel buffer are kept per canvas and rebuilt
 * only when its size changes. Tones are ordered-dithered between neighbouring colours.
 */
export function drawDither(
  canvas: Surface,
  name: string,
  t: number,
  rgb: number[],
  cols: number,
  rows: number,
  focus: number,
  mark: readonly string[] = []
) {
  // Only the scene table's own keys: a name like `constructor` must not reach Object.prototype.
  const build: SceneBuilder | undefined = Object.hasOwn(scenes, name) ? scenes[name as SceneName] : undefined
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
  if (!build || !ctx || cols < 2 || rows < 2) return
  const key = `${name}:${cols}x${rows}:${focus}`
  let entry = cache.get(canvas)
  if (!entry || entry.key !== key) {
    canvas.width = cols
    canvas.height = rows
    const image = ctx.createImageData(cols, rows)
    entry = {
      key,
      scene: build(cols, rows, focus, mark),
      image,
      px: new Uint32Array(image.data.buffer),
      palette: palette(rgb),
    }
    cache.set(canvas, entry)
  }
  const tones = entry.scene.frame(t)
  const { px, palette: colours } = entry
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x
      const scaled = tones[i]! * 2
      const low = Math.min(1, Math.floor(scaled))
      const step = scaled - low > BAYER[(y & 3) * 4 + (x & 3)]! ? 1 : 0
      px[i] = colours[low + step]!
    }
  }
  ctx.putImageData(entry.image, 0, 0)
}

const FRAME_MS = 1000 / 12 // a deliberately low frame rate keeps the pixels reading as pixels

export type DitherOptions = {
  scene: string
  focus: number
  cell: number
  rgb: number[]
  still: boolean
  /** The product's mark (content.ts), passed to every scene builder. */
  mark: string[]
}

/**
 * Animates a scene on a canvas at 12 frames a second while it is visible, or draws one still
 * frame under reduced motion. Runs the same in the dither worker and, as a fallback, on the
 * page; the caller reports the canvas's CSS size and whether it is on screen.
 */
export function animate(canvas: Surface, o: DitherOptions) {
  const start = performance.now() - Math.random() * 20000
  let width = 0
  let height = 0
  let visible = false
  let timer: ReturnType<typeof setTimeout> | undefined

  const draw = () => {
    const cols = Math.ceil(width / o.cell)
    const rows = Math.ceil(height / o.cell)
    // The still frame is taken nine seconds in, when the glint is on the cluster.
    const t = o.still ? 9 : (performance.now() - start) / 1000
    drawDither(canvas, o.scene, t, o.rgb, cols, rows, o.focus, o.mark)
  }
  const loop = () => {
    timer = undefined
    if (!visible || !width) return
    draw()
    if (!o.still) timer = setTimeout(loop, FRAME_MS)
  }

  return {
    setSize(w: number, h: number) {
      width = w
      height = h
      if (visible && !timer) loop()
    },
    setVisible(on: boolean) {
      visible = on
      if (on && !timer) loop()
      if (!on && timer) {
        clearTimeout(timer)
        timer = undefined
      }
    },
  }
}
