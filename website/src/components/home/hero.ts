// The hero animation: both phones start empty, the order appears on each (the iPhone Live
// Activity, then the Android widget with its refresh scan), and then the arrival lands on both.
// The page renders the final state; the loop resets it and plays it.
import { sleep, whenVisible } from '../site/anim'

export default function runHero(viz: HTMLElement) {
  const lock = viz.querySelector<HTMLElement>('[data-lock]')
  const homeScreen = viz.querySelector<HTMLElement>('[data-home]')
  const card = viz.querySelector<HTMLElement>('[data-la]')
  const widget = viz.querySelector<HTMLElement>('[data-wg]')
  if (!lock || !homeScreen || !card || !widget) return

  const land = async (state: string) => {
    lock.dataset.state = state
    card.classList.add('is-hit')
    await sleep(350)
    homeScreen.dataset.state = state
    widget.classList.remove('is-hit')
    void widget.offsetWidth // restart the scan
    widget.classList.add('is-hit')
    await sleep(600)
    card.classList.remove('is-hit')
  }

  const play = async () => {
    lock.dataset.state = 'off'
    homeScreen.dataset.state = 'off'
    widget.classList.remove('is-hit')
    await sleep(900)
    await land('enroute')
    await sleep(2600)
    await land('arrived')
    await sleep(3600)
  }

  whenVisible(viz, play, () => {})
}
