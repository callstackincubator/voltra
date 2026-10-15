// The facts every page uses, in one place: the landing pages, the docs chrome, astro.config.mjs,
// robots.txt, the structured data and the social card (scripts/og.mjs) all read this file.
// Replace every value with the product's own. Every command, package and claim must come from
// the product's docs or repo: no invented numbers, adopters, logos or testimonials.
//
// Copy rules (see the design guide): headlines run two beats, the second shown in the accent;
// ledes are one or two sentences; plain words, no "just" or "simply", no marketing adjectives.

import type { IconName } from '../components/site/icons'

export const site = {
  name: 'Voltra',
  /** The text in the accent wordmark block, the window tags and the giant closing wordmark. */
  wordmark: 'Voltra',
  /** The site origin, no trailing slash. Canonicals, the sitemap and robots.txt use it. */
  url: 'https://use-voltra.dev',
  repo: 'https://github.com/callstackincubator/voltra',
  /**
   * What it is, in a few words. The home page title is "Name: subtitle" (src/site/meta.ts),
   * 60 characters at most in all.
   */
  subtitle: 'Live Activities and widgets in React Native',
  /** The motto, in two beats. Used by the hero, the social card and the banner. */
  headline: ['Live Activities and widgets.', 'No Swift, no Kotlin.'],
  /** The hero lede: one or two sentences, naming who it is for. */
  lede: 'Voltra turns JSX into SwiftUI and Jetpack Compose Glance. You and your agent ship Live Activities, Dynamic Island layouts and widgets on iOS and Android without writing Swift or Kotlin.',
  /** The meta description: 160 characters at most. */
  description:
    'Build iOS Live Activities, Dynamic Island layouts and home screen widgets on iOS and Android from React Native JSX, with no Swift or Kotlin.',
  install: 'npm install @use-voltra/ios @use-voltra/ios-client',
  /** The agent skill install, in the short owner/repo form. */
  skill: 'npx skills add callstackincubator/voltra' as string | undefined,
  /** Alt text for the social card (public/og-image.jpg): the lockup, the motto, the picture. */
  ogAlt: 'Voltra by Callstack. Live Activities and widgets. No Swift, no Kotlin.',
  /** Who holds the copyright in the footer: "© YEAR VOLTRA BY CALLSTACK". */
  owner: 'Callstack',
  callstack: 'https://callstack.com/?utm_source=use-voltra.dev&utm_medium=referral&utm_campaign=voltra',
  license: {
    name: 'MIT',
    url: 'https://github.com/callstackincubator/voltra/blob/main/LICENSE.txt',
    /** For the structured data. */
    spdx: 'https://opensource.org/licenses/MIT',
  },
  npm: 'https://www.npmjs.com/package/@use-voltra/ios-client',
  discord: 'https://discord.gg/gTjbyxNQw2',
  /** Platforms or targets, in the order the design guide fixes for this product. */
  platforms: ['iOS', 'Android'],
  /** The main language of the source, for the structured data. */
  language: 'TypeScript',
  /**
   * The mark: the stepped lightning bolt from Voltra's logo, one string per row, `#` for a
   * filled step.
   */
  mark: ['....#.', '...#..', '..#...', '.#....', '#####.', '.#####', '....#.', '...#..', '..#...', '.#....'] as
    | string[]
    | undefined,
}

/** Docs paths the pages link to. The docs keep the URLs of the previous site. */
export const docs = {
  intro: '/getting-started/introduction',
  start: '/getting-started/installation',
  rnCli: '/getting-started/react-native-cli',
  ios: '/ios/introduction',
  iosSetup: '/ios/setup',
  liveActivities: '/ios/development/developing-live-activities',
  serverUpdates: '/ios/development/server-side-updates',
  iosWidgets: '/ios/development/developing-widgets',
  android: '/android/introduction',
  androidSetup: '/android/setup',
  androidWidgets: '/android/development/developing-widgets',
  ongoing: '/android/development/managing-ongoing-notifications',
  serverWidgets: '/ios/development/server-driven-widgets',
  previews: '/android/development/testing-and-previews',
  styling: '/ios/development/styling',
  dynamicColors: '/android/development/dynamic-colors',
  images: '/ios/development/images',
  localization: '/ios/development/localization',
  llms: '/llms.txt',
}

type Link = { text: string; href: string }

/**
 * The nav links, mono and centred. The docs header shows the ones that leave the docs.
 */
export const nav: Link[] = [
  { text: 'Docs', href: docs.intro },
  { text: 'iOS', href: docs.ios },
  { text: 'Android', href: docs.android },
  { text: 'GitHub', href: site.repo },
]

