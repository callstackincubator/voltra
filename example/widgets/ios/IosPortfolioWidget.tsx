import React from 'react'
import { Voltra } from 'voltra'

import type { PortfolioData } from '../android/AndroidPortfolioWidget'

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

interface IosPortfolioWidgetProps {
  portfolio?: PortfolioData
}

export const IosPortfolioWidget = ({ portfolio = DEFAULT_PORTFOLIO }: IosPortfolioWidgetProps) => {
  const isPositive = portfolio.change >= 0
  const accentColor = isPositive ? '#34D399' : '#F87171'
  const areaColor = isPositive ? '#1A3D2E' : '#3D1A1A'

  return (
    <Voltra.VStack
      alignment="leading"
      style={{
        flex: 1,
        padding: 13,
        backgroundColor: '#111113',
      }}
    >
      <Voltra.HStack alignment="center">
        <Voltra.VStack alignment="leading" style={{ flex: 1 }}>
          <Voltra.Text style={{ fontSize: 13, fontWeight: '500', color: '#6B7280' }}>Portfolio value</Voltra.Text>
          <Voltra.Text style={{ fontSize: 24, fontWeight: '700', color: '#F9FAFB', marginTop: 2 }}>
            {portfolio.balance}
          </Voltra.Text>
        </Voltra.VStack>
      </Voltra.HStack>

      <Voltra.HStack alignment="center" spacing={4}>
        <Voltra.Text style={{ fontSize: 14, fontWeight: '600', color: accentColor, marginTop: 4 }}>
          {isPositive ? '+' : ''}
          {portfolio.change.toFixed(1)}%
        </Voltra.Text>
        <Voltra.Text style={{ fontSize: 12, color: '#4B5563', marginTop: 4 }}>today</Voltra.Text>
      </Voltra.HStack>

      <Voltra.Chart
        style={{
          width: '100%',
          flex: 1,
          marginTop: 12,
          borderRadius: 20,
          overflow: 'hidden',
        }}
        xAxisVisibility="hidden"
        yAxisVisibility="hidden"
      >
        <Voltra.AreaMark data={portfolio.chartData} color={areaColor} interpolation="monotone" />
        <Voltra.LineMark data={portfolio.chartData} color={accentColor} lineWidth={1} interpolation="monotone" />
      </Voltra.Chart>
    </Voltra.VStack>
  )
}
