const { createRequire } = require('node:module')
const path = require('node:path')

// Resolve a Metro-ecosystem module (metro, metro-config, @babel/parser, …) that pnpm's strict
// node_modules layout can hide. A plain require works when this scaffolding is loaded inside the
// Expo/Metro CLI (the dev server, where metro-babel-register extends module resolution). When it's
// loaded by a standalone `node` process — the release widget bundler invoked from the Xcode build
// phase — that resolution isn't in place, so walk the project's dependency graph from
// `expo/metro-config`, which transitively exposes Metro and its Babel dependencies.
//
// `projectRoot` defaults to the project that contains this scaffolding (one level above metro/).
function requireProjectModule(moduleName, projectRoot = path.resolve(__dirname, '..')) {
  try {
    return require(moduleName)
  } catch {
    const requireFromProject = createRequire(path.join(projectRoot, 'package.json'))
    const requireFromExpoMetroConfig = createRequire(requireFromProject.resolve('expo/metro-config'))
    return requireFromExpoMetroConfig(moduleName)
  }
}

// Like requireProjectModule, but returns the resolved file path instead of the module export.
// Used to map bare transitive specifiers (e.g. @babel/runtime) to their on-disk package dir for
// Metro's resolver under pnpm.
function resolveProjectModulePath(moduleName, projectRoot = path.resolve(__dirname, '..')) {
  try {
    return require.resolve(moduleName)
  } catch {
    const requireFromProject = createRequire(path.join(projectRoot, 'package.json'))
    const requireFromExpoMetroConfig = createRequire(requireFromProject.resolve('expo/metro-config'))
    return requireFromExpoMetroConfig.resolve(moduleName)
  }
}

module.exports = { requireProjectModule, resolveProjectModulePath }