// The How it works editor: the order tracker's JSX appears line by line, and each element shows up in
// the preview as soon as its line is written (`data-at` is the line that draws it), with the
// Fast Refresh dot lighting each time. The page renders the finished file and preview (the
// still frame); the loop resets it and plays it.
import { sleep, whenVisible } from '../site/anim'

export default function runHero(viz: HTMLElement) {
  const lines = [...viz.querySelectorAll<HTMLElement>('[data-code] .line')]
  const parts = [...viz.querySelectorAll<HTMLElement>('[data-at]')]
  const dot = viz.querySelector<HTMLElement>('[data-dot]')
  if (!lines.length) return

  const refresh = async () => {
    dot?.classList.add('is-live')
    await sleep(300)
    dot?.classList.remove('is-live')
  }

  const play = async () => {
    // Laid out in full, then hidden: revealing never reflows.
    for (const l of lines) l.classList.add('is-pending')
    for (const p of parts) p.classList.add('is-pending')
    await sleep(900)
    for (const [i, line] of lines.entries()) {
      const blank = !(line.textContent ?? '').trim()
      line.classList.remove('is-pending')
      const due = parts.filter((p) => Number(p.dataset.at) === i + 1)
      if (due.length) {
        await sleep(240)
        for (const p of due) p.classList.remove('is-pending')
        void refresh()
      }
      await sleep(blank ? 90 : 380)
    }
    await sleep(3600)
  }

  whenVisible(viz, play, () => {})
}
