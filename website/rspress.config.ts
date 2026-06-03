import { withCallstackPreset } from '@callstack/rspress-preset'
import { defineConfig } from '@rspress/core'

export default withCallstackPreset(
  {
    context: __dirname,
    docs: {
      title: 'Voltra',
      description: 'Build Live Activities with JSX in React Native.',
      editUrl: 'https://github.com/callstackincubator/voltra/edit/main',
      rootUrl: 'https://use-voltra.dev',
      icon: 'docs/public/favicon.ico',
      logoLight: '/logo-light.svg',
      logoDark: '/logo-dark.svg',
      ogImage: '/og-image.png',
      rootDir: 'docs',
      socials: {
        github: 'https://github.com/callstackincubator/voltra',
        discord: 'https://discord.gg/gTjbyxNQw2',
      },
    },
    vercelAnalytics: true,
  },
  defineConfig({
    multiVersion: {
      default: 'v1',
      versions: ['v1', 'v2'],
    },
    themeConfig: {
      enableScrollToTop: true,
    },
    search: {
      versioned: true,
    },
  })
)
