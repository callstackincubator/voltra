import { ActiveWidgetsIOSCard } from '~/components/ActiveWidgetsIOSCard'
import { ExampleSectionCards } from '~/components/ExampleSectionCards'
import { ScreenLayout } from '~/components/ScreenLayout'
import { IOS_WIDGET_SECTIONS } from '~/screens/ios/tabs/sections'

export default function WidgetsScreen() {
  return (
    <ScreenLayout
      title="iOS Widgets"
      description="Explore widget-specific examples for iOS, including weather, timeline scheduling, server-driven updates, and image handling."
    >
      <ActiveWidgetsIOSCard />
      <ExampleSectionCards sections={IOS_WIDGET_SECTIONS} />
    </ScreenLayout>
  )
}
