import { ForwardRefExoticComponent, RefAttributes } from 'react'

export type LiveActivityExampleComponentProps = {
  autoUpdate?: boolean
  autoStart?: boolean
  onIsActiveChange?: (isActive: boolean) => void
}

export type LiveActivityExampleComponentRef = {
  start: () => Promise<void>
  end: () => Promise<void>
  update: () => Promise<void>
}

export type LiveActivityExampleComponent = ForwardRefExoticComponent<
  LiveActivityExampleComponentProps & RefAttributes<LiveActivityExampleComponentRef>
>
