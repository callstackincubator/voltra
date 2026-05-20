import type { ExampleSection } from '~/components/ExampleSectionCards'

export const ANDROID_WIDGET_SECTIONS: ExampleSection[] = [
  {
    id: 'pin-widgets',
    title: 'Pin Widgets',
    description:
      'Request to pin widgets directly from your app. Show the Android system pin widget dialog without leaving your app.',
    route: '/android-widgets/pin',
  },
  {
    id: 'image-preloading',
    title: 'Image Preloading',
    description:
      'Test image preloading for Android widgets. Download images to the app cache and verify they appear in your widgets.',
    route: '/android-widgets/image-preloading',
  },
  {
    id: 'image-fallback',
    title: 'Image Fallback',
    description:
      'Test the image fallback behavior using backgroundColor from styles. See how missing images render with different style properties.',
    route: '/android-widgets/image-fallback',
  },
  {
    id: 'preview-widgets',
    title: 'Widget Previews',
    description: 'Preview your Android widget layouts directly within the app using VoltraWidgetPreview.',
    route: '/android-widgets/preview',
  },
  {
    id: 'chart-widgets',
    title: 'Chart Widgets',
    description:
      'Preview chart widgets rendered via Canvas bitmap. Supports bar, line, area, point, rule, and pie/donut charts.',
    route: '/android-widgets/charts',
  },
  {
    id: 'server-driven-widgets',
    title: 'Server-Driven Widgets',
    description:
      'Serve dynamic widget content from a remote server using Voltra SSR. This example includes a sample widget server implementation.',
    route: '/android-widgets/server-driven',
  },
  {
    id: 'material-colors',
    title: 'Material Colors',
    description:
      'Test one Android widget through both client-side and server-side rendering, using Material dynamic colors from the current device theme.',
    route: '/android-widgets/material-colors',
  },
  {
    id: 'custom-fonts',
    title: 'Custom Fonts',
    description:
      'Render text with custom fonts in Android Glance widgets using bitmap rendering. Includes Pacifico and Press Start 2P demos.',
    route: '/android-widgets/custom-fonts',
  },
]

export const ANDROID_OTHER_SECTIONS: ExampleSection[] = [
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
]