/** The footer row, right of the copyright, on every page and in the docs. */
export const footer: Link[] = [
  { text: 'Docs', href: docs.intro },
  { text: 'llms.txt', href: docs.llms },
  { text: 'GitHub', href: site.repo },
  { text: 'Discord', href: site.discord },
  { text: `${site.license.name} license`, href: site.license.url },
  { text: 'Callstack', href: site.callstack },
]

/** Paths kept out of the sitemap. Pages rendered with `noindex` belong here too. */
export const noindexPaths = ['/404']

/** The marquee under the hero: surfaces, then tools, in the fixed iOS, Android order. */
export const marquee = [
  'Live Activities',
  'Dynamic Island',
  'iOS widgets',
  'Android widgets',
  'Ongoing notifications',
  'SwiftUI',
  'Jetpack Compose Glance',
  'Expo',
  'React Native CLI',
  'APNs',
  'FCM',
]

/** The 404 line, in two beats. */
export const notFound = ['This widget never loaded.', `The rest of ${site.name} did.`]

/** Questions people ask, answered only from the docs. Inline `code` is allowed. */
export const faq = [
  {
    q: 'Do I need to write Swift or Kotlin?',
    a: 'No. You write Voltra JSX and call Voltra’s JS APIs. The config plugin generates the native extension targets for you.',
  },
  {
    q: 'Does it work in Expo Go?',
    a: 'No. Voltra adds native extension targets, so it needs an Expo Dev Client or a bare React Native app.',
  },
  {
    q: 'Can I use it without Expo?',
    a: 'Yes. In React Native CLI projects, `npx voltra apply` updates the native project instead of the Expo config plugin.',
  },
  {
    q: 'Which iOS version do I need?',
    a: 'iOS 16.4 or later. Some features need newer versions: push-to-start needs iOS 17.2, broadcast push needs iOS 18.',
  },
  {
    q: 'Can my server update a Live Activity?',
    a: 'Yes. `@use-voltra/ios-server` renders the same JSX to a payload you send over APNs, and `@use-voltra/android-server` does the same for widgets over FCM.',
  },
  {
    q: 'I’m on Voltra 1. How do I upgrade?',
    a: 'Voltra 2 splits the library into platform packages. The migration guide lists every import that moved.',
  },
]

/** Code shown on the home page. Real snippets from the docs, simplified but never invented. */
export const code = {
  liveActivity: `import { Voltra } from '@use-voltra/ios'
import { startLiveActivity } from '@use-voltra/ios-client'

const ui = (
  <Voltra.VStack style={{ padding: 16 }}>
    <Voltra.Symbol name="car.fill" />
    <Voltra.Text>Driver en route</Voltra.Text>
    <Voltra.Text>ETA 12 min</Voltra.Text>
  </Voltra.VStack>
)

await startLiveActivity({ lockScreen: ui })`,
  liveActivityHook: `import { Voltra } from '@use-voltra/ios'
import { useLiveActivity } from '@use-voltra/ios-client'

export function OrderTracker({ orderId }: { orderId: string }) {
  const ui = (
    <Voltra.VStack style={{ padding: 16 }}>
      <Voltra.Text>Order #{orderId}</Voltra.Text>
      <Voltra.Text>Driver en route · ETA 12 min</Voltra.Text>
    </Voltra.VStack>
  )

  useLiveActivity({ lockScreen: ui }, {
    activityName: \`order-\${orderId}\`,
    autoStart: true,
  })

  return null
}`,
  server: `import { Voltra, renderLiveActivityToString } from '@use-voltra/ios-server'

const payload = renderLiveActivityToString({
  lockScreen: (
    <Voltra.VStack style={{ padding: 16 }}>
      <Voltra.Text>Driver arrived</Voltra.Text>
      <Voltra.Text>Ready for pickup</Voltra.Text>
    </Voltra.VStack>
  ),
})`,
  androidWidget: `import { VoltraAndroid } from '@use-voltra/android'
import { updateAndroidWidget } from '@use-voltra/android-client'

await updateAndroidWidget(
  'my_widget',
  <VoltraAndroid.Column style={{ padding: 16 }}>
    <VoltraAndroid.Text>Driver en route</VoltraAndroid.Text>
    <VoltraAndroid.Text>ETA 12 min</VoltraAndroid.Text>
  </VoltraAndroid.Column>
)`,
  appJson: `{
  "expo": {
    "plugins": [
      ["@use-voltra/ios-client", {
        "groupIdentifier": "group.your.bundle.identifier",
        "enablePushNotifications": true
      }],
      ["@use-voltra/android-client", {
        "widgets": [{ "id": "my_widget", "displayName": "My Widget" }]
      }]
    ]
  }
}`,
}

