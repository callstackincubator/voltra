// @ts-check
import sitemap from '@astrojs/sitemap'
import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'
import starlightLlmsTxt from 'starlight-llms-txt'

import { brandCss } from './src/site/brand.ts'
import { site as meta, noindexPaths } from './src/site/content.ts'
import { TITLE_DELIMITER } from './src/site/meta.ts'

const site = meta.url
const repo = meta.repo
const description = meta.description
// Where this site lives inside the repo, for the docs' "Edit page" links.
const siteDir = 'website'

export default defineConfig({
  site,
  // Pages are files (`docs/introduction.html`, `404.html`) served without `.html` or a trailing
  // slash (`cleanUrls` and `trailingSlash: false` in vercel.json).
  trailingSlash: 'never',
  build: { format: 'file' },
  // Responsive images: Markdown screenshots get a srcset, so phones don't download huge files.
  image: { layout: 'constrained' },
  devToolbar: { enabled: false },
  integrations: [
    // Starlight would add the sitemap itself; listed so the pages outside Starlight are included
    // and the noindex ones are left out.
    sitemap({
      filter: (page) => !noindexPaths.includes(new URL(page).pathname.replace(/\.html$/, '')),
    }),
    starlight({
      // Docs titles read "Page | Name", the pattern src/site/meta.ts builds for every page.
      title: meta.name,
      titleDelimiter: TITLE_DELIMITER,
      description,
      favicon: '/favicon.svg',
      // src/pages/404.astro replaces Starlight's 404, in the site's look.
      disable404Route: true,
      // Clean canonicals, per-page descriptions and breadcrumbs for docs pages.
      routeMiddleware: './src/routeData.ts',
      // The same tokens, fonts and lockup as the landing pages.
      customCss: ['./src/fonts/font-face.css', './src/styles/theme.css', './src/styles/docs.css'],
      components: {
        ThemeProvider: './src/components/starlight/ThemeProvider.astro',
        SiteTitle: './src/components/starlight/SiteTitle.astro',
        SocialIcons: './src/components/starlight/SocialIcons.astro',
        Footer: './src/components/starlight/Footer.astro',
      },
      social: [{ icon: 'github', label: 'GitHub', href: repo }],
      editLink: { baseUrl: `${repo}/edit/main/${siteDir}/src/content/docs/` },
      head: [
        // The accent as CSS variables (src/site/brand.ts), read by theme.css and docs.css.
        { tag: 'style', content: brandCss },
        // Starlight sets og:title, og:description and a large Twitter card, but no image.
        { tag: 'meta', attrs: { property: 'og:image', content: `${site}/og-image.jpg` } },
        { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
        { tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
        { tag: 'meta', attrs: { property: 'og:image:alt', content: meta.ogAlt } },
        { tag: 'meta', attrs: { name: 'twitter:image', content: `${site}/og-image.jpg` } },
        { tag: 'meta', attrs: { name: 'twitter:image:alt', content: meta.ogAlt } },
        { tag: 'meta', attrs: { name: 'theme-color', content: '#0a0a0a' } },
        {
          tag: 'link',
          attrs: { rel: 'icon', href: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
        },
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' } },
        {
          tag: 'link',
          attrs: { rel: 'alternate', type: 'text/plain', title: 'llms.txt', href: '/llms.txt' },
        },
      ],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', slug: 'getting-started/introduction' },
            { label: 'Installation', slug: 'getting-started/installation' },
            { label: 'React Native CLI', slug: 'getting-started/react-native-cli' },
            { label: 'Migration to v2', slug: 'getting-started/migration-v2' },
            { label: 'Prior Art', slug: 'getting-started/prior-art' },
          ],
        },
        {
          label: 'iOS',
          items: [
            { label: 'Introduction', slug: 'ios/introduction' },
            { label: 'Setup', slug: 'ios/setup' },
            {
              label: 'Components',
              items: [
                { label: 'Overview', slug: 'ios/components/overview' },
                { label: 'Layout & Containers', slug: 'ios/components/layout' },
                { label: 'Visual Elements', slug: 'ios/components/visual' },
                { label: 'Status & Progress', slug: 'ios/components/status' },
                { label: 'Interactivity', slug: 'ios/components/interactive' },
              ],
            },
            { label: 'Charts', slug: 'ios/charts' },
            {
              label: 'Development',
              items: [
                { label: 'Managing Live Activities locally', slug: 'ios/development/managing-live-activities-locally' },
                { label: 'Developing Live Activities', slug: 'ios/development/developing-live-activities' },
                { label: 'Dynamic Live Activities', slug: 'ios/development/dynamic-live-activities' },
                { label: 'Developing Widgets', slug: 'ios/development/developing-widgets' },
                { label: 'Dynamic Widgets', slug: 'ios/development/dynamic-widgets' },
                { label: 'Configurable Widgets', slug: 'ios/development/configurable-widgets' },
                { label: 'Localization', slug: 'ios/development/localization' },
                { label: 'Querying Active Widgets', slug: 'ios/development/querying-active-widgets' },
                { label: 'Widget pre-rendering', slug: 'ios/development/widget-pre-rendering' },
                { label: 'Images', slug: 'ios/development/images' },
                { label: 'Image preloading', slug: 'ios/development/image-preloading' },
                { label: 'Performance', slug: 'ios/development/performance' },
                { label: 'Styling', slug: 'ios/development/styling' },
                { label: 'Native modifiers', slug: 'ios/development/native-modifiers' },
                { label: 'Gradients', slug: 'ios/development/gradients' },
                { label: 'Custom Fonts', slug: 'ios/development/custom-fonts' },
                { label: 'Flexbox Layout', slug: 'ios/development/flexbox-layout' },
                { label: 'Interactions', slug: 'ios/development/interactions' },
                { label: 'Events', slug: 'ios/development/events' },
                { label: 'Server-side updates', slug: 'ios/development/server-side-updates' },
                { label: 'Server-driven widgets', slug: 'ios/development/server-driven-widgets' },
              ],
            },
            {
              label: 'API Reference',
              items: [
                { label: 'Plugin Configuration', slug: 'ios/api/plugin-configuration' },
                { label: 'Configuration', slug: 'ios/api/configuration' },
              ],
            },
          ],
        },
        {
          label: 'Android',
          items: [
            { label: 'Introduction', slug: 'android/introduction' },
            { label: 'Setup', slug: 'android/setup' },
            {
              label: 'Components',
              items: [
                { label: 'Layout & Containers', slug: 'android/components/layout' },
                { label: 'Visual Elements', slug: 'android/components/visual' },
                { label: 'Status & Progress', slug: 'android/components/status' },
                { label: 'Interactivity', slug: 'android/components/interactive' },
              ],
            },
            { label: 'Charts', slug: 'android/charts' },
            {
              label: 'Development',
              items: [
                { label: 'Developing Widgets', slug: 'android/development/developing-widgets' },
                { label: 'Dynamic Widgets', slug: 'android/development/dynamic-widgets' },
                { label: 'Localization', slug: 'android/development/localization' },
                { label: 'Managing Ongoing Notifications', slug: 'android/development/managing-ongoing-notifications' },
                { label: 'Remote Ongoing Notifications', slug: 'android/development/remote-ongoing-notifications' },
                { label: 'Querying Active Widgets', slug: 'android/development/querying-active-widgets' },
                { label: 'Testing and Previews', slug: 'android/development/testing-and-previews' },
                { label: 'Styling', slug: 'android/development/styling' },
                { label: 'Native modifiers', slug: 'android/development/native-modifiers' },
                { label: 'Dynamic Colors', slug: 'android/development/dynamic-colors' },
                { label: 'Images', slug: 'android/development/images' },
                { label: 'Image Preloading', slug: 'android/development/image-preloading' },
                { label: 'Widget Pre-rendering', slug: 'android/development/widget-pre-rendering' },
                { label: 'Server-driven widgets', slug: 'android/development/server-driven-widgets' },
                { label: 'Custom Fonts', slug: 'android/development/custom-fonts' },
              ],
            },
            {
              label: 'API Reference',
              items: [
                { label: 'Plugin Configuration', slug: 'android/api/plugin-configuration' },
                { label: 'Widget Sizing & Previews', slug: 'android/api/widget-sizing-and-previews' },
              ],
            },
          ],
        },
      ],
      plugins: [starlightLlmsTxt({ projectName: meta.name, description })],
    }),
  ],
})
