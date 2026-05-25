import { ActiveWidgetsAndroidCard } from '~/components/ActiveWidgetsAndroidCard'
import { ExampleSectionCards } from '~/components/ExampleSectionCards'
import { ScreenLayout } from '~/components/ScreenLayout'
import { ANDROID_WIDGET_SECTIONS } from '~/screens/android/tabs/sections'

export default function AndroidScreen() {
  return (
    <ScreenLayout
      title="Android Widgets"
      description="Build Android home screen widgets with React Native. Explore pinning, previews, charts, and server-driven updates."
    >
      <ActiveWidgetsAndroidCard />
      <ExampleSectionCards sections={ANDROID_WIDGET_SECTIONS} />
    </ScreenLayout>
  )
}
