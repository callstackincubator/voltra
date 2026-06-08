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
    id: 'gradient-backgrounds',
    title: 'Gradient Backgrounds',
    description:
      'Preview Android widget backgrounds rendered from style.backgroundImage CSS gradients through native Glance.',
    route: '/android-widgets/gradient-playground',
  },
  {
    id: 'server-driven-widgets',
    title: 'Server-Driven Widgets',
    description:
      'Serve dynamic widget content from a remote server using Voltra SSR. This example includes a sample widget server implementation.',
    route: '/android-widgets/server-driven',
  },
]

export const ANDROID_OTHER_SECTIONS: ExampleSection[] = [
  {
    id: 'components',
    title: 'Android Components',
    description:
      'Explore all supported VoltraAndroid components rendered through native Android Glance widget previews.',
    route: '/android-widgets/components',
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
