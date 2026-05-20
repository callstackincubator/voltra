import { useRouter } from 'expo-router'
import { StyleSheet, View } from 'react-native'

import { Button } from './Button'
import { Card } from './Card'

export type ExampleSection = {
  id: string
  title: string
  description: string
  route: '/testing-grounds/weather'
    | '/testing-grounds/timer'
    | '/testing-grounds/styling'
    | '/testing-grounds/positioning'
    | '/testing-grounds/progress'
    | '/testing-grounds/components'
    | '/testing-grounds/flex-playground'
    | '/testing-grounds/chart-playground'
    | '/testing-grounds/gradient-playground'
    | '/testing-grounds/image-preloading'
    | '/testing-grounds/image-fallback'
    | '/testing-grounds/widget-scheduling'
    | '/testing-grounds/server-driven-widgets'
    | '/testing-grounds/channel-updates'
    | '/android-widgets/pin'
    | '/android-widgets/image-preloading'
    | '/android-widgets/image-fallback'
    | '/android-widgets/preview'
    | '/android-widgets/charts'
    | '/android-widgets/server-driven'
    | '/android-widgets/material-colors'
    | '/android-widgets/custom-fonts'
}

export type ExampleSectionCardsProps = {
  sections: ExampleSection[]
}

export function ExampleSectionCards({ sections }: ExampleSectionCardsProps) {
  const router = useRouter()

  return sections.map((section) => (
    <Card key={section.id}>
      <Card.Title>{section.title}</Card.Title>
      <Card.Text>{section.description}</Card.Text>
      <View style={styles.buttonContainer}>
        <Button title={`Explore ${section.title}`} variant="primary" onPress={() => router.push(section.route)} />
      </View>
    </Card>
  ))
}

const styles = StyleSheet.create({
  buttonContainer: {
    marginTop: 16,
  },
})
