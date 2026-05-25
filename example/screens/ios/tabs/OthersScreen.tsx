import { ExampleSectionCards } from '~/components/ExampleSectionCards'
import { ScreenLayout } from '~/components/ScreenLayout'
import { IOS_OTHER_SECTIONS } from '~/screens/ios/tabs/sections'

export default function OthersScreen() {
  return (
    <ScreenLayout
      title="Other Examples"
      description="Explore general Voltra examples beyond Live Activities and widgets."
    >
      <ExampleSectionCards sections={IOS_OTHER_SECTIONS} />
    </ScreenLayout>
  )
}
