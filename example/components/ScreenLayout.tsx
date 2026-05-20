import { ReactNode } from 'react'
import { ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

export type ScreenLayoutProps = {
  title: string
  description?: string
  children?: ReactNode
  contentContainerStyle?: StyleProp<ViewStyle>
}

export function ScreenLayout({ title, description, children, contentContainerStyle }: ScreenLayoutProps) {
  const insets = useSafeAreaInsets()

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }, contentContainerStyle]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#020617',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  description: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#CBD5F5',
  },
})
