import { VoltraAndroid } from '@use-voltra/android'

type Gauge = {
  label: string
  value: number
  color: string
}

const GAUGES: Gauge[] = [
  { label: 'Steps', value: 0.82, color: '#22C55E' },
  { label: 'Move', value: 0.64, color: '#38BDF8' },
  { label: 'Sleep', value: 0.45, color: '#A78BFA' },
  { label: 'Water', value: 0.3, color: '#FBBF24' },
]

const TRACK_COLOR = '#1F2937'

const SmallGauge = ({ label, value, color }: Gauge) => {
  return (
    <VoltraAndroid.Column style={{ flex: 1 }} horizontalAlignment="center-horizontally">
      <VoltraAndroid.ArcProgressIndicator
        progress={value}
        color={color}
        trackColor={TRACK_COLOR}
        strokeWidth={6}
        style={{ width: 54, height: 54 }}
      >
        <VoltraAndroid.Text style={{ fontSize: 12, fontWeight: '700', color: '#F8FAFC' }}>
          {`${Math.round(value * 100)}`}
        </VoltraAndroid.Text>
      </VoltraAndroid.ArcProgressIndicator>
      <VoltraAndroid.Spacer style={{ height: 6 }} />
      <VoltraAndroid.Text style={{ fontSize: 11, color: '#94A3B8' }}>{label}</VoltraAndroid.Text>
    </VoltraAndroid.Column>
  )
}

export const AndroidArcProgressWidget = ({ battery = 0.75 }: { battery?: number }) => {
  return (
    <VoltraAndroid.Box
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#0F172A',
        borderRadius: 28,
        padding: 16,
      }}
    >
      <VoltraAndroid.Column style={{ width: '100%', height: '100%' }} horizontalAlignment="center-horizontally">
        <VoltraAndroid.ArcProgressIndicator
          progress={battery}
          color="#22C55E"
          trackColor={TRACK_COLOR}
          strokeWidth={14}
          style={{ width: 132, height: 132 }}
        >
          <VoltraAndroid.Column horizontalAlignment="center-horizontally">
            <VoltraAndroid.Text style={{ fontSize: 30, fontWeight: '700', color: '#F8FAFC' }}>
              {`${Math.round(battery * 100)}%`}
            </VoltraAndroid.Text>
            <VoltraAndroid.Text style={{ fontSize: 11, color: '#94A3B8' }}>Battery</VoltraAndroid.Text>
          </VoltraAndroid.Column>
        </VoltraAndroid.ArcProgressIndicator>

        <VoltraAndroid.Spacer style={{ height: 16 }} />

        <VoltraAndroid.Row style={{ width: '100%' }}>
          {GAUGES.map((gauge) => (
            <SmallGauge key={gauge.label} {...gauge} />
          ))}
        </VoltraAndroid.Row>
      </VoltraAndroid.Column>
    </VoltraAndroid.Box>
  )
}
