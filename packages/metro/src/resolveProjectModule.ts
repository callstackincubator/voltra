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
  const requireFromProject = createProjectRequire(projectRoot)

  try {
    return requireFromProject(moduleName) as T
  } catch (projectError) {
    try {
      return createExpoMetroRequire(projectRoot)(moduleName) as T
    } catch {
      throw projectError
    }
  }
}

export function resolveProjectModulePath(moduleName: string, projectRoot = process.cwd()): string {
  const requireFromProject = createProjectRequire(projectRoot)

  try {
    return requireFromProject.resolve(moduleName)
  } catch (projectError) {
    try {
      return createExpoMetroRequire(projectRoot).resolve(moduleName)
    } catch {
      throw projectError
    }
  }
}
