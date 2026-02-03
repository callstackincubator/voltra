import { Link } from 'expo-router'
import React from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'

import {
  AbsolutePositioningBasicExample,
  AbsolutePositioningCornersExample,
  BadgeOverlayExample,
  RelativePositioningBasicExample,
  RelativePositioningNegativeExample,
  StaticPositioningExample,
  ZIndexLayeringExample,
} from './PositioningExamples'

const POSITIONING_DATA = [
  {
    id: 'static-default',
    title: 'Static Positioning (Default)',
    description: 'When position is not set or set to "static", left and top are ignored. Box should stay centered.',
    Component: StaticPositioningExample,
  },
  {
    id: 'relative-basic',
    title: 'Relative Positioning - Basic',
    description:
      'position: "relative" offsets the box from its natural position. left: 20, top: 10 moves it right and down.',
    Component: RelativePositioningBasicExample,
  },
  {
    id: 'relative-negative',
    title: 'Relative Positioning - Negative Offset',
    description: 'Negative values move the box left (negative left) and up (negative top) from its natural position.',
    Component: RelativePositioningNegativeExample,
  },
  {
    id: 'absolute-basic',
    title: 'Absolute Positioning - Center-Based',
    description:
      'position: "absolute" places the CENTER of the box at the coordinates. left: 50, top: 50 means center at (50, 50).',
    Component: AbsolutePositioningBasicExample,
  },
  {
    id: 'absolute-corners',
    title: 'Absolute Positioning - Four Corners',
    description: 'Demonstrating absolute positioning at different coordinates. Red dots mark the center points.',
    Component: AbsolutePositioningCornersExample,
  },
  {
    id: 'zindex-layering',
    title: 'Z-Index Layering',
    description: 'Using zIndex with positioning to control stacking order.',
    Component: ZIndexLayeringExample,
  },
  {
    id: 'practical-overlay',
    title: 'Practical Example - Badge Overlay',
    description: 'Using absolute positioning to create a notification badge on a profile card.',
    Component: BadgeOverlayExample,
  },
]

export default function PositioningScreen() {
  const renderHeader = () => (
    <>
      <Text style={styles.heading}>Positioning Examples</Text>
      <Text style={styles.subheading}>
        Explore Voltra&apos;s positioning modes: static (default), relative (offset from natural position), and absolute
        (center-based coordinates). Red dots mark reference points in absolute positioning examples.
      </Text>
    </>
  )

  const renderItem = ({ item }: { item: (typeof POSITIONING_DATA)[0] }) => {
    const { Component } = item
    return (
      <Card key={item.id}>
        <Card.Title>{item.title}</Card.Title>
        <Card.Text>{item.description}</Card.Text>
        <Component />
      </Card>
    )
  }

  const renderFooter = () => (
    <View style={styles.footer}>
      <Link href="/testing-grounds" asChild>
        <Button title="Back to Testing Grounds" variant="ghost" />
      </Link>
    </View>
  )

  return (
    <View style={styles.container}>
      <FlatList
        style={[styles.scrollView]}
        contentContainerStyle={styles.content}
        data={POSITIONING_DATA}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        renderItem={renderItem}
        ListFooterComponent={renderFooter}
      />
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
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
})
