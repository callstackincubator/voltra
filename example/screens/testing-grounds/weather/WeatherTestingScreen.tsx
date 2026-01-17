import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Voltra } from 'voltra'
import { reloadWidgets, scheduleWidget, updateWidget, VoltraWidgetPreview, WidgetFamily } from 'voltra/client'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'
import { SAMPLE_WEATHER_DATA, type WeatherCondition, type WeatherData } from '~/widgets/weather-types'
import { WeatherWidget } from '~/widgets/WeatherWidget'

const WIDGET_FAMILIES: { id: WidgetFamily; title: string; description: string }[] = [
  {
    id: 'systemSmall',
    title: 'System Small',
    description: '2x2 grid widget (170x170pt)',
  },
  {
    id: 'systemMedium',
    title: 'System Medium',
    description: '4x2 grid widget (364x170pt)',
  },
  {
    id: 'systemLarge',
    title: 'System Large',
    description: '4x4 grid widget (364x382pt)',
  },
  {
    id: 'systemExtraLarge',
    title: 'System Extra Large',
    description: '4x8 grid widget (364x768pt)',
  },
  {
    id: 'accessoryCircular',
    title: 'Accessory Circular',
    description: 'Circular widget (76x76pt)',
  },
  {
    id: 'accessoryRectangular',
    title: 'Accessory Rectangular',
    description: 'Rectangular widget (172x76pt)',
  },
  {
    id: 'accessoryInline',
    title: 'Accessory Inline',
    description: 'Inline widget (172x40pt)',
  },
]

const WEATHER_CONDITIONS: { id: WeatherCondition; label: string; emoji: string }[] = [
  { id: 'sunny', label: 'Sunny', emoji: '☀️' },
  { id: 'cloudy', label: 'Cloudy', emoji: '☁️' },
  { id: 'rainy', label: 'Rainy', emoji: '🌧️' },
]

