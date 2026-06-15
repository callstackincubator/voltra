import { createRequire } from 'node:module'
import path from 'node:path'

function createProjectRequire(projectRoot: string): NodeRequire {
  return createRequire(path.join(projectRoot, 'package.json'))
}

function createExpoMetroRequire(projectRoot: string): NodeRequire {
  const requireFromProject = createProjectRequire(projectRoot)
  return createRequire(requireFromProject.resolve('expo/metro-config'))
}

export function requireProjectModule<T = unknown>(moduleName: string, projectRoot = process.cwd()): T {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(moduleName) as T
  } catch {
    return createExpoMetroRequire(projectRoot)(moduleName) as T
  }
}

export function resolveProjectModulePath(moduleName: string, projectRoot = process.cwd()): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require.resolve(moduleName)
  } catch {
    return createExpoMetroRequire(projectRoot).resolve(moduleName)
  }
}
