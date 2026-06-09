import fs from 'node:fs'
import path from 'node:path'
import { withCallstackPreset } from '@callstack/rspress-preset'
import { defineConfig } from '@rspress/core'
import type { Sidebar, SidebarGroup } from '@rspress/core'

type MetaItem = {
  type: 'file' | 'dir'
  name: string
  label: string
}

function readMeta(dir: string): MetaItem[] {
  const metaPath = path.join(dir, '_meta.json')
  if (!fs.existsSync(metaPath)) return []
  return JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
}

function buildSidebarFromMeta(dir: string, routePrefix: string): Sidebar[string] {
  return readMeta(dir).map((item) => {
    if (item.type === 'file') {
      return { text: item.label, link: `${routePrefix}/${item.name}` }
    }
    return {
      text: item.label,
      collapsed: false,
      items: buildSidebarFromMeta(path.join(dir, item.name), `${routePrefix}/${item.name}`),
    } satisfies SidebarGroup
  })
}

function buildVersionSidebar(docsDir: string, version: string, urlPrefix: string): Sidebar {
  const versionDir = path.join(docsDir, version)
  const sections = readMeta(versionDir)
  const allItems: SidebarGroup[] = sections.map((section) => ({
    text: section.label,
    collapsed: false,
    items: buildSidebarFromMeta(path.join(versionDir, section.name), `${urlPrefix}/${section.name}`),
  }))
  return { [`${urlPrefix}/`]: allItems }
}

const docsDir = path.join(__dirname, 'docs')
const defaultVersion = 'v2'
const versions = ['v1', 'v2']

// Build these manually so each docs version can mirror the folder metadata
// and still land users on the first page in every section.
const sidebar = versions.reduce((acc, version) => {
  const urlPrefix = version === defaultVersion ? '' : `/${version}`
  return { ...acc, ...buildVersionSidebar(docsDir, version, urlPrefix) }
}, {} as Sidebar)

const nav = versions.reduce((acc, version) => {
  const urlPrefix = version === defaultVersion ? '' : `/${version}`
  const sections = readMeta(path.join(docsDir, version))
  const firstFileInSection = (sectionName: string) => {
    const items = readMeta(path.join(docsDir, version, sectionName))
    const first = items.find((i) => i.type === 'file')
    return first ? `${urlPrefix}/${sectionName}/${first.name}` : `${urlPrefix}/${sectionName}`
  }
  return {
    ...acc,
    [version]: sections.map((section) => ({
      text: section.label,
      link: firstFileInSection(section.name),
    })),
  }
}, {} as Record<string, { text: string; link: string }[]>)

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
      default: defaultVersion,
      versions,
    },
    themeConfig: {
      enableScrollToTop: true,
      nav,
      sidebar,
    },
    search: {
      versioned: true,
    },
  })
)
