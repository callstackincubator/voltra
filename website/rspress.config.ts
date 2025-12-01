import { withCallstackPreset } from '@callstack/rspress-preset'
import { defineConfig } from '@rspress/core'

export default withCallstackPreset(
  {
    context: __dirname,
    docs: {
      title: 'Voltra',
      description: 'Use JSX to build Live Activities',
      editUrl: 'https://github.com/org/repo/edit/main',
      rootUrl: 'https://voltra.dev',
      icon: 'icon.ico',
      logoLight: 'logo-light.png',
      logoDark: 'logo-dark.png',
      ogImage: 'og-image.png',
      // Optional: defaults to 'docs'
      rootDir: 'docs',
      // Optional: social links; keys follow Rspress theme icons
      socials: {
        github: 'https://github.com/org/repo',
        x: 'https://x.com/my_profile',
      },
    },
    // Optional: forwarded to @callstack/rspress-theme/plugin
    theme: {
      // theme settings
    },
    // Optional: boolean or config for Vercel Analytics.
    vercelAnalytics: true,
  },
  defineConfig({
    // Your extra/override Rspress config if needed
  })
)
