import { useRouter } from 'expo-router'
import React, { useRef, useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import { updateDynamicWidget } from '@use-voltra/ios-client'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'
import { ScreenLayout } from '~/components/ScreenLayout'

const DYNAMIC_WIDGET_ID = 'ClientRenderedDemoWidget'

type IOSDynamicWidgetProps = {
  headline: string
  unreadCount: number
}

type Feedback = {
  kind: 'success' | 'error'
  message: string
}

export default function IOSDynamicWidgetScreen() {
  const router = useRouter()
  const [headline, setHeadline] = useState('Hello from iOS')
  const [unreadCount, setUnreadCount] = useState('3')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [lastSubmitted, setLastSubmitted] = useState<IOSDynamicWidgetProps | null>(null)
  const isSubmittingRef = useRef(false)

  const handleSubmit = async () => {
    if (isSubmittingRef.current) {
      return
    }

    const trimmedHeadline = headline.trim()
    const parsedUnreadCount = Number(unreadCount)

    if (!trimmedHeadline) {
      setFeedback({ kind: 'error', message: 'Enter a headline before updating the Dynamic Widget.' })
      return
    }

    if (unreadCount.trim() === '' || !Number.isInteger(parsedUnreadCount) || parsedUnreadCount < 0) {
      setFeedback({ kind: 'error', message: 'Unread count must be a whole number of zero or greater.' })
      return
    }

    const props: IOSDynamicWidgetProps = {
      headline: trimmedHeadline,
      unreadCount: parsedUnreadCount,
    }

    isSubmittingRef.current = true
    setIsSubmitting(true)
    setFeedback(null)

    try {
      await updateDynamicWidget(DYNAMIC_WIDGET_ID, props)
      setLastSubmitted(props)
      setFeedback({ kind: 'success', message: 'iOS Dynamic Widget updated successfully.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setFeedback({ kind: 'error', message: `Unable to update the iOS Dynamic Widget: ${message}` })
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <ScreenLayout
      title="iOS Dynamic Widget"
      description="Send runtime props to the entry-based iOS Dynamic Widget. Add the Client-Rendered Demo widget first to see updates on your home screen."
    >
      <Card>
        <Card.Title>Runtime props</Card.Title>
        <Card.Text>
          These values are persisted separately from widget configuration and passed to the entry component together.
        </Card.Text>

        <View style={styles.field}>
          <Text style={styles.label}>Headline</Text>
          <TextInput
            accessibilityLabel="iOS Dynamic Widget headline"
            style={styles.input}
            value={headline}
            onChangeText={setHeadline}
            editable={!isSubmitting}
            maxLength={48}
            placeholder="e.g. iOS inbox"
            placeholderTextColor="#64748B"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Unread count</Text>
          <TextInput
            accessibilityLabel="iOS Dynamic Widget unread count"
            style={styles.input}
            value={unreadCount}
            onChangeText={setUnreadCount}
            editable={!isSubmitting}
            keyboardType="numeric"
            maxLength={6}
            placeholder="0"
            placeholderTextColor="#64748B"
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title={isSubmitting ? 'Updating...' : 'Update iOS Dynamic Widget'}
            onPress={handleSubmit}
            disabled={isSubmitting}
          />
        </View>

        {feedback ? (
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={[styles.feedback, feedback.kind === 'success' ? styles.success : styles.error]}
          >
            {feedback.message}
          </Text>
        ) : null}
      </Card>

      <Card>
        <Card.Title>Last submitted</Card.Title>
        {lastSubmitted ? (
          <View style={styles.submittedValues}>
            <Card.Text>Headline: {lastSubmitted.headline}</Card.Text>
            <Card.Text>Unread count: {lastSubmitted.unreadCount}</Card.Text>
          </View>
        ) : (
          <Card.Text>No runtime props submitted in this session.</Card.Text>
        )}
      </Card>

      <View style={styles.footer}>
        <Button title="Back to iOS Widgets" variant="ghost" onPress={() => router.back()} />
      </View>
    </ScreenLayout>
  )
}

const styles = StyleSheet.create({
  field: {
    marginTop: 16,
    gap: 8,
  },
  label: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
    borderRadius: 12,
    backgroundColor: '#1E293B',
    color: '#E2E8F0',
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: 20,
  },
  feedback: {
    marginTop: 14,
    fontSize: 13,
    lineHeight: 18,
  },
  success: {
    color: '#6EE7B7',
  },
  error: {
    color: '#FCA5A5',
  },
  submittedValues: {
    marginTop: 8,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
})
