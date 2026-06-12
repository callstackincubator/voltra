const path = require('node:path')

const { getDefaultConfig } = require('expo/metro-config')
const { withVoltra } = require('@use-voltra/metro')

const config = getDefaultConfig(__dirname)
const repoRoot = path.resolve(__dirname, '..')

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@use-voltra/android': path.join(repoRoot, 'packages/android'),
  '@use-voltra/android-client': path.join(repoRoot, 'packages/android-client'),
  '@use-voltra/core': path.join(repoRoot, 'packages/core'),
  '@use-voltra/expo-plugin': path.join(repoRoot, 'packages/expo-plugin'),
  '@use-voltra/ios': path.join(repoRoot, 'packages/ios'),
  '@use-voltra/ios-client': path.join(repoRoot, 'packages/ios-client'),
  '@use-voltra/server': path.join(repoRoot, 'packages/server'),
  '~': __dirname,
}

config.watchFolders = Array.from(new Set([...(config.watchFolders || []), path.join(repoRoot, 'packages')]))

module.exports = withVoltra(config)
