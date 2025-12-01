import { withCallstackPreset } from '@callstack/rspress-preset'
import { defineConfig } from '@rspress/core'

export default withCallstackPreset(
  {
    context: __dirname,
    docs: {
      title: 'Voltra',
      description: 'Build Live Activities with JSX in React Native.',
      editUrl: 'https://github.com/callstackincubator/voltra/edit/main',
      rootUrl: 'https://voltra.dev',
      icon: 'docs/public/favicon.ico',
      logoLight: '/logo-light.svg',
      logoDark: '/logo-dark.svg',
      ogImage: '/og-image.png',
      rootDir: 'docs',
      socials: {
        github: 'https://github.com/callstackincubator/voltra',
      },
    },
    vercelAnalytics: true,
  },
  defineConfig({})
)
