import React from 'react'

import { AndroidOngoingNotification } from '../../index.js'
import { renderAndroidOngoingNotificationPayloadToJson } from '../../server.js'

describe('Android ongoing notification renderer', () => {
  it('renders a progress payload snapshot', () => {
    const payload = renderAndroidOngoingNotificationPayloadToJson(
      <AndroidOngoingNotification.Progress
        title="Delivery in progress"
        subText="ETA updated"
        text="Courier is nearby"
        value={4}
        max={10}
        shortCriticalText="Soon"
        when={1234}
        chronometer
        largeIcon={{ assetName: 'package_box' }}
        progressTrackerIcon={{ assetName: 'tracker_icon' }}
        progressStartIcon={{ assetName: 'warehouse_icon' }}
        progressEndIcon={{ base64: 'aGVsbG8=' }}
        segments={[{ length: 6, color: '#00FF00' }, { length: 4 }]}
        points={[{ position: 3, color: 'red' }, { position: 8 }]}
      />
    )

    expect(payload).toEqual({
      v: 1,
      kind: 'progress',
      title: 'Delivery in progress',
      subText: 'ETA updated',
      text: 'Courier is nearby',
      value: 4,
      max: 10,
      indeterminate: undefined,
      shortCriticalText: 'Soon',
      when: 1234,
      chronometer: true,
      largeIcon: { assetName: 'package_box' },
      progressTrackerIcon: { assetName: 'tracker_icon' },
      progressStartIcon: { assetName: 'warehouse_icon' },
      progressEndIcon: { base64: 'aGVsbG8=' },
      segments: [
        { length: 6, color: '#00FF00' },
        { length: 4, color: undefined },
      ],
      points: [
        { position: 3, color: 'red' },
        { position: 8, color: undefined },
      ],
    })
  })

  it('serializes action icons in the payload even though Android usually hides them in notification UI', () => {
    expect(
      renderAndroidOngoingNotificationPayloadToJson(
        <AndroidOngoingNotification.BigText title="Driver is approaching" text="2 stops away">
          <AndroidOngoingNotification.Action
            title="Open order"
            deepLinkUrl="voltra://orders/123"
            icon={{ assetName: 'order_icon' }}
          />
          <AndroidOngoingNotification.Action title="Track driver" deepLinkUrl="voltra://orders/123/track" />
        </AndroidOngoingNotification.BigText>
      )
    ).toMatchInlineSnapshot(`
      {
        "actions": [
          {
            "deepLinkUrl": "voltra://orders/123",
            "icon": {
              "assetName": "order_icon",
            },
            "title": "Open order",
          },
          {
            "deepLinkUrl": "voltra://orders/123/track",
            "icon": undefined,
            "title": "Track driver",
          },
        ],
        "bigText": "2 stops away",
        "chronometer": undefined,
        "kind": "bigText",
        "largeIcon": undefined,
        "shortCriticalText": undefined,
        "subText": undefined,
        "text": "2 stops away",
        "title": "Driver is approaching",
        "v": 1,
        "when": undefined,
      }
    `)
  })

  it('renders a big text payload snapshot', () => {
    const payload = renderAndroidOngoingNotificationPayloadToJson(
      <AndroidOngoingNotification.BigText
        title="Match delayed"
        subText="Weather alert"
        text="Rain delay in effect"
        bigText="Play will resume shortly."
        largeIcon={{ assetName: 'stadium' }}
      />
    )

    expect(payload).toEqual({
      v: 1,
      kind: 'bigText',
      title: 'Match delayed',
      subText: 'Weather alert',
      text: 'Rain delay in effect',
      bigText: 'Play will resume shortly.',
      shortCriticalText: undefined,
      when: undefined,
      chronometer: undefined,
      largeIcon: { assetName: 'stadium' },
    })
  })

  it('rejects invalid image sources', () => {
    expect(() =>
      renderAndroidOngoingNotificationPayloadToJson(
        <AndroidOngoingNotification.Progress
          title="A"
          value={1}
          max={2}
          largeIcon={{ uri: 'https://example.com' } as any}
        />
      )
    ).toThrow('Ongoing notification prop "largeIcon" must be an image source with either assetName or base64.')
  })

  it('rejects empty action titles', () => {
    expect(() =>
      renderAndroidOngoingNotificationPayloadToJson(
        <AndroidOngoingNotification.Progress title="A" value={1} max={2}>
          <AndroidOngoingNotification.Action title="" deepLinkUrl="voltra://orders/123" />
        </AndroidOngoingNotification.Progress>
      )
    ).toThrow('Ongoing notification prop "title" must be a non-empty string.')
  })

  it('rejects empty action deep links', () => {
    expect(() =>
      renderAndroidOngoingNotificationPayloadToJson(
        <AndroidOngoingNotification.Progress title="A" value={1} max={2}>
          <AndroidOngoingNotification.Action title="Open order" deepLinkUrl="" />
        </AndroidOngoingNotification.Progress>
      )
    ).toThrow('Ongoing notification prop "deepLinkUrl" must be a non-empty string.')
  })

  it('rejects invalid action icons', () => {
    expect(() =>
      renderAndroidOngoingNotificationPayloadToJson(
        <AndroidOngoingNotification.Progress title="A" value={1} max={2}>
          <AndroidOngoingNotification.Action
            title="Open order"
            deepLinkUrl="voltra://orders/123"
            icon={{ uri: 'https://example.com' } as any}
          />
        </AndroidOngoingNotification.Progress>
      )
    ).toThrow('Ongoing notification prop "icon" must be an image source with either assetName or base64.')
  })

  it('rejects invalid segments', () => {
    expect(() =>
      renderAndroidOngoingNotificationPayloadToJson(
        <AndroidOngoingNotification.Progress title="A" value={1} max={2} segments={[{ length: 0 } as any]} />
      )
    ).toThrow('Ongoing notification prop "segments[0].length" must be greater than 0.')
  })

  it('rejects invalid points', () => {
    expect(() =>
      renderAndroidOngoingNotificationPayloadToJson(
        <AndroidOngoingNotification.Progress title="A" value={1} max={2} points={[{ position: -1 } as any]} />
      )
    ).toThrow('Ongoing notification prop "points[0].position" must be greater than or equal to 0.')
  })

  it('rejects unsupported roots', () => {
    expect(() => renderAndroidOngoingNotificationPayloadToJson(<div />)).toThrow(
      'Ongoing notification content must use AndroidOngoingNotification.Progress or AndroidOngoingNotification.BigText.'
    )
  })

  it('rejects Action as the root element', () => {
    expect(() =>
      renderAndroidOngoingNotificationPayloadToJson(
        <AndroidOngoingNotification.Action title="Open order" deepLinkUrl="voltra://orders/123" />
      )
    ).toThrow(
      'Ongoing notification content must use AndroidOngoingNotification.Progress or AndroidOngoingNotification.BigText.'
    )
  })

  it('rejects multiple roots', () => {
    expect(() =>
      renderAndroidOngoingNotificationPayloadToJson(
        <>
          <AndroidOngoingNotification.Progress title="A" value={1} max={2} />
          <AndroidOngoingNotification.BigText title="B" text="C" />
        </>
      )
    ).toThrow('Ongoing notification content must contain exactly one root element.')
  })

  it('ignores unknown children', () => {
    expect(
      renderAndroidOngoingNotificationPayloadToJson(
        <AndroidOngoingNotification.Progress title="A" value={1} max={2}>
          <div />
          {false}
          {'ignored'}
          <AndroidOngoingNotification.Action title="Open order" deepLinkUrl="voltra://orders/123" />
        </AndroidOngoingNotification.Progress>
      )
    ).toEqual({
      v: 1,
      kind: 'progress',
      title: 'A',
      subText: undefined,
      text: undefined,
      value: 1,
      max: 2,
      indeterminate: undefined,
      shortCriticalText: undefined,
      when: undefined,
      chronometer: undefined,
      largeIcon: undefined,
      progressTrackerIcon: undefined,
      progressStartIcon: undefined,
      progressEndIcon: undefined,
      segments: undefined,
      points: undefined,
      actions: [{ title: 'Open order', deepLinkUrl: 'voltra://orders/123', icon: undefined }],
    })
  })
})
