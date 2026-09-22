import { useFocusEffect } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { AppState, PermissionsAndroid, Platform, StyleSheet, Text, TextInput, View } from 'react-native'
import {
  AndroidOngoingNotification,
  type AndroidOngoingNotificationPayload,
  type StartAndroidOngoingNotificationOptions,
} from '@use-voltra/android'
import {
  getAndroidOngoingNotificationCapabilities,
  isAndroidOngoingNotificationActive,
  renderAndroidOngoingNotificationPayload,
  startAndroidOngoingNotification,
  stopAndroidOngoingNotification,
  upsertAndroidOngoingNotification,
  updateAndroidOngoingNotification,
} from '@use-voltra/android-client'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'
import { ScreenLayout } from '~/components/ScreenLayout'

type OngoingNotificationStyle = 'progress' | 'bigText' | 'bigPicture' | 'inbox'

const DEFAULT_NOTIFICATION_ID = 'testing-ground-android-ongoing-notification'
const DEFAULT_SEGMENTS = '[{"length": 40, "color": "#34D399"}, {"length": 60}]'
const DEFAULT_POINTS = '[{"position": 20, "color": "#F59E0B"}, {"position": 72}]'
const DEFAULT_LINES = '12 Oak Street\n4 Elm Road\nDepot'
const DEFAULT_PRIMARY_ACTION_DEEP_LINK = 'voltra://orders/123'
const DEFAULT_SECONDARY_ACTION_DEEP_LINK = 'voltra://orders/123/track'
const DEFAULT_PRIMARY_ACTION_ICON = 'voltra_icon'

const formatJson = (value: unknown) => JSON.stringify(value, null, 2)

const parseInteger = (value: string, fallback: number) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

const parseJsonArray = <T,>(value: string, fallback: T[]): T[] => {
  if (!value.trim()) {
    return fallback
  }

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? (parsed as T[]) : fallback
  } catch {
    return fallback
  }
}

const toImageSource = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }

  return { assetName: trimmed } as const
}

// Keeps an empty picture or line field reachable on purpose: the renderer then reports the missing
// prop, which is what the screen is for.
const toRequiredImageSource = (value: string) => toImageSource(value) ?? { assetName: '' }

const toLines = (value: string) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

