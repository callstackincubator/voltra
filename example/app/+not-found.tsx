import { usePathname, useRouter } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

import { Button } from '~/components/Button'

export default function NotFound() {
  const pathname = usePathname()
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
        <Text style={styles.text}>Not found: {pathname}</Text>
        <Button title="Go back" onPress={goBack} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  content: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginBottom: 120,
  },
  text: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
})
