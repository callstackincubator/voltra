import { Voltra } from 'voltra'

const OutdatedGreetingWidget = () => (
  <Voltra.LinearGradient
    colors={['#3B1F6E', '#5A2DB8', '#7B52C8']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={{ flex: 1 }}
  >
    <Voltra.VStack style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
      <Voltra.Text style={{ fontSize: 24, marginBottom: 6 }}>✏️</Voltra.Text>
      <Voltra.Text
        style={{
          fontSize: 14,
          fontWeight: '600',
          color: '#FFFFFF',
        }}
      >
        Open app to apply changes
      </Voltra.Text>
    </Voltra.VStack>
  </Voltra.LinearGradient>
)

const variants = {
  systemSmall: <OutdatedGreetingWidget />,
  systemMedium: <OutdatedGreetingWidget />,
}

export default variants
