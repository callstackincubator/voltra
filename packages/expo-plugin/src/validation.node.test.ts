import fs from 'fs'
import os from 'os'
import path from 'path'

import { validateInitialStatePath, validateWidgetEntry } from './validation'

function createProjectRoot(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-widget-entry-'))

  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = path.join(root, relativePath)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, contents)
  }

  return root
}

describe('validateWidgetEntry', () => {
  it('accepts a relative entry and normalizes it to a POSIX project-relative path', () => {
    const projectRoot = createProjectRoot({
      'widgets/home.tsx': 'export default function HomeWidget() {}',
    })

    try {
      expect(validateWidgetEntry('./widgets/home.tsx', 'home', projectRoot)).toBe('widgets/home.tsx')
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true })
    }
  })

  it('accepts a valid relative entry without a project root', () => {
    expect(validateWidgetEntry('./widgets/home.mjs', 'home')).toBe('widgets/home.mjs')
  })

  it('rejects missing entries', () => {
    expect(() => validateWidgetEntry(undefined, 'home')).toThrow(/Widget 'home': entry is required/)
  })

  it('rejects absolute entry paths', () => {
    const projectRoot = createProjectRoot({})

    try {
      expect(() => validateWidgetEntry(path.join(projectRoot, 'widgets/home.tsx'), 'home', projectRoot)).toThrow(
        /Widget 'home': entry must be a relative path, not an absolute path/
      )
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true })
    }
  })

  it('rejects entries that escape the project root', () => {
    const projectRoot = createProjectRoot({})

    try {
      expect(() => validateWidgetEntry('../outside.tsx', 'home', projectRoot)).toThrow(
        /Widget 'home': entry must stay within the project root after normalization/
      )
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true })
    }
  })

  it('rejects unsupported entry extensions', () => {
    expect(() => validateWidgetEntry('./widgets/home.txt', 'home')).toThrow(
      /Widget 'home': entry must use a Metro-importable source extension/
    )
  })

  it('rejects missing entry files when a project root is supplied', () => {
    const projectRoot = createProjectRoot({})

    try {
      expect(() => validateWidgetEntry('./widgets/missing.tsx', 'home', projectRoot)).toThrow(
        /Widget 'home': entry file not found at widgets\/missing\.tsx/
      )
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true })
    }
  })
})

describe('validateInitialStatePath', () => {
  it('accepts a plain path without projectRoot', () => {
    expect(() => validateInitialStatePath('./widgets/a.tsx', 'w')).not.toThrow()
  })

  it('accepts a locale map of paths', () => {
    expect(() => validateInitialStatePath({ en: './widgets/en.tsx', pl: './widgets/pl.tsx' }, 'w')).not.toThrow()
  })

  it('rejects empty locale map', () => {
    expect(() => validateInitialStatePath({} as any, 'w')).toThrow(/must not be empty/)
  })
})
