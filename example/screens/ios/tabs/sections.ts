import type { ExampleSection } from '~/components/ExampleSectionCards'

export const IOS_WIDGET_SECTIONS: ExampleSection[] = [
  {
    id: 'weather',
    title: 'Weather Widget',
    description:
      'Test the weather widget with different conditions, gradients, and real-time updates. Change weather conditions and see the widget update instantly.',
    route: '/testing-grounds/weather',
  },
  {
    id: 'image-preloading',
    title: 'Image Preloading',
    description:
      'Test image preloading functionality for widgets. Download images to shared storage and verify they appear in widget renders.',
    route: '/testing-grounds/image-preloading',
  },
  {
    id: 'image-fallback',
    title: 'Image Fallback',
    description:
      'Explore the image fallback behavior using backgroundColor from styles. Test missing images with various styling approaches.',
    route: '/testing-grounds/image-fallback',
  },
  {
    id: 'client-rendered-smoke',
    title: 'Client-Rendered Widget (Track 5, Phase 3a smoke test)',
    description:
      'Fetch the IosWeatherWidget bundle from Metro, evaluate it in the shared JSContext, and call render(props, env) — verifies the runtime end-to-end without WidgetKit.',
    route: '/testing-grounds/client-rendered-smoke',
  },
  {
    id: 'widget-scheduling',
    title: 'Widget Scheduling',
    description:
      'Test widget timeline scheduling with multiple states. Configure timing for each state and watch widgets automatically transition between them.',
    route: '/testing-grounds/widget-scheduling',
  },
  {
    id: 'server-driven-widgets',
    title: 'Server-Driven Widgets',
    description:
      'Test server-driven widget updates. Widgets fetch fresh content from a remote server without the user opening the app. Manage auth credentials and trigger reloads.',
    route: '/testing-grounds/server-driven-widgets',
  },
]

export const IOS_OTHER_SECTIONS: ExampleSection[] = [
  {
    id: 'timer',
    title: 'Timer',
    description:
      'Test the VoltraTimer component with different styles (Timer/Relative), count directions, and templates. Verifies native Live Activity behavior.',
    route: '/testing-grounds/timer',
  },
  {
    id: 'styling',
    title: 'Styling',
    description:
      'Explore Voltra styling properties including padding, margins, colors, borders, shadows, and typography.',
    route: '/testing-grounds/styling',
  },
  {
    id: 'positioning',
    title: 'Positioning',
    description:
      'Learn about static, relative, and absolute positioning modes. See how left, top, and zIndex properties work with visual examples.',
    route: '/testing-grounds/positioning',
  },
  {
    id: 'progress',
    title: 'Progress Indicators',
    description:
      'Explore linear and circular progress indicators. Test determinate, indeterminate, and timer-based modes with custom labels and styling.',
    route: '/testing-grounds/progress',
  },
  {
    id: 'components',
    title: 'Components',
    description:
      'Explore all available Voltra components including Button, Text, VStack, HStack, ZStack, Image, and more.',
    route: '/testing-grounds/components',
  },
  {
    id: 'flex-playground',
    title: 'Flex Layout Playground',
    description:
      'Interactive playground for experimenting with flex layout properties. Test alignItems, justifyContent, flexDirection, spacing, and padding with live visual feedback.',
    route: '/testing-grounds/flex-playground',
  },
  {
    id: 'chart-playground',
    title: 'Chart Playground',
    description:
      'Explore all SwiftUI chart mark types: BarMark, LineMark, AreaMark, PointMark, RuleMark, and SectorMark. Randomize data to see animated transitions.',
    route: '/testing-grounds/chart-playground',
  },
  {
    id: 'gradient-playground',
    title: 'Gradient Playground',
    description:
      'Test CSS gradient strings as backgroundColor. Experiment with linear, radial, and conic gradients, direction and angle controls, color presets, stop positions, and borderRadius clipping.',
    route: '/testing-grounds/gradient-playground',
  },
  {
    id: 'channel-updates',
    title: 'Channel-Based Updates',
    description: 'Start a minimal Live Activity bound to a broadcast channel ID and test server-driven updates.',
    route: '/testing-grounds/channel-updates',
  },
]