const toOptionalNonEmptyString = (value: string) => {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export default function AndroidOngoingNotificationTestingScreen() {
  const [style, setStyle] = useState<OngoingNotificationStyle>('progress')
  const [notificationId, setNotificationId] = useState(DEFAULT_NOTIFICATION_ID)
  const [channelId, setChannelId] = useState('voltra_live_updates')
  const [smallIcon, setSmallIcon] = useState('')
  const [requestPromotedOngoing, setRequestPromotedOngoing] = useState(true)
  const [title, setTitle] = useState('Driver is approaching')
  const [text, setText] = useState('2 stops away')
  const [bigText, setBigText] = useState('Your courier is moving through the final neighborhood.')
  const [lines, setLines] = useState(DEFAULT_LINES)
  const [summaryText, setSummaryText] = useState('Order 123')
  const [picture, setPicture] = useState('voltra_widget_voltra_preview')
  const [pictureContentDescription, setPictureContentDescription] = useState('Photo of the parcel at the front door')
  const [showPictureWhenCollapsed, setShowPictureWhenCollapsed] = useState(false)
  const [bigLargeIcon, setBigLargeIcon] = useState('')
  const [hideLargeIconWhenExpanded, setHideLargeIconWhenExpanded] = useState(false)
  const [subText, setSubText] = useState('ETA 4 min')
  const [shortCriticalText, setShortCriticalText] = useState('Soon')
  const [progressValue, setProgressValue] = useState('32')
  const [progressMax, setProgressMax] = useState('100')
  const [indeterminate, setIndeterminate] = useState(false)
  const [chronometer, setChronometer] = useState(false)
  const [largeIcon, setLargeIcon] = useState('')
  const [progressTrackerIcon, setProgressTrackerIcon] = useState('')
  const [progressStartIcon, setProgressStartIcon] = useState('')
  const [progressEndIcon, setProgressEndIcon] = useState('')
  const [segmentsJson, setSegmentsJson] = useState(DEFAULT_SEGMENTS)
  const [pointsJson, setPointsJson] = useState(DEFAULT_POINTS)
  const [primaryActionTitle, setPrimaryActionTitle] = useState('Open order')
  const [primaryActionDeepLinkUrl, setPrimaryActionDeepLinkUrl] = useState(DEFAULT_PRIMARY_ACTION_DEEP_LINK)
  const [primaryActionIcon, setPrimaryActionIcon] = useState(DEFAULT_PRIMARY_ACTION_ICON)
  const [secondaryActionTitle, setSecondaryActionTitle] = useState('Track driver')
  const [secondaryActionDeepLinkUrl, setSecondaryActionDeepLinkUrl] = useState(DEFAULT_SECONDARY_ACTION_DEEP_LINK)
  const [renderedPayload, setRenderedPayload] = useState('')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null)
  const [activeState, setActiveState] = useState(() => isAndroidOngoingNotificationActive(DEFAULT_NOTIFICATION_ID))
  const [capabilities, setCapabilities] = useState(() => getAndroidOngoingNotificationCapabilities())

  const refreshCapabilities = useCallback(() => {
    setCapabilities(getAndroidOngoingNotificationCapabilities())
  }, [])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshCapabilities()
      }
    })

    return () => subscription.remove()
  }, [refreshCapabilities])

  useFocusEffect(refreshCapabilities)

  const content = useMemo(() => {
    const actionChildren = (
      <>
        {toOptionalNonEmptyString(primaryActionTitle) && toOptionalNonEmptyString(primaryActionDeepLinkUrl) ? (
          <AndroidOngoingNotification.Action
            title={toOptionalNonEmptyString(primaryActionTitle)!}
            deepLinkUrl={toOptionalNonEmptyString(primaryActionDeepLinkUrl)!}
            icon={toImageSource(primaryActionIcon)}
          />
        ) : null}
        {toOptionalNonEmptyString(secondaryActionTitle) && toOptionalNonEmptyString(secondaryActionDeepLinkUrl) ? (
          <AndroidOngoingNotification.Action
            title={toOptionalNonEmptyString(secondaryActionTitle)!}
            deepLinkUrl={toOptionalNonEmptyString(secondaryActionDeepLinkUrl)!}
          />
        ) : null}
      </>
    )

    if (style === 'progress') {
      return (
        <AndroidOngoingNotification.Progress
          title={title}
          subText={subText || undefined}
          text={text || undefined}
          value={Math.max(0, parseInteger(progressValue, 0))}
          max={Math.max(1, parseInteger(progressMax, 100))}
          indeterminate={indeterminate}
          shortCriticalText={shortCriticalText || undefined}
          chronometer={chronometer}
          when={chronometer ? Date.now() : undefined}
          largeIcon={toImageSource(largeIcon)}
          progressTrackerIcon={toImageSource(progressTrackerIcon)}
          progressStartIcon={toImageSource(progressStartIcon)}
          progressEndIcon={toImageSource(progressEndIcon)}
          segments={parseJsonArray(segmentsJson, [])}
          points={parseJsonArray(pointsJson, [])}
        >
          {actionChildren}
        </AndroidOngoingNotification.Progress>
      )
    }

    if (style === 'bigPicture') {
      return (
        <AndroidOngoingNotification.BigPicture
          title={title}
          subText={subText || undefined}
          text={text || undefined}
          picture={toRequiredImageSource(picture)}
          summaryText={summaryText || undefined}
          pictureContentDescription={pictureContentDescription || undefined}
          showPictureWhenCollapsed={showPictureWhenCollapsed}
          largeIcon={toImageSource(largeIcon)}
          bigLargeIcon={toImageSource(bigLargeIcon)}
          hideLargeIconWhenExpanded={hideLargeIconWhenExpanded}
          shortCriticalText={shortCriticalText || undefined}
          chronometer={chronometer}
          when={chronometer ? Date.now() : undefined}
        >
          {actionChildren}
        </AndroidOngoingNotification.BigPicture>
      )
    }

    if (style === 'inbox') {
      return (
        <AndroidOngoingNotification.Inbox
          title={title}
          subText={subText || undefined}
          text={text || undefined}
          lines={toLines(lines)}
          summaryText={summaryText || undefined}
          largeIcon={toImageSource(largeIcon)}
          shortCriticalText={shortCriticalText || undefined}
          chronometer={chronometer}
          when={chronometer ? Date.now() : undefined}
        >
          {actionChildren}
        </AndroidOngoingNotification.Inbox>
      )
    }

    return (
      <AndroidOngoingNotification.BigText
        title={title}
        subText={subText || undefined}
        text={text || 'Ongoing notification body text'}
        bigText={bigText || undefined}
        shortCriticalText={shortCriticalText || undefined}
        chronometer={chronometer}
        when={chronometer ? Date.now() : undefined}
        largeIcon={toImageSource(largeIcon)}
      >
        {actionChildren}
      </AndroidOngoingNotification.BigText>
    )
  }, [
    bigLargeIcon,
    bigText,
    chronometer,
    hideLargeIconWhenExpanded,
    indeterminate,
    largeIcon,
    lines,
    picture,
    pictureContentDescription,
    pointsJson,
    primaryActionDeepLinkUrl,
    primaryActionIcon,
    primaryActionTitle,
    progressEndIcon,
    progressMax,
    progressStartIcon,
    progressTrackerIcon,
    progressValue,
    secondaryActionDeepLinkUrl,
    secondaryActionTitle,
    segmentsJson,
    shortCriticalText,
    showPictureWhenCollapsed,
    style,
    subText,
    summaryText,
    text,
    title,
  ])

  const syncActiveState = (id: string) => {
    setActiveState(isAndroidOngoingNotificationActive(id))
  }

  const getOngoingNotificationOptions = () => ({
    notificationId,
    channelId,
    smallIcon: smallIcon || undefined,
    requestPromotedOngoing,
  })

  const buildVoltraPushEnvelope = (operation: 'upsert' | 'stop' = 'upsert') => {
    const data: {
      voltraOngoingNotification: {
        notificationId: string
        operation: 'upsert' | 'stop'
        options: StartAndroidOngoingNotificationOptions
        payload?: AndroidOngoingNotificationPayload
      }
    } = {
      voltraOngoingNotification: {
        notificationId,
        operation,
        options: {
          channelId,
          smallIcon: smallIcon || undefined,
          requestPromotedOngoing,
        },
      },
    }

    if (operation === 'upsert') {
      const payloadString = renderedPayload || renderAndroidOngoingNotificationPayload(content)
      data.voltraOngoingNotification.payload = JSON.parse(payloadString) as AndroidOngoingNotificationPayload
    }

    return data
  }

  const sampleExpoPushRequest = useMemo(() => {
    try {
      return formatJson({
        to: 'ExponentPushToken[project-token]',
        priority: 'high',
        data: {
          voltraOngoingNotification: JSON.stringify(buildVoltraPushEnvelope('upsert').voltraOngoingNotification),
        },
      })
    } catch {
      return 'Render a valid payload first to generate a data-only Expo push example.'
    }
  }, [buildVoltraPushEnvelope])

  const handleRenderPayload = () => {
    const payload = renderAndroidOngoingNotificationPayload(content)
    setRenderedPayload(payload)
    setStatusMessage('Rendered semantic payload from JSX content.')
  }

  const handleStart = async () => {
    try {
      const result = await startAndroidOngoingNotification(content, getOngoingNotificationOptions())
      syncActiveState(result.notificationId)
      setStatusMessage(
        result.ok
          ? `Started Android ongoing notification "${result.notificationId}".`
          : `Did not start Android ongoing notification "${result.notificationId}": ${result.reason}.`
      )
      setRenderedPayload(renderAndroidOngoingNotificationPayload(content))
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to start Android ongoing notification.')
    }
  }

  const handleUpdate = async () => {
    try {
      const result = await updateAndroidOngoingNotification(notificationId, content, getOngoingNotificationOptions())
      syncActiveState(notificationId)
      setStatusMessage(
        result.ok
          ? `Updated Android ongoing notification "${notificationId}".`
          : `Did not update Android ongoing notification "${notificationId}": ${result.reason}.`
      )
      setRenderedPayload(renderAndroidOngoingNotificationPayload(content))
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to update Android ongoing notification.')
    }
  }

  const handleUpsertPayload = async () => {
    try {
      const payloadString = renderedPayload || renderAndroidOngoingNotificationPayload(content)
      const payload = JSON.parse(payloadString) as AndroidOngoingNotificationPayload
      const result = await upsertAndroidOngoingNotification(payload, getOngoingNotificationOptions())
      syncActiveState(result.notificationId)
      setRenderedPayload(formatJson(payload))
      setStatusMessage(
        result.ok
          ? `Upserted semantic payload for "${result.notificationId}" via ${result.action}.`
          : `Did not upsert ongoing notification "${result.notificationId}": ${result.reason}.`
      )
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'Failed to upsert Android ongoing notification payload.'
      )
    }
  }

  const handleStop = async () => {
    try {
      const result = await stopAndroidOngoingNotification(notificationId)
      syncActiveState(notificationId)
      setStatusMessage(
        result.ok
          ? `Stopped Android ongoing notification "${notificationId}".`
          : `Did not stop Android ongoing notification "${notificationId}": ${result.reason}.`
      )
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to stop Android ongoing notification.')
    }
  }

  const handleRefreshActiveState = () => {
    syncActiveState(notificationId)
    setStatusMessage(`Checked active state for "${notificationId}".`)
  }

  const handleRequestNotificationPermission = async () => {
    if (Platform.OS !== 'android') {
      return
    }

    if (Platform.Version < 33) {
      setPermissionStatus('Notification runtime permission is not required below Android 13.')
      return
    }

    try {
      const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS)
      setPermissionStatus(`Notification permission result: ${result}`)
      refreshCapabilities()
    } catch (error) {
      setPermissionStatus(error instanceof Error ? error.message : 'Failed to request notification permission.')
    }
  }

  if (Platform.OS !== 'android') {
    return (
      <ScreenLayout title="Android Ongoing Notifications" description="This example is only available on Android." />
    )
  }

  return (
    <ScreenLayout
      title="Android Ongoing Notifications"
      description="Test semantic Android ongoing notification payloads, capability checks, rich progress fields, and action buttons. For remote testing, send a real notification whose data contains the payload shown below."
    >
      <Card>
        <Card.Title>Rich Progress Fallback</Card.Title>
        <Card.Text>
          Segments, points, and tracker/start/end icons are applied on API 36+ only and ignored silently on older
          Android versions.
        </Card.Text>
        <Card.Text>Large icon and subtext remain available outside that richer path.</Card.Text>
      </Card>

      <Card>
        <Card.Title>Action Buttons</Card.Title>
        <Card.Text>Action children launch their own deep links.</Card.Text>
        <Card.Text>
          Action icons are still wired into the payload, but standard Android notification UI usually does not render
          them.
        </Card.Text>
        <Card.Text>Use the icon fields here to verify payload support, not visible action-button artwork.</Card.Text>
        <Card.Text>Unknown children are ignored, so this screen only renders explicit action entries.</Card.Text>
      </Card>

      <Card>
        <Card.Title>Picture And Lines</Card.Title>
        <Card.Text>
          Picture When Collapsed and Picture Description are read on API 31+; on older devices the picture still posts,
          without those two options.
        </Card.Text>
        <Card.Text>
          A picture is downscaled to 1024 px on the long edge, and any icon to 256 px, before posting.
        </Card.Text>
        <Card.Text>Inbox posts six lines. A seventh is rejected while the payload is rendered.</Card.Text>
        <Card.Text>
          Neither layout is promoted to a Live Update on Android 16, even with Request Promoted Ongoing on.
        </Card.Text>
      </Card>

      <Card>
        <Card.Title>Runtime Capabilities</Card.Title>
        <Card.Text>{`API ${capabilities.apiLevel} • notifications ${
          capabilities.notificationsEnabled ? 'enabled' : 'disabled'
        }`}</Card.Text>
        <Card.Text>{`Promoted support: ${capabilities.supportsPromotedNotifications ? 'yes' : 'no'}`}</Card.Text>
        <Card.Text>{`Can post promoted notifications: ${
          capabilities.canPostPromotedNotifications ? 'yes' : 'no'
        }`}</Card.Text>
        <Card.Text>{`Can request promoted ongoing: ${
          capabilities.canRequestPromotedOngoing ? 'yes' : 'no'
        }`}</Card.Text>
        <View style={styles.buttonRow}>
          <Button
            title="Ask Notification Permission"
            variant="secondary"
            onPress={handleRequestNotificationPermission}
          />
        </View>
        {permissionStatus ? <Text style={styles.status}>{permissionStatus}</Text> : null}
      </Card>

      <Card>
        <Card.Title>Ongoing Notification Target</Card.Title>
        <View style={styles.row}>
          <Text style={styles.label}>Notification ID</Text>
          <TextInput
            style={styles.input}
            value={notificationId}
            onChangeText={setNotificationId}
            autoCapitalize="none"
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Channel ID</Text>
          <TextInput style={styles.input} value={channelId} onChangeText={setChannelId} autoCapitalize="none" />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Small Icon</Text>
          <TextInput style={styles.input} value={smallIcon} onChangeText={setSmallIcon} autoCapitalize="none" />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Request Promoted Ongoing</Text>
          <Button
            title={requestPromotedOngoing ? 'ON' : 'OFF'}
            variant={requestPromotedOngoing ? 'primary' : 'secondary'}
            onPress={() => setRequestPromotedOngoing((current) => !current)}
            style={styles.smButton}
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Active State</Text>
          <Text style={[styles.badge, activeState ? styles.badgeActive : styles.badgeIdle]}>
            {activeState ? 'Active' : 'Idle'}
          </Text>
        </View>
        <Button title="Refresh Active State" variant="secondary" onPress={handleRefreshActiveState} />
      </Card>

      <Card>
        <Card.Title>Semantic Content</Card.Title>
        <View style={styles.row}>
          <Text style={styles.label}>Style</Text>
          <View style={styles.toggleGroup}>
            <Button
              title="Progress"
              variant={style === 'progress' ? 'primary' : 'secondary'}
              onPress={() => setStyle('progress')}
              style={styles.smButton}
            />
            <Button
              title="Big Text"
              variant={style === 'bigText' ? 'primary' : 'secondary'}
              onPress={() => setStyle('bigText')}
              style={styles.smButton}
            />
            <Button
              title="Big Picture"
              variant={style === 'bigPicture' ? 'primary' : 'secondary'}
              onPress={() => setStyle('bigPicture')}
              style={styles.smButton}
            />
            <Button
              title="Inbox"
              variant={style === 'inbox' ? 'primary' : 'secondary'}
              onPress={() => setStyle('inbox')}
              style={styles.smButton}
            />
          </View>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Title</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Text</Text>
          <TextInput style={styles.input} value={text} onChangeText={setText} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Sub Text</Text>
          <TextInput style={styles.input} value={subText} onChangeText={setSubText} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Short Critical</Text>
          <TextInput style={styles.input} value={shortCriticalText} onChangeText={setShortCriticalText} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Large Icon</Text>
          <TextInput
            style={styles.input}
            value={largeIcon}
            onChangeText={setLargeIcon}
            placeholder="assetName"
            placeholderTextColor="#6B7280"
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Chronometer</Text>
          <Button
            title={chronometer ? 'ON' : 'OFF'}
            variant={chronometer ? 'primary' : 'secondary'}
            onPress={() => setChronometer((current) => !current)}
            style={styles.smButton}
          />
        </View>

        {style === 'progress' ? (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Value</Text>
              <TextInput
                style={styles.input}
                value={progressValue}
                onChangeText={setProgressValue}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Max</Text>
              <TextInput
                style={styles.input}
                value={progressMax}
                onChangeText={setProgressMax}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Indeterminate</Text>
              <Button
                title={indeterminate ? 'ON' : 'OFF'}
                variant={indeterminate ? 'primary' : 'secondary'}
                onPress={() => setIndeterminate((current) => !current)}
                style={styles.smButton}
              />
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Tracker Icon</Text>
              <TextInput
                style={styles.input}
                value={progressTrackerIcon}
                onChangeText={setProgressTrackerIcon}
                placeholder="assetName"
                placeholderTextColor="#6B7280"
              />
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Start Icon</Text>
              <TextInput
                style={styles.input}
                value={progressStartIcon}
                onChangeText={setProgressStartIcon}
                placeholder="assetName"
                placeholderTextColor="#6B7280"
              />
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>End Icon</Text>
              <TextInput
                style={styles.input}
                value={progressEndIcon}
                onChangeText={setProgressEndIcon}
                placeholder="assetName"
                placeholderTextColor="#6B7280"
              />
            </View>
            <View style={styles.column}>
              <Text style={styles.label}>Segments JSON</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={segmentsJson}
                onChangeText={setSegmentsJson}
                multiline
              />
            </View>
            <View style={styles.column}>
              <Text style={styles.label}>Points JSON</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={pointsJson}
                onChangeText={setPointsJson}
                multiline
              />
            </View>
          </>
        ) : null}

        {style === 'bigText' ? (
          <View style={styles.column}>
            <Text style={styles.label}>Big Text</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={bigText}
              onChangeText={setBigText}
              multiline
            />
          </View>
        ) : null}

        {style === 'bigPicture' || style === 'inbox' ? (
          <View style={styles.row}>
            <Text style={styles.label}>Summary Text</Text>
            <TextInput style={styles.input} value={summaryText} onChangeText={setSummaryText} />
          </View>
        ) : null}

        {style === 'bigPicture' ? (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Picture</Text>
              <TextInput
                style={styles.input}
                value={picture}
                onChangeText={setPicture}
                placeholder="assetName"
                placeholderTextColor="#6B7280"
              />
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Picture Description</Text>
              <TextInput
                style={styles.input}
                value={pictureContentDescription}
                onChangeText={setPictureContentDescription}
              />
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Big Large Icon</Text>
              <TextInput
                style={styles.input}
                value={bigLargeIcon}
                onChangeText={setBigLargeIcon}
                placeholder="assetName"
                placeholderTextColor="#6B7280"
              />
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Picture When Collapsed</Text>
              <Button
                title={showPictureWhenCollapsed ? 'ON' : 'OFF'}
                variant={showPictureWhenCollapsed ? 'primary' : 'secondary'}
                onPress={() => setShowPictureWhenCollapsed((current) => !current)}
                style={styles.smButton}
              />
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Hide Thumbnail When Expanded</Text>
              <Button
                title={hideLargeIconWhenExpanded ? 'ON' : 'OFF'}
                variant={hideLargeIconWhenExpanded ? 'primary' : 'secondary'}
                onPress={() => setHideLargeIconWhenExpanded((current) => !current)}
                style={styles.smButton}
              />
            </View>
          </>
        ) : null}

        {style === 'inbox' ? (
          <View style={styles.column}>
            <Text style={styles.label}>Lines, one per row</Text>
            <TextInput style={[styles.input, styles.multilineInput]} value={lines} onChangeText={setLines} multiline />
          </View>
        ) : null}

        <View style={styles.column}>
          <Text style={styles.label}>Action Buttons</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Primary Title</Text>
            <TextInput style={styles.input} value={primaryActionTitle} onChangeText={setPrimaryActionTitle} />
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Primary Deep Link</Text>
            <TextInput
              style={styles.input}
              value={primaryActionDeepLinkUrl}
              onChangeText={setPrimaryActionDeepLinkUrl}
              autoCapitalize="none"
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Primary Icon</Text>
            <TextInput
              style={styles.input}
              value={primaryActionIcon}
              onChangeText={setPrimaryActionIcon}
              autoCapitalize="none"
              placeholder="assetName"
              placeholderTextColor="#6B7280"
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Secondary Title</Text>
            <TextInput style={styles.input} value={secondaryActionTitle} onChangeText={setSecondaryActionTitle} />
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Secondary Deep Link</Text>
            <TextInput
              style={styles.input}
              value={secondaryActionDeepLinkUrl}
              onChangeText={setSecondaryActionDeepLinkUrl}
              autoCapitalize="none"
            />
          </View>
        </View>
      </Card>

      <Card>
        <Card.Title>Actions</Card.Title>
        <View style={styles.buttonGrid}>
          <Button title="Render Payload" variant="secondary" onPress={handleRenderPayload} />
          <Button title="Start" variant="primary" onPress={handleStart} />
          <Button title="Update" variant="secondary" onPress={handleUpdate} />
          <Button title="Upsert" variant="secondary" onPress={handleUpsertPayload} />
          <Button title="Stop" variant="ghost" onPress={handleStop} />
        </View>
        {statusMessage ? <Text style={styles.status}>{statusMessage}</Text> : null}
      </Card>

      <Card>
        <Card.Title>Rendered Payload</Card.Title>
        <Text style={styles.codeBlock}>{renderedPayload || 'Render a payload to inspect the semantic snapshot.'}</Text>
      </Card>

      <Card>
        <Card.Title>Real Notification Test</Card.Title>
        <Card.Text>
          Send a real high-priority notification whose `data.voltraOngoingNotification` contains this envelope. The
          example&apos;s registered background task will parse it and upsert the ongoing notification.
        </Card.Text>
        <Card.Text>Use `operation: "stop"` with the same `notificationId` to stop it remotely.</Card.Text>
        <Text style={styles.codeBlock}>{sampleExpoPushRequest}</Text>
      </Card>
    </ScreenLayout>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 },
  column: { marginBottom: 16, gap: 10 },
  label: { color: '#FFFFFF', fontSize: 16, flexShrink: 0 },
  input: {
    flex: 1,
    minWidth: 140,
    backgroundColor: 'rgba(255,255,255,0.08)',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    textAlign: 'right',
  },
  multilineInput: {
    minHeight: 96,
    textAlign: 'left',
    textAlignVertical: 'top',
  },
  toggleGroup: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' },
  buttonRow: { marginTop: 16 },
  smButton: { paddingVertical: 8, paddingHorizontal: 16 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '600',
  },
  badgeActive: { backgroundColor: 'rgba(34, 197, 94, 0.18)', color: '#86EFAC' },
  badgeIdle: { backgroundColor: 'rgba(148, 163, 184, 0.15)', color: '#CBD5F5' },
  buttonGrid: { gap: 12 },
  status: { marginTop: 16, color: '#A78BFA', fontSize: 13, lineHeight: 18 },
  codeBlock: {
    marginTop: 12,
    color: '#E2E8F0',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 12,
    padding: 14,
    fontFamily: 'Menlo',
    fontSize: 12,
    lineHeight: 18,
  },
})
