import { Voltra } from 'voltra'

export type GreetingName = 'friend' | 'world' | 'team' | 'there'
export type GreetingTheme = 'purple' | 'ocean' | 'sunset'

export interface GreetingWidgetProps {
  name?: GreetingName
  theme?: GreetingTheme
  showEmoji?: boolean
}

const NAME_LABELS: Record<GreetingName, string> = {
  friend: 'Friend',
  world: 'World',
  team: 'Team',
  there: 'There',
}

const THEME_GRADIENTS: Record<GreetingTheme, { colors: string[]; start: { x: number; y: number }; end: { x: number; y: number } }> = {
  purple: {
    colors: ['#6B21A8', '#8232FF', '#A78BFA'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  ocean: {
    colors: ['#0C4A6E', '#0284C7', '#38BDF8'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  sunset: {
    colors: ['#7C2D12', '#EA580C', '#FBBF24'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
}

const THEME_EMOJIS: Record<GreetingTheme, string> = {
  purple: '✨',
  ocean: '🌊',
  sunset: '🌅',
}

export const IosGreetingWidget = ({
  name = 'friend',
  theme = 'purple',
  showEmoji = true,
}: GreetingWidgetProps) => {
  const gradient = THEME_GRADIENTS[theme]
  const emoji = THEME_EMOJIS[theme]
  const label = NAME_LABELS[name]

  return (
    <Voltra.LinearGradient colors={gradient.colors} start={gradient.start} end={gradient.end} style={{ flex: 1 }}>
      <Voltra.VStack style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
        {showEmoji ? (
          <Voltra.Text style={{ fontSize: 36, marginBottom: 8 }}>{emoji}</Voltra.Text>
        ) : null}
        <Voltra.Text
          style={{
            fontSize: 14,
            fontWeight: '500',
            color: 'rgba(255,255,255,0.8)',
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          Hello,
        </Voltra.Text>
        <Voltra.Text
          style={{
            fontSize: 28,
            fontWeight: '700',
            color: '#FFFFFF',
            shadowColor: '#000000',
            shadowOpacity: 0.25,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
          }}
        >
          {label}!
        </Voltra.Text>
      </Voltra.VStack>
    </Voltra.LinearGradient>
  )
}
