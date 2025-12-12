import { Link } from 'expo-router'
import React, { useCallback, useMemo, useRef, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { endAllLiveActivities } from 'voltra'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'
import { NotificationsCard } from '~/components/NotificationsCard'
import BasicLiveActivity from '~/screens/live-activities/BasicLiveActivity'
import CompassLiveActivity from '~/screens/live-activities/CompassLiveActivity'
import FlightLiveActivity from '~/screens/live-activities/FlightLiveActivity'
import LiquidGlassLiveActivity from '~/screens/live-activities/LiquidGlassLiveActivity'
import MusicPlayerLiveActivity from '~/screens/live-activities/MusicPlayerLiveActivity'
import WorkoutLiveActivity from '~/screens/live-activities/WorkoutLiveActivity'

import { LiveActivityExampleComponentRef } from './types'

type ActivityKey = 'basic' | 'stylesheet' | 'glass' | 'flight' | 'workout' | 'compass'

const ACTIVITY_METADATA: Record<ActivityKey, { title: string; description: string }> = {
  basic: {
    title: 'Basic live activity',
    description: 'Inline JSX styles with core stacks, labels, and buttons.',
  },
  stylesheet: {
    title: 'Music Player',
    description: 'Provides info about current song and allows interaction with playback controls.',
  },
  glass: {
    title: 'Liquid Glass',
    description: 'GlassContainer + VStack with glassEffect style property.',
  },
  flight: {
    title: 'Flight Tracker',
    description: 'Flight information widget with departure/arrival times, gate info, and status updates.',
  },
  workout: {
    title: 'Workout Tracker',
    description: 'Fitness tracking widget with heart rate zones, timer, distance, and pace metrics.',
  },
  compass: {
    title: 'Compass',
    description: 'Real-time compass using magnetometer with rotating arrow indicator.',
  },
}

const CARD_ORDER: ActivityKey[] = ['basic', 'stylesheet', 'glass', 'flight', 'workout', 'compass']

export default function LiveActivitiesScreen() {
  const insets = useSafeAreaInsets()

  const [activeMap, setActiveMap] = useState<Record<ActivityKey, boolean>>({
    basic: false,
    stylesheet: false,
    glass: false,
    flight: false,
    workout: false,
    compass: false,
  })

  const basicRef = useRef<LiveActivityExampleComponentRef>(null)
  const stylesheetRef = useRef<LiveActivityExampleComponentRef>(null)
  const glassRef = useRef<LiveActivityExampleComponentRef>(null)
  const flightRef = useRef<LiveActivityExampleComponentRef>(null)
  const workoutRef = useRef<LiveActivityExampleComponentRef>(null)
  const compassRef = useRef<LiveActivityExampleComponentRef>(null)

  const activityRefs = useMemo(
    () => ({
      basic: basicRef,
      stylesheet: stylesheetRef,
      glass: glassRef,
      flight: flightRef,
      workout: workoutRef,
      compass: compassRef,
    }),
    []
  )

  const handleStatusChange = useCallback((key: ActivityKey, isActive: boolean) => {
    setActiveMap((prev) => {
      if (prev[key] === isActive) return prev
      return { ...prev, [key]: isActive }
    })
  }, [])

  const handleBasicStatusChange = useCallback(
    (isActive: boolean) => handleStatusChange('basic', isActive),
    [handleStatusChange]
  )
  const handleStylesheetStatusChange = useCallback(
    (isActive: boolean) => handleStatusChange('stylesheet', isActive),
    [handleStatusChange]
  )
  const handleGlassStatusChange = useCallback(
    (isActive: boolean) => handleStatusChange('glass', isActive),
    [handleStatusChange]
  )
  const handleFlightStatusChange = useCallback(
    (isActive: boolean) => handleStatusChange('flight', isActive),
    [handleStatusChange]
  )
  const handleWorkoutStatusChange = useCallback(
    (isActive: boolean) => handleStatusChange('workout', isActive),
    [handleStatusChange]
  )
  const handleCompassStatusChange = useCallback(
    (isActive: boolean) => handleStatusChange('compass', isActive),
    [handleStatusChange]
  )

  const handleStart = async (key: ActivityKey) => {
    await activityRefs[key].current?.start?.().catch(console.error)
  }

  const handleEnd = async (key: ActivityKey) => {
    await activityRefs[key].current?.end?.()
  }

  const handleUpdate = async (key: ActivityKey) => {
    await activityRefs[key].current?.update?.()
  }

  const handleEndAll = async () => {
    await endAllLiveActivities()
  }

  const renderCard = (key: ActivityKey) => {
    const { title, description } = ACTIVITY_METADATA[key]
    const isActive = activeMap[key]

    return (
      <Card key={key}>
        <View style={styles.cardHeader}>
          <Card.Title>{title}</Card.Title>
          <Text style={[styles.statusPill, isActive ? styles.statusActive : styles.statusIdle]}>
            {isActive ? 'Active' : 'Idle'}
          </Text>
        </View>
        <Card.Text>{description}</Card.Text>
        <View style={styles.buttonRow}>
          <Button
            title={isActive ? 'End live activity' : 'Start live activity'}
            variant={isActive ? 'secondary' : 'primary'}
            onPress={() => (isActive ? handleEnd(key) : handleStart(key))}
          />

          <Button title="Update" variant="ghost" disabled={!isActive} onPress={() => handleUpdate(key)} />
        </View>
      </Card>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={[styles.scrollView]}
        contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      >
        <Text style={styles.heading}>Voltra</Text>
        <Text style={styles.subheading}>
          Voltra is a library that lets you build custom Live Activities and Dynamic Island layouts using React Native -
          no need to open Xcode anymore.
        </Text>

        <View style={styles.navigationButtons}>
          <Link href="/testing-grounds" asChild>
            <Button title="Testing Grounds" variant="secondary" />
          </Link>
        </View>

        <NotificationsCard />

        {CARD_ORDER.map(renderCard)}

        <Button
          title="End all live activities"
          variant="secondary"
          onPress={handleEndAll}
          style={styles.endAllButton}
        />

        <BasicLiveActivity ref={basicRef} onIsActiveChange={handleBasicStatusChange} />
        <MusicPlayerLiveActivity ref={stylesheetRef} onIsActiveChange={handleStylesheetStatusChange} />
        <LiquidGlassLiveActivity ref={glassRef} onIsActiveChange={handleGlassStatusChange} />
        <FlightLiveActivity ref={flightRef} onIsActiveChange={handleFlightStatusChange} />
        <WorkoutLiveActivity ref={workoutRef} onIsActiveChange={handleWorkoutStatusChange} />
        <CompassLiveActivity ref={compassRef} onIsActiveChange={handleCompassStatusChange} />
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
  },
  subheading: {
    fontSize: 14,
    lineHeight: 20,
    color: '#CBD5F5',
    marginBottom: 8,
  },
  navigationButtons: {
    marginTop: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusPill: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '600',
  },
  statusActive: {
    backgroundColor: 'rgba(130, 50, 255, 0.2)',
    color: '#8232FF',
  },
  statusIdle: {
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    color: '#94A3B8',
  },
  buttonRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 12,
  },
  endAllButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(130, 50, 255, 0.4)',
    backgroundColor: 'rgba(130, 50, 255, 0.1)',
  },
  endAllButtonText: {
    color: '#8232FF',
  },
})
