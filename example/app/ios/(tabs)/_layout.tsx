import Ionicons from '@expo/vector-icons/Ionicons'
import { Tabs } from 'expo-router'

const TAB_BAR_COLORS = {
  active: '#A78BFA',
  inactive: '#94A3B8',
  background: '#020617',
  border: 'rgba(148, 163, 184, 0.18)',
}

export default function IOSTabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: TAB_BAR_COLORS.active,
        tabBarInactiveTintColor: TAB_BAR_COLORS.inactive,
        tabBarStyle: {
          backgroundColor: TAB_BAR_COLORS.background,
          borderTopColor: TAB_BAR_COLORS.border,
        },
        tabBarIcon: ({ color, size }) => {
          const iconName =
            route.name === 'activity'
              ? 'radio-outline'
              : route.name === 'widgets'
              ? 'grid-outline'
              : 'ellipsis-horizontal-circle-outline'

          return <Ionicons name={iconName} size={size} color={color} />
        },
      })}
    >
      <Tabs.Screen name="activity" options={{ title: 'Live Activities' }} />
      <Tabs.Screen name="widgets" options={{ title: 'Widgets' }} />
      <Tabs.Screen name="others" options={{ title: 'Others' }} />
    </Tabs>
  )
}
