import { VoltraAndroid } from 'voltra/android'

const { BarMark, LineMark, AreaMark, PointMark, RuleMark, SectorMark } = VoltraAndroid

// ── Bar Chart ────────────────────────────────────────────────────────────────

const barData = [
  { x: 'Mon', y: 3 },
  { x: 'Tue', y: 7 },
  { x: 'Wed', y: 5 },
  { x: 'Thu', y: 9 },
  { x: 'Fri', y: 4 },
  { x: 'Sat', y: 8 },
  { x: 'Sun', y: 6 },
]

export const BarChartWidget = () => (
  <VoltraAndroid.Box style={{ width: '100%', height: '100%', backgroundColor: '#1E293B', padding: 12 }}>
    <VoltraAndroid.Column style={{ width: '100%', height: '100%' }} verticalAlignment="top">
      <VoltraAndroid.Text style={{ fontSize: 14, fontWeight: '600', color: '#E2E8F0', marginBottom: 8 }}>
        Weekly Activity
      </VoltraAndroid.Text>
      <VoltraAndroid.Chart style={{ width: '100%', height: '100%' }}>
        <BarMark data={barData} color="#8B5CF6" cornerRadius={4} />
        <RuleMark yValue={6} color="#475569" lineWidth={1} />
      </VoltraAndroid.Chart>
    </VoltraAndroid.Column>
  </VoltraAndroid.Box>
)

// ── Line Chart ───────────────────────────────────────────────────────────────

const lineData1 = [
  { x: 'Jan', y: 30, series: 'Revenue' },
  { x: 'Feb', y: 45, series: 'Revenue' },
  { x: 'Mar', y: 38, series: 'Revenue' },
  { x: 'Apr', y: 52, series: 'Revenue' },
  { x: 'May', y: 61, series: 'Revenue' },
  { x: 'Jun', y: 55, series: 'Revenue' },
]

const lineData2 = [
  { x: 'Jan', y: 20, series: 'Expenses' },
  { x: 'Feb', y: 25, series: 'Expenses' },
  { x: 'Mar', y: 30, series: 'Expenses' },
  { x: 'Apr', y: 28, series: 'Expenses' },
  { x: 'May', y: 35, series: 'Expenses' },
  { x: 'Jun', y: 32, series: 'Expenses' },
]

export const LineChartWidget = () => (
  <VoltraAndroid.Box style={{ width: '100%', height: '100%', backgroundColor: '#1E293B', padding: 12 }}>
    <VoltraAndroid.Column style={{ width: '100%', height: '100%' }} verticalAlignment="top">
      <VoltraAndroid.Text style={{ fontSize: 14, fontWeight: '600', color: '#E2E8F0', marginBottom: 8 }}>
        Revenue vs Expenses
      </VoltraAndroid.Text>
      <VoltraAndroid.Chart
        style={{ width: 280, height: 160 }}
        foregroundStyleScale={{ Revenue: '#22D3EE', Expenses: '#F87171' }}
      >
        <LineMark data={[...lineData1, ...lineData2]} lineWidth={2} />
        <PointMark data={[...lineData1, ...lineData2]} symbolSize={6} />
      </VoltraAndroid.Chart>
    </VoltraAndroid.Column>
  </VoltraAndroid.Box>
)

// ── Area Chart ───────────────────────────────────────────────────────────────

const areaData = [
  { x: 'Q1', y: 40, series: 'Mobile' },
  { x: 'Q2', y: 55, series: 'Mobile' },
  { x: 'Q3', y: 65, series: 'Mobile' },
  { x: 'Q4', y: 80, series: 'Mobile' },
  { x: 'Q1', y: 25, series: 'Desktop' },
  { x: 'Q2', y: 35, series: 'Desktop' },
  { x: 'Q3', y: 30, series: 'Desktop' },
  { x: 'Q4', y: 45, series: 'Desktop' },
]

export const AreaChartWidget = () => (
  <VoltraAndroid.Box style={{ width: '100%', height: '100%', backgroundColor: '#1E293B', padding: 12 }}>
    <VoltraAndroid.Column style={{ width: '100%', height: '100%' }} verticalAlignment="top">
      <VoltraAndroid.Text style={{ fontSize: 14, fontWeight: '600', color: '#E2E8F0', marginBottom: 8 }}>
        Traffic by Platform
      </VoltraAndroid.Text>
      <VoltraAndroid.Chart
        style={{ width: 280, height: 160 }}
        foregroundStyleScale={{ Mobile: '#34D399', Desktop: '#A78BFA' }}
      >
        <AreaMark data={areaData} />
      </VoltraAndroid.Chart>
    </VoltraAndroid.Column>
  </VoltraAndroid.Box>
)

// ── Pie / Donut Chart ────────────────────────────────────────────────────────

const pieData = [
  { value: 35, category: 'React Native' },
  { value: 25, category: 'Flutter' },
  { value: 20, category: 'Swift' },
  { value: 15, category: 'Kotlin' },
  { value: 5, category: 'Other' },
]

export const PieChartWidget = () => (
  <VoltraAndroid.Box style={{ width: '100%', height: '100%', backgroundColor: '#1E293B', padding: 12 }}>
    <VoltraAndroid.Column
      style={{ width: '100%', height: '100%' }}
      verticalAlignment="center-vertically"
      horizontalAlignment="center-horizontally"
    >
      <VoltraAndroid.Text style={{ fontSize: 14, fontWeight: '600', color: '#E2E8F0', marginBottom: 8 }}>
        Framework Usage
      </VoltraAndroid.Text>
      <VoltraAndroid.Chart style={{ width: '100%', height: '100%' }}>
        <SectorMark data={pieData} innerRadius={40} outerRadius={90} angularInset={2} />
      </VoltraAndroid.Chart>
    </VoltraAndroid.Column>
  </VoltraAndroid.Box>
)
