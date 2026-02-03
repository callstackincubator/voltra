import React from 'react'
import { Voltra } from 'voltra'

type WorkoutLiveActivityUIProps = {
  heartRate: number
  distance: string
  pace: string
  startTime: number
}

export function WorkoutLiveActivityUI({ heartRate, distance, pace, startTime }: WorkoutLiveActivityUIProps) {
  // Heart rate zones: Fat Burn (60-70%), Cardio (70-80%), Peak (80-90%), Red Line (90%+)
  // Assuming max HR of 190 for calculation
  const maxHeartRate = 190
  const zones = [
    { min: 0, max: 0.6 * maxHeartRate, label: 'Warm Up', color: '#38BDF8' }, // Sky blue
    { min: 0.6 * maxHeartRate, max: 0.7 * maxHeartRate, label: 'Fat Burn', color: '#10B981' }, // Green
    { min: 0.7 * maxHeartRate, max: 0.8 * maxHeartRate, label: 'Cardio', color: '#F59E0B' }, // Yellow
    { min: 0.8 * maxHeartRate, max: 0.9 * maxHeartRate, label: 'Peak', color: '#F97316' }, // Orange
    { min: 0.9 * maxHeartRate, max: maxHeartRate, label: 'Red Line', color: '#EF4444' }, // Red
  ]

  const currentZoneIndex = zones.findIndex((zone) => heartRate >= zone.min && heartRate < zone.max)

  // Calculate the circle position in pixels based on heart rate within zones
  // Each zone has equal visual width
  const getCirclePosition = () => {
    const numZones = zones.length
    const spacing = 4 // HStack spacing between pills
    const circleWidth = 16
    // Live Activity expanded width is ~360px, minus 16px padding on each side
    const totalBarWidth = 360 - 32
    const totalSpacing = (numZones - 1) * spacing // 4 gaps between 5 pills
    const pillWidth = (totalBarWidth - totalSpacing) / numZones

    if (currentZoneIndex === -1) {
      // HR is outside defined zones
      if (heartRate < zones[0].min) return -circleWidth / 2
      return totalBarWidth - circleWidth / 2
    }

    const currentZone = zones[currentZoneIndex]
    const zoneRange = currentZone.max - currentZone.min
    const heartRateInZone = heartRate - currentZone.min
    const zoneProgress = zoneRange > 0 ? heartRateInZone / zoneRange : 0

    // Calculate position: zone start + progress within pill - half circle width to center
    const zoneStartPosition = currentZoneIndex * (pillWidth + spacing)
    const positionInPill = zoneProgress * pillWidth

    return zoneStartPosition + positionInPill - circleWidth / 2
  }

  // Calculate gradient colors and locations based on circle position
  // Each zone gets equal width (1/5), colors transition at zone boundaries (between pills)
  const getGradientColorsAndLocations = () => {
    const grayColor = '#94A3B8'
    const numZones = zones.length
    const zoneWidth = 1 / numZones // 0.2 for 5 zones

    // Find which zone the HR is in
    let activeZoneIndex = zones.findIndex((zone) => heartRate >= zone.min && heartRate < zone.max)
    if (activeZoneIndex === -1 && heartRate >= zones[zones.length - 1].max) {
      activeZoneIndex = zones.length // Past all zones - all colored
    }

    // Calculate HR position within the gradient (0-1)
    // Each zone has equal visual width regardless of actual HR range
    let hrGradientPosition = 0
    if (activeZoneIndex >= 0 && activeZoneIndex < zones.length) {
      const zone = zones[activeZoneIndex]
      const progressInZone = (heartRate - zone.min) / (zone.max - zone.min)
      hrGradientPosition = (activeZoneIndex + progressInZone) * zoneWidth
    } else if (activeZoneIndex >= zones.length) {
      hrGradientPosition = 1
    }

    const colors: string[] = []
    const locations: number[] = []

    // Build gradient with solid colors per zone, transitions at boundaries
    for (let i = 0; i < numZones; i++) {
      const zoneStart = i * zoneWidth
      const zoneEnd = (i + 1) * zoneWidth
      const zoneColor = zones[i].color

      const isFullyActive = zoneEnd <= hrGradientPosition
      const containsHR = zoneStart < hrGradientPosition && hrGradientPosition < zoneEnd
      const isFullyInactive = zoneStart >= hrGradientPosition

      if (isFullyActive) {
        // Entire zone is active - solid zone color
        colors.push(zoneColor)
        locations.push(zoneStart)
        colors.push(zoneColor)
        locations.push(zoneEnd)
      } else if (containsHR) {
        // Zone contains the HR position - split between color and gray
        colors.push(zoneColor)
        locations.push(zoneStart)
        colors.push(zoneColor)
        locations.push(hrGradientPosition)
        colors.push(grayColor)
        locations.push(hrGradientPosition)
        colors.push(grayColor)
        locations.push(zoneEnd)
      } else if (isFullyInactive) {
        // Zone is after HR - solid gray
        colors.push(grayColor)
        locations.push(zoneStart)
        colors.push(grayColor)
        locations.push(zoneEnd)
      }
    }

    return {
      colors: colors as [string, string, ...string[]],
      locations,
    }
  }

  const { colors: gradientColors, locations: gradientLocations } = getGradientColorsAndLocations()

  return (
    <Voltra.LinearGradient
      colors={['#0F172A', '#1E293B', '#0F172A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.1)',
      }}
    >
      <Voltra.VStack id="workout-live-activity" spacing={12} style={{ padding: 16 }}>
        {/* Top Section - Heart Rate and Timer */}
        <Voltra.HStack style={{ marginBottom: 0 }} spacing={12}>
          <Voltra.VStack>
            <Voltra.HStack spacing={4}>
              <Voltra.Symbol name="timer" tintColor="#10B981" size={24} />
              <Voltra.Timer
                style={{
                  color: '#10B981',
                  fontSize: 28,
                  fontWeight: '700',
                  fontVariant: ['tabular-nums'],
                }}
                textStyle="timer"
                startAtMs={startTime}
                durationMs={3153600000000}
                direction="up"
              />
            </Voltra.HStack>
          </Voltra.VStack>

          <Voltra.Spacer />

          <Voltra.VStack alignment="trailing">
            <Voltra.HStack spacing={4}>
              <Voltra.Symbol name="heart.fill" tintColor="#EF4444" size={24} />
              <Voltra.Text
                style={{
                  color: '#EF4444',
                  fontSize: 28,
                  fontWeight: '700',
                  fontVariant: ['tabular-nums'],
                }}
              >
                {heartRate.toString()}
              </Voltra.Text>
            </Voltra.HStack>
          </Voltra.VStack>
        </Voltra.HStack>

        {/* Heart Rate Zones Progress Bar */}
        <Voltra.ZStack alignment="topLeading">
          <Voltra.VStack spacing={4}>
            <Voltra.Mask
              maskElement={
                <Voltra.HStack spacing={4}>
                  {zones.map((zone, index) => (
                    <Voltra.VStack
                      key={index}
                      style={{
                        flex: 1,
                        borderRadius: 8,
                        height: 8,
                        backgroundColor: '#FFFFFF',
                      }}
                    />
                  ))}
                </Voltra.HStack>
              }
            >
              <Voltra.LinearGradient
                colors={gradientColors}
                locations={gradientLocations}
                start="leading"
                end="trailing"
                style={{ borderRadius: 8, height: 8 }}
              />
            </Voltra.Mask>
            <Voltra.HStack spacing={4}>
              {zones.map((zone, index) => (
                <Voltra.VStack key={index} alignment="center" spacing={0} style={{ flex: 1 }}>
                  <Voltra.Text
                    style={{
                      color: '#94A3B8',
                      fontSize: 10,
                      fontWeight: '500',
                      flex: 1,
                    }}
                  >
                    {zone.label}
                  </Voltra.Text>
                </Voltra.VStack>
              ))}
            </Voltra.HStack>
          </Voltra.VStack>

          <Voltra.VStack
            style={{
              top: 3,
              left: getCirclePosition() + 16,
              width: 16,
              height: 16,
              backgroundColor: '#FFFFFF',
              borderColor: '#1E293B',
              borderWidth: 3,
              borderRadius: 16,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
            }}
          />
        </Voltra.ZStack>

        {/* Bottom Section - Three Columns */}
        <Voltra.HStack spacing={0}>
          <Voltra.VStack style={{ flex: 1 }} alignment="center" spacing={0}>
            <Voltra.Text
              style={{
                color: '#F0F9FF',
                fontSize: 24,
                fontWeight: '700',
                fontVariant: ['tabular-nums'],
              }}
            >
              {distance}
            </Voltra.Text>
            <Voltra.Text
              style={{
                color: '#94A3B8',
                fontSize: 12,
                fontWeight: '500',
                marginTop: 2,
              }}
            >
              DISTANCE
            </Voltra.Text>
          </Voltra.VStack>

          <Voltra.VStack style={{ width: 1, backgroundColor: 'white', height: 32 }} />

          <Voltra.VStack style={{ flex: 1 }} alignment="center" spacing={0}>
            <Voltra.Text
              style={{
                color: '#F0F9FF',
                fontSize: 18,
                fontWeight: '600',
              }}
            >
              FITNESS
            </Voltra.Text>
          </Voltra.VStack>

          <Voltra.VStack style={{ width: 1, backgroundColor: 'white', height: 32 }} />

          <Voltra.VStack style={{ flex: 1 }} alignment="center" spacing={0}>
            <Voltra.Text
              style={{
                color: '#F0F9FF',
                fontSize: 24,
                fontWeight: '700',
                fontVariant: ['tabular-nums'],
              }}
            >
              {pace}
            </Voltra.Text>
            <Voltra.Text
              style={{
                color: '#94A3B8',
                fontSize: 12,
                fontWeight: '500',
                marginTop: 2,
              }}
            >
              PACE
            </Voltra.Text>
          </Voltra.VStack>
        </Voltra.HStack>
      </Voltra.VStack>
    </Voltra.LinearGradient>
  )
}
