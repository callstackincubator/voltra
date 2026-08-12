import { useLocalSearchParams, useRouter } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

import { Button } from '~/components/Button'

export default function DeepLinkIndexScreen() {
  const { activityName } = useLocalSearchParams<{ activityName: string }>()
  const router = useRouter()

  const goBack = () => {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/')
    }
  }

  return (
    <View style={[styles.root]}>
      <View style={styles.content}>
        <Text style={styles.title}>You&apos;ve been deep linked via Voltra</Text>

        <Text style={styles.activityText}>Activity: {activityName}</Text>

        <Button title="Go back" onPress={goBack} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'column',
    justifyContent: 'flex-end',
    paddingTop: 32,
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  content: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  title: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  activityText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
  },
})
