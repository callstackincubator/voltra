import { ExampleSectionCards } from '~/components/ExampleSectionCards'
import { ScreenLayout } from '~/components/ScreenLayout'
import { ANDROID_OTHER_SECTIONS } from '~/screens/android/tabs/sections'

export default function OthersScreen() {
  return (
    <ScreenLayout
      title="Other Examples"
      description="Explore Voltra capabilities for Android including image handling, Material theming, and custom fonts."
    >
      <ExampleSectionCards sections={ANDROID_OTHER_SECTIONS} />
    </ScreenLayout>
  )
}
