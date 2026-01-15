import React, { useCallback, useEffect, useState } from 'react'
import { Linking, StyleSheet, Text, View } from 'react-native'
import { VoltraAndroid as AndroidVoltra } from 'voltra/android'
import { updateAndroidWidget } from 'voltra/android/client'

type Device = {
  id: string
  name: string
  iconUnicode: string
  isOn: boolean
}

export default function AndroidInteractiveWidgetScreen() {
  const [devices] = useState<Device[]>([
    { id: 'living_room', name: 'Living Room', iconUnicode: '💡', isOn: true },
    { id: 'nursery_tv', name: 'Nursery TV', iconUnicode: '📺', isOn: false },
    { id: 'hallway_lights', name: 'Hallway lights', iconUnicode: '💡', isOn: false },
    { id: 'front_drive', name: 'Front drive', iconUnicode: '🔷', isOn: false },
    { id: 'garage', name: 'Garage', iconUnicode: '📦', isOn: false },
    { id: 'bedroom', name: 'Bedroom', iconUnicode: '💡', isOn: false },
  ])

  const [lastUrl, setLastUrl] = useState<string>('')

  // Handle deep links when the app is opened from a widget
  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      console.log('[Deep Link Received]', event.url)
      setLastUrl(event.url)
    }

    // Check if the app was opened via a deep link initially
    Linking.getInitialURL().then((url) => {
      if (url) {
        setLastUrl(url)
      }
    })

    const subscription = Linking.addEventListener('url', handleUrl)
    return () => subscription.remove()
  }, [])

  const updateWidgetWithNewState = useCallback(async (devices: Device[]) => {
    const bgColor = '#e6f5e2' // Light green background
    const cardBgColor = '#d4e8cf' // White cards
    const activeCardBgColor = '#38693c' // Darker green for active devices
    const textColor = '#2b312a' // Black text
    const activeTextColor = '#f6f8f7' // White text for active devices
    const iconColor = '#9e9e9e' // Light gray for inactive icons
    const activeIconColor = '#c8e6c9' // Light green for active icons
    const headerIconColor = '#2e7d32' // Dark green for header icons

    // Helper to render device card
    const renderDeviceCard = (device: Device, isLast: boolean = false, isGrid: boolean = false) => {
      const isActive = device.isOn
      const gapPadding = isGrid ? 4 : 0 // Half of 8px gap for grid spacing
      const paddingBottom = (() => {
        if (isGrid) {
          return 4
        }

        return isLast ? 0 : 8
      })()
      return (
        <AndroidVoltra.Box
          key={device.id}
          style={{
            paddingBottom: paddingBottom,
            paddingRight: isGrid ? gapPadding : 0,
          }}
        >
          <AndroidVoltra.Box
            id={`device_${device.id}`}
            deepLinkUrl={`voltra://smart-home/device/${device.id}`}
            style={{
              backgroundColor: isActive ? activeCardBgColor : cardBgColor,
              borderRadius: 12,
              padding: 12,
              minHeight: 60,
              width: '100%',
              flex: 1,
            }}
          >
            <AndroidVoltra.Row
              style={{
                alignItems: 'center',
                flex: 1,
              }}
            >
              <AndroidVoltra.Text
                style={{
                  fontSize: 24,
                  color: isActive ? activeIconColor : iconColor,
                  paddingRight: 12,
                }}
              >
                {device.iconUnicode}
              </AndroidVoltra.Text>

              <AndroidVoltra.Column style={{ flex: 1 }}>
                <AndroidVoltra.Text
                  style={{
                    color: isActive ? activeTextColor : textColor,
                    fontSize: 14,
                    fontWeight: '500',
                  }}
                >
                  {device.name}
                </AndroidVoltra.Text>
                <AndroidVoltra.Text
                  style={{
                    color: isActive ? activeTextColor : textColor,
                    fontSize: 12,
                    opacity: 0.7,
                  }}
                >
                  {isActive ? 'On' : 'Off'}
                </AndroidVoltra.Text>
              </AndroidVoltra.Column>
            </AndroidVoltra.Row>
          </AndroidVoltra.Box>
        </AndroidVoltra.Box>
      )
    }

    await updateAndroidWidget('interactive_todos', [
      // Narrow layout - single column
      {
        size: { width: 150, height: 300 },
        content: (
          <AndroidVoltra.Scaffold
            backgroundColor={bgColor}
            style={{
              flex: 1,
              width: '100%',
              height: '100%',
            }}
          >
            <AndroidVoltra.TitleBar
              title="House"
              startIcon={{ assetName: 'ic_menu_home' }}
              textColor={textColor}
              iconColor={headerIconColor}
            />
            <AndroidVoltra.LazyColumn
              style={{
                paddingHorizontal: 4,
                paddingBottom: 4,
                flex: 1,
                width: '100%',
              }}
            >
              {devices.map((device, index) => renderDeviceCard(device, index === devices.length - 1))}
            </AndroidVoltra.LazyColumn>
          </AndroidVoltra.Scaffold>
        ),
      },
      // Medium layout - single column (wider)
      {
        size: { width: 250, height: 300 },
        content: (
          <AndroidVoltra.Scaffold
            backgroundColor={bgColor}
            style={{
              flex: 1,
              width: '100%',
              height: '100%',
            }}
          >
            <AndroidVoltra.TitleBar
              title="House"
              startIcon={{ assetName: 'ic_menu_home' }}
              textColor={textColor}
              iconColor={headerIconColor}
            />

            <AndroidVoltra.LazyColumn
              style={{
                paddingHorizontal: 4,
                paddingBottom: 4,
                gap: 8,
                flex: 1,
                width: '100%',
              }}
            >
              {devices.map((device) => renderDeviceCard(device))}
            </AndroidVoltra.LazyColumn>
          </AndroidVoltra.Scaffold>
        ),
      },
      // Wide layout - two-column grid
      {
        size: { width: 350, height: 250 },
        content: (
          <AndroidVoltra.Scaffold
            backgroundColor={bgColor}
            style={{
              flex: 1,
              width: '100%',
              height: '100%',
            }}
          >
            <AndroidVoltra.TitleBar
              title="House"
              startIcon={{ assetName: 'ic_menu_home' }}
              textColor={textColor}
              iconColor={headerIconColor}
            />
            <AndroidVoltra.LazyVerticalGrid
              columns={2}
              style={{
                paddingHorizontal: 4,
                paddingBottom: 4,
                flex: 1,
                width: '100%',
                height: '100%',
              }}
            >
              {devices.map((device) => renderDeviceCard(device, false, true))}
            </AndroidVoltra.LazyVerticalGrid>
          </AndroidVoltra.Scaffold>
        ),
      },
    ]).catch(console.error)
  }, [])

  // Initial widget update
  useEffect(() => {
    updateWidgetWithNewState(devices)
  }, [devices, updateWidgetWithNewState])

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Smart Home Control Panel</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Widget Configuration</Text>
        <Text style={styles.text}>Widget ID: interactive_todos</Text>
        <Text style={styles.text}>Devices: {devices.length}</Text>
        <Text style={styles.text}>Active: {devices.filter((d) => d.isOn).length}</Text>
      </View>

      {lastUrl ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Last Deep Link</Text>
          <Text style={styles.text}>{lastUrl}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Devices</Text>
        {devices.map((device) => (
          <Text key={device.id} style={styles.text}>
            {device.isOn ? '✓' : '○'} {device.iconUnicode} {device.name} - {device.isOn ? 'On' : 'Off'}
          </Text>
        ))}
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>Instructions:</Text>
        <Text style={styles.instructionsText}>
          1. Add the &ldquo;interactive_todos&rdquo; widget to your home screen
        </Text>
        <Text style={styles.instructionsText}>2. Tap device cards to open the app via deep link</Text>
        <Text style={styles.instructionsText}>3. Observe the &ldquo;Last Deep Link&rdquo; section above</Text>
        <Text style={styles.instructionsText}>4. Widget adapts to different sizes (narrow, medium, wide)</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  text: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  instructions: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1976d2',
  },
  instructionsText: {
    fontSize: 14,
    color: '#1565c0',
    marginBottom: 4,
  },
})
