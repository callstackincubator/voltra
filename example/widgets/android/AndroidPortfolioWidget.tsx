import React from 'react'
import { VoltraAndroid } from 'voltra/android'

const { LineMark, AreaMark } = VoltraAndroid

export interface PortfolioData {
  chartData: { x: string; y: number }[]
  change: number
  balance: string
  time: string
}

const DEFAULT_PORTFOLIO: PortfolioData = {
  chartData: [
    { x: '09:00', y: 50 },
    { x: '09:30', y: 55 },
    { x: '10:00', y: 35 },
    { x: '10:30', y: 20 },
    { x: '11:00', y: 25 },
    { x: '11:30', y: 30 },
    { x: '12:00', y: 28 },
    { x: '12:30', y: 32 },
    { x: '13:00', y: 27 },
    { x: '13:30', y: 35 },
    { x: '14:00', y: 33 },
    { x: '14:30', y: 40 },
    { x: '15:00', y: 38 },
    { x: '15:30', y: 45 },
    { x: '16:00', y: 50 },
    { x: '16:30', y: 55 },
  ],
  change: 9.4,
  balance: '$12,847.50',
  time: '--:--',
}

interface AndroidPortfolioWidgetProps {
  portfolio?: PortfolioData
}

export const AndroidPortfolioWidget = ({ portfolio = DEFAULT_PORTFOLIO }: AndroidPortfolioWidgetProps) => {
  const isPositive = portfolio.change >= 0
  const accentColor = isPositive ? '#34D399' : '#F87171'
  const areaColor = isPositive ? '#1A3D2E' : '#3D1A1A'

  return (
    <VoltraAndroid.Box
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#111113',
        borderRadius: 24,
        padding: 16,
      }}
    >
      <VoltraAndroid.Column
        style={{
          width: '100%',
          height: '100%',
        }}
        verticalAlignment="top"
      >
        <VoltraAndroid.Row style={{ width: '100%', marginBottom: 2 }} verticalAlignment="center-vertically">
          <VoltraAndroid.Column style={{ flex: 1 }}>
            <VoltraAndroid.Text style={{ fontSize: 12, fontWeight: '500', color: '#6B7280', marginBottom: 2 }}>
              Portfolio value
            </VoltraAndroid.Text>
            <VoltraAndroid.Text style={{ fontSize: 22, fontWeight: '700', color: '#F9FAFB' }}>
              {portfolio.balance}
            </VoltraAndroid.Text>
          </VoltraAndroid.Column>
        </VoltraAndroid.Row>

        <VoltraAndroid.Row style={{ width: '100%', paddingBottom: 8 }} verticalAlignment="center-vertically">
          <VoltraAndroid.Text style={{ fontSize: 13, fontWeight: '600', color: accentColor }}>
            {isPositive ? '+' : ''}
            {portfolio.change.toFixed(1)}%
          </VoltraAndroid.Text>
          <VoltraAndroid.Text style={{ fontSize: 11, color: '#4B5563', paddingLeft: 6 }}>today</VoltraAndroid.Text>
        </VoltraAndroid.Row>

        <VoltraAndroid.Chart
          style={{ width: '100%', flex: 1, borderRadius: 20 }}
          xAxisVisibility="hidden"
          yAxisVisibility="hidden"
          xAxisGridStyle={{ visible: false }}
          yAxisGridStyle={{ visible: false }}
        >
          <AreaMark data={portfolio.chartData} color={areaColor} interpolation="monotone" />
          <LineMark data={portfolio.chartData} color={accentColor} lineWidth={4} interpolation="monotone" />
        </VoltraAndroid.Chart>
      </VoltraAndroid.Column>
    </VoltraAndroid.Box>
  )
}