/** The home page, section by section, in page order. index.astro only lays these out. */
export const home = {
  /** The `zsh` window beside the hero copy (hidden below 64rem): setup in a few lines. */
  setup: [
    { cmd: site.install },
    { comment: 'for you: JSX primitives and the runtime APIs' },
    ...(site.skill ? [{ cmd: site.skill }, { comment: 'for your agent: the Voltra skill' }] : []),
  ] as ({ cmd: string } | { comment: string })[],

  how: {
    label: 'How it works',
    headline: ['Install, configure, prebuild.', 'Then it’s all React.'],
    steps: [
      {
        title: 'Install',
        body: 'Add the platform package for JSX and the client package for runtime APIs.',
        cmd: site.install,
      },
      {
        title: 'Configure',
        body: 'Add the Voltra plugin to `app.json`. It wires the widget and Live Activity extension targets.',
        file: 'app.json → plugins',
      },
      {
        title: 'Prebuild',
        body: 'Generate the native projects, then start your app as usual.',
        cmd: 'npx expo prebuild --clean',
      },
    ] as { title: string; body: string; cmd?: string; file?: string }[],
    /** One tab per platform, each with its real setup snippet. */
    tabs: [
      {
        id: 'ios',
        name: 'iOS',
        file: 'OrderTracker.tsx',
        lang: 'tsx',
        code: code.liveActivityHook,
        pkg: '@use-voltra/ios-client',
        note: 'Live Activities, Dynamic Island and home screen widgets, rendered as SwiftUI.',
        href: docs.ios,
      },
      {
        id: 'android',
        name: 'Android',
        file: 'Widget.tsx',
        lang: 'tsx',
        code: code.androidWidget,
        pkg: '@use-voltra/android-client',
        note: 'Home screen widgets and ongoing notifications, rendered as Jetpack Compose Glance.',
        href: docs.android,
      },
      {
        id: 'server',
        name: 'Server',
        file: 'push.tsx',
        lang: 'tsx',
        code: code.server,
        pkg: '@use-voltra/ios-server',
        note: 'Render the same JSX on your server and push it over APNs or FCM.',
        href: docs.serverUpdates,
      },
    ],
  },

  feature: {
    label: 'Push updates',
    headline: ['Same JSX on your server.', 'Pushed to the lock screen.'],
    lede: 'Render a Live Activity on your server from the same components and send it over APNs. Widgets update over FCM on Android. Your app doesn’t need to be running.',
    link: { text: 'Read the push guide', href: docs.serverUpdates },
    window: 'push.tsx',
    code: code.server,
  },

  /** Cells with a pixel icon. Keep the count divisible by 4 and 2, so no row ends half empty. */
  cells: {
    label: 'What you get',
    headline: ['Every native surface,', 'from the components you know.'],
    items: [
      {
        icon: 'panel',
        title: 'Live Activities',
        body: 'Lock screen and Dynamic Island layouts, started and updated from JS.',
        href: docs.liveActivities,
      },
      {
        icon: 'grid',
        title: 'Home screen widgets',
        body: 'Widgets on iOS and Android, from the same React workflow.',
        href: docs.iosWidgets,
      },
      {
        icon: 'flag',
        title: 'Ongoing notifications',
        body: 'Persistent status updates on Android, built in JSX.',
        href: docs.ongoing,
      },
      {
        icon: 'network',
        title: 'Push updates',
        body: 'Render on your server and send over APNs or FCM.',
        href: docs.serverUpdates,
      },
      {
        icon: 'database',
        title: 'Server-driven widgets',
        body: 'Widgets fetch their own content from your server, per instance.',
        href: docs.serverWidgets,
      },
      {
        icon: 'test',
        title: 'Previews in your app',
        body: '`VoltraWidgetPreview` renders a widget inside your app while you build it.',
        href: docs.previews,
      },
      {
        icon: 'faders',
        title: 'Styles you know',
        body: 'React Native style props, plus SwiftUI and Glance modifiers where you need them.',
        href: docs.styling,
      },
      {
        icon: 'code',
        title: 'Fast Refresh',
        body: '`useLiveActivity` reloads your Live Activity as you edit, with no rebuild.',
        href: docs.liveActivities,
      },
    ] as { icon: IconName; title: string; body: string; href: string }[],
  },

  safe: {
    label: 'Native, without native code',
    headline: ['The config plugin owns native.', 'You own the components.'],
    items: [
      {
        icon: 'package',
        title: 'Generated targets',
        body: 'The config plugin, or `npx voltra apply`, creates and updates the extension targets for you.',
      },
      {
        icon: 'gauge',
        title: 'Payload budgets',
        body: 'Both the JS and native layers check payload sizes against each platform’s limits.',
      },
      {
        icon: 'lock',
        title: 'Separate server packages',
        body: '`@use-voltra/ios-server` and `@use-voltra/android-server` render payloads in your backend, apart from the app.',
      },
      {
        icon: 'stack',
        title: 'Typed end to end',
        body: 'Components, hooks and the plugin config ship TypeScript definitions.',
      },
    ] as { icon: IconName; title: string; body: string }[],
  },
}
