import { Voltra, type LiveActivityEnvironment } from '@use-voltra/ios'

type OrderFinishedProps = {
  orderNumber?: string
  status?: string
}

/** A bundled Dynamic Live Activity entry used by the example app. */
export default function OrderFinishedDynamicLiveActivity(
  props: OrderFinishedProps = {},
  environment: LiveActivityEnvironment
) {
  const orderNumber = props.orderNumber ?? '123'
  const status = props.status ?? 'Ready for pickup'

  return {
    lockScreen: {
      activityBackgroundTint: '#14532D',
      content: (
        <Voltra.VStack style={{ padding: 16, gap: 6 }}>
          <Voltra.Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>Order #{orderNumber}</Voltra.Text>
          <Voltra.Text style={{ color: '#DCFCE7' }}>{status}</Voltra.Text>
          {environment.isStale ? <Voltra.Text style={{ color: '#FDE68A' }}>Status may be outdated</Voltra.Text> : null}
        </Voltra.VStack>
      ),
    },
    island: {
      compact: {
        leading: <Voltra.Text>#{orderNumber}</Voltra.Text>,
        trailing: <Voltra.Symbol name="checkmark.circle.fill" tintColor="#22C55E" />,
      },
      minimal: <Voltra.Symbol name="bag.fill" tintColor="#22C55E" />,
    },
  }
}