export default function WeatherTestingScreen() {
  const insets = useSafeAreaInsets()
  const colorScheme = useColorScheme()
  const router = useRouter()
  const [selectedWeather, setSelectedWeather] = useState<WeatherCondition>('sunny')
  const [selectedFamily, setSelectedFamily] = useState<WidgetFamily>('systemMedium')
  const [currentWeather, setCurrentWeather] = useState<WeatherData>(SAMPLE_WEATHER_DATA.sunny)
  const [isUpdating, setIsUpdating] = useState(false)

  const widgetPreviewStyle = {
    borderRadius: 16,
    backgroundColor: colorScheme === 'light' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.8)',
  }

  const handleWeatherChange = async (condition: WeatherCondition) => {
    setSelectedWeather(condition)
    const weatherData = SAMPLE_WEATHER_DATA[condition]
    setCurrentWeather(weatherData)

    setIsUpdating(true)
    try {
      await updateWidget('weather', {
        systemSmall: <WeatherWidget weather={weatherData} />,
        systemMedium: <WeatherWidget weather={weatherData} />,
        systemLarge: <WeatherWidget weather={weatherData} />,
      })
      await reloadWidgets(['weather'])
    } catch (error) {
      console.error('Failed to update weather widget:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRandomWeather = async () => {
    const randomIndex = Math.floor(Math.random() * WEATHER_CONDITIONS.length)
    const randomCondition = WEATHER_CONDITIONS[randomIndex].id
    await handleWeatherChange(randomCondition)
  }

  const handleCustomWeather = async () => {
    const customWeather: WeatherData = {
      condition: 'sunny',
      temperature: Math.floor(Math.random() * 40) + 50, // 50-90°F
      highTemp: Math.floor(Math.random() * 20) + 75, // 75-95°F
      lowTemp: Math.floor(Math.random() * 20) + 55, // 55-75°F
      location: 'Custom Location',
      description: 'Custom Weather',
      lastUpdated: new Date(),
    }

    setCurrentWeather(customWeather)
    setIsUpdating(true)
    try {
      await updateWidget('weather', {
        systemSmall: <WeatherWidget weather={customWeather} />,
        systemMedium: <WeatherWidget weather={customWeather} />,
        systemLarge: <WeatherWidget weather={customWeather} />,
      })
      await reloadWidgets(['weather'])
    } catch (error) {
      console.error('Failed to update custom weather widget:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleScheduleForecast = async () => {
    setIsUpdating(true)
    try {
      const now = new Date()

      // Use 1-minute intervals for testing (iOS recommends 5+ minutes in production)
      // First entry starts 5 seconds in the future to ensure all dates are in the future
      const entries = [
        {
          date: new Date(now.getTime() + 5 * 1000), // Entry 1: 5 seconds from now
          variants: {
            systemSmall: (
              <Voltra.ZStack style={{ flex: 1, backgroundColor: '#1a1a2e' }}>
                <Voltra.Text style={{ fontSize: 48, fontWeight: '700', color: '#FFFFFF' }}>1</Voltra.Text>
              </Voltra.ZStack>
            ),
            systemMedium: (
              <Voltra.ZStack style={{ flex: 1, backgroundColor: '#1a1a2e' }}>
                <Voltra.Text style={{ fontSize: 64, fontWeight: '700', color: '#FFFFFF' }}>1</Voltra.Text>
              </Voltra.ZStack>
            ),
            systemLarge: (
              <Voltra.ZStack style={{ flex: 1, backgroundColor: '#1a1a2e' }}>
                <Voltra.Text style={{ fontSize: 80, fontWeight: '700', color: '#FFFFFF' }}>1</Voltra.Text>
              </Voltra.ZStack>
            ),
          },
        },
        {
          date: new Date(now.getTime() + 1 * 60 * 1000), // Entry 2: 1 minute
          variants: {
            systemSmall: (
              <Voltra.ZStack style={{ flex: 1, backgroundColor: '#16213e' }}>
                <Voltra.Text style={{ fontSize: 48, fontWeight: '700', color: '#00FF00' }}>2</Voltra.Text>
              </Voltra.ZStack>
            ),
            systemMedium: (
              <Voltra.ZStack style={{ flex: 1, backgroundColor: '#16213e' }}>
                <Voltra.Text style={{ fontSize: 64, fontWeight: '700', color: '#00FF00' }}>2</Voltra.Text>
              </Voltra.ZStack>
            ),
            systemLarge: (
              <Voltra.ZStack style={{ flex: 1, backgroundColor: '#16213e' }}>
                <Voltra.Text style={{ fontSize: 80, fontWeight: '700', color: '#00FF00' }}>2</Voltra.Text>
              </Voltra.ZStack>
            ),
          },
        },
        {
          date: new Date(now.getTime() + 2 * 60 * 1000), // Entry 3: 2 minutes
          variants: {
            systemSmall: (
              <Voltra.ZStack style={{ flex: 1, backgroundColor: '#0f3460' }}>
                <Voltra.Text style={{ fontSize: 48, fontWeight: '700', color: '#FF00FF' }}>3</Voltra.Text>
              </Voltra.ZStack>
            ),
            systemMedium: (
              <Voltra.ZStack style={{ flex: 1, backgroundColor: '#0f3460' }}>
                <Voltra.Text style={{ fontSize: 64, fontWeight: '700', color: '#FF00FF' }}>3</Voltra.Text>
              </Voltra.ZStack>
            ),
            systemLarge: (
              <Voltra.ZStack style={{ flex: 1, backgroundColor: '#0f3460' }}>
                <Voltra.Text style={{ fontSize: 80, fontWeight: '700', color: '#FF00FF' }}>3</Voltra.Text>
              </Voltra.ZStack>
            ),
          },
        },
        {
          date: new Date(now.getTime() + 3 * 60 * 1000), // Entry 4: 3 minutes
          variants: {
            systemSmall: (
              <Voltra.ZStack style={{ flex: 1, backgroundColor: '#e94560' }}>
                <Voltra.Text style={{ fontSize: 48, fontWeight: '700', color: '#FFFF00' }}>4</Voltra.Text>
              </Voltra.ZStack>
            ),
            systemMedium: (
              <Voltra.ZStack style={{ flex: 1, backgroundColor: '#e94560' }}>
                <Voltra.Text style={{ fontSize: 64, fontWeight: '700', color: '#FFFF00' }}>4</Voltra.Text>
              </Voltra.ZStack>
            ),
            systemLarge: (
              <Voltra.ZStack style={{ flex: 1, backgroundColor: '#e94560' }}>
                <Voltra.Text style={{ fontSize: 80, fontWeight: '700', color: '#FFFF00' }}>4</Voltra.Text>
              </Voltra.ZStack>
            ),
          },
        },
      ]

      await scheduleWidget('weather', entries)

      // Show detailed alert with scheduled times
      const formatter = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
      const times = entries.map((e, i) => `${i + 1}: ${formatter.format(e.date)}`).join('\n')
      Alert.alert('Timeline Scheduled', `Entries:\n${times}\n\nWatch the widget change!`)
    } catch (error) {
      console.error('Failed to schedule weather forecast:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  useEffect(() => {
    // Initialize with sunny weather
    // Note: This calls updateWidget but NOT reloadWidgets to avoid
    // interfering with any scheduled timeline
    const initWeather = async () => {
      setSelectedWeather('sunny')
      const weatherData = SAMPLE_WEATHER_DATA['sunny']
      setCurrentWeather(weatherData)

      try {
        await updateWidget('weather', {
          systemSmall: <WeatherWidget weather={weatherData} />,
          systemMedium: <WeatherWidget weather={weatherData} />,
          systemLarge: <WeatherWidget weather={weatherData} />,
        })
        // Don't call reloadWidgets here to avoid resetting scheduled timelines
      } catch (error) {
        console.error('Failed to update weather widget:', error)
      }
    }
    initWeather()
  }, [])

  return (
    <View style={styles.container}>
      <ScrollView
        style={[styles.scrollView]}
        contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      >
        <Text style={styles.heading}>Weather Widget Testing</Text>
        <Text style={styles.subheading}>
          Test the weather widget with different conditions and widget sizes. Choose from Sunny, Cloudy, or Rainy
          weather with beautiful gradient backgrounds.
        </Text>

        {/* Current Weather Display */}
        <Card>
          <Card.Title>Current Weather: {WEATHER_CONDITIONS.find((c) => c.id === selectedWeather)?.label}</Card.Title>
          <Card.Text>
            Temperature: {currentWeather.temperature}°F
            {currentWeather.highTemp && currentWeather.lowTemp ? (
              <>
                {' '}
                • High: {currentWeather.highTemp}° • Low: {currentWeather.lowTemp}°
              </>
            ) : null}
            {currentWeather.location ? <> • {currentWeather.location}</> : null}
          </Card.Text>
        </Card>

        {/* Widget Family Selection */}
        <Card>
          <Card.Title>Widget Family: {WIDGET_FAMILIES.find((f) => f.id === selectedFamily)?.title}</Card.Title>
          <Card.Text>{WIDGET_FAMILIES.find((f) => f.id === selectedFamily)?.description}</Card.Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.familyScroll}>
            <View style={styles.familyButtons}>
              {WIDGET_FAMILIES.map((family) => (
                <Button
                  key={family.id}
                  title={family.title}
                  variant={selectedFamily === family.id ? 'primary' : 'secondary'}
                  onPress={() => setSelectedFamily(family.id)}
                  style={styles.familyButton}
                />
              ))}
            </View>
          </ScrollView>
        </Card>

        {/* Weather Condition Buttons */}
        <Card>
          <Card.Title>Weather Conditions</Card.Title>
          <Card.Text>Select a weather condition to update the widget:</Card.Text>
          <View style={styles.weatherButtons}>
            {WEATHER_CONDITIONS.map((condition) => (
              <Button
                key={condition.id}
                title={`${condition.emoji} ${condition.label}`}
                variant={selectedWeather === condition.id ? 'primary' : 'secondary'}
                onPress={() => handleWeatherChange(condition.id)}
                style={styles.weatherButton}
                disabled={isUpdating}
              />
            ))}
          </View>
        </Card>

        {/* Quick Actions */}
        <Card>
          <Card.Title>Quick Actions</Card.Title>
          <View style={styles.quickActions}>
            <Button title="🎲 Random Weather" variant="secondary" onPress={handleRandomWeather} disabled={isUpdating} />
            <Button title="🎨 Custom Weather" variant="secondary" onPress={handleCustomWeather} disabled={isUpdating} />
          </View>
        </Card>

        {/* Timeline Scheduling */}
        <Card>
          <Card.Title>📅 Timeline Scheduling </Card.Title>
          <Card.Text>
            Schedule multiple weather updates in advance. iOS will automatically display each forecast at the scheduled
            time, even when the app is closed.
          </Card.Text>
          <Button
            style={{ marginTop: 16 }}
            title="Schedule Timeline"
            variant="primary"
            onPress={handleScheduleForecast}
            disabled={isUpdating}
          />
          <Card.Text style={styles.timelineNote}>
            Schedules 4 entries: 1 (+5sec), 2 (+1min), 3 (+2min), 4 (+3min). Each has a different background color.
            Note: iOS may delay updates based on battery/visibility. Test with Xcode attached for immediate updates.
          </Card.Text>
        </Card>

        {/* Widget Preview */}
        <Card>
          <Card.Title>Widget Preview</Card.Title>
          <Card.Text>
            This shows how the weather widget will appear on your home screen. The widget updates in real-time when you
            change the weather condition above.
          </Card.Text>
          <View style={styles.previewContainer}>
            <VoltraWidgetPreview family={selectedFamily} style={widgetPreviewStyle}>
              <WeatherWidget weather={currentWeather} />
            </VoltraWidgetPreview>
          </View>
        </Card>

        {/* Instructions */}
        <Card>
          <Card.Title>How to Test</Card.Title>
          <Card.Text>
            1. Select a widget family (size) above{'\n'}
            2. Choose different weather conditions (Sunny, Cloudy, Rainy){'\n'}
            3. Notice how the gradient background changes{'\n'}
            4. Check your home screen to see the live widget update{'\n'}
            5. Try the random weather button for variety
          </Card.Text>
        </Card>

        {/* Back Button */}
        <View style={styles.footer}>
          <Button title="Back to Testing Grounds" variant="ghost" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subheading: {
    fontSize: 14,
    lineHeight: 20,
    color: '#CBD5F5',
    marginBottom: 24,
  },
  weatherButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  weatherButton: {
    minWidth: 120,
  },
  familyScroll: {
    marginHorizontal: -4,
  },
  familyButtons: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    gap: 8,
    marginTop: 16,
  },
  familyButton: {
    minWidth: 120,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  timelineNote: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 12,
    opacity: 0.8,
  },
  previewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginTop: 8,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
})
