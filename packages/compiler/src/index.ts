import path from 'node:path'

import * as parser from '@babel/parser'

const supportedExtensions = new Set(['.cjs', '.js', '.jsx', '.mjs', '.ts', '.tsx'])

export type VoltraDirectiveWidget = {
  id: string
  componentName: string
  exportName: string
  sourcePath: string
}

type ExportedLocals = Map<string, Set<string>>

type DirectiveFunction =
  | import('@babel/types').FunctionDeclaration
  | import('@babel/types').FunctionExpression
  | import('@babel/types').ArrowFunctionExpression

function hasVoltraDirective(
  functionNode: import('@babel/types').Node | null | undefined
): functionNode is DirectiveFunction {
  if (
    !functionNode ||
    (functionNode.type !== 'FunctionDeclaration' &&
      functionNode.type !== 'FunctionExpression' &&
      functionNode.type !== 'ArrowFunctionExpression')
  ) {
    return false
  }

  const { body } = functionNode
  if (body.type !== 'BlockStatement') {
    return false
  }

  return body.directives.some((item) => item.value?.value === 'use voltra')
}

function parseSource(source: string, filePath: string): ReturnType<typeof parser.parse> {
  return parser.parse(source, {
    sourceFilename: filePath,
    sourceType: 'unambiguous',
    plugins: [
      'classProperties',
      'decorators-legacy',
      'dynamicImport',
      'exportDefaultFrom',
      'importMeta',
      'jsx',
      'topLevelAwait',
      'typescript',
    ],
  })
}

function identifierName(node: import('@babel/types').Node | null | undefined): string | null {
  return node?.type === 'Identifier' ? node.name : null
}

function exportName(
  node: import('@babel/types').Identifier | import('@babel/types').StringLiteral | null | undefined
): string | null {
  if (!node) {
    return null
  }
  if (node.type === 'Identifier') {
    return node.name
  }
  if (node.type === 'StringLiteral') {
    return node.value
  }
  return null
}

function collectExportedLocals(program: import('@babel/types').Program): ExportedLocals {
  const exportedLocals: ExportedLocals = new Map()

  function add(localName: string | null, exportedName: string | null) {
    if (!localName || !exportedName) {
      return
    }

    const exports = exportedLocals.get(localName) || new Set<string>()
    exports.add(exportedName)
    exportedLocals.set(localName, exports)
  }

  for (const statement of program.body) {
    if (statement.type === 'ExportNamedDeclaration') {
      if (statement.declaration) {
        if (statement.declaration.type === 'FunctionDeclaration') {
          add(statement.declaration.id?.name ?? null, statement.declaration.id?.name ?? null)
        }

        if (statement.declaration.type === 'VariableDeclaration') {
          for (const declaration of statement.declaration.declarations) {
            const name = identifierName(declaration.id)
            add(name, name)
          }
        }
      }

      for (const specifier of statement.specifiers) {
        if (specifier.type === 'ExportSpecifier') {
          add(exportName(specifier.local), exportName(specifier.exported))
        }
      }
    }

    if (statement.type === 'ExportDefaultDeclaration' && statement.declaration.type === 'Identifier') {
      add(statement.declaration.name, 'default')
    }
  }

  return exportedLocals
}

function createWidgetRecord({
  componentName,
  exportedName,
  filePath,
}: {
  componentName: string | null
  exportedName: string
  filePath: string
}): VoltraDirectiveWidget | null {
  if (!componentName || componentName === 'default') {
    return null
  }

  return {
    id: componentName,
    componentName,
    exportName: exportedName,
    sourcePath: filePath,
  }
}

function scanDeclaration({
  declaration,
  exportedLocals,
  filePath,
}: {
  declaration: import('@babel/types').Declaration | import('@babel/types').Statement | null | undefined
  exportedLocals: ExportedLocals
  filePath: string
}): VoltraDirectiveWidget[] {
  if (!declaration) {
    return []
  }

  if (declaration.type === 'FunctionDeclaration') {
    const componentName = declaration.id?.name ?? null
    const exportNames = componentName ? exportedLocals.get(componentName) : null

    if (!hasVoltraDirective(declaration) || !exportNames) {
      return []
    }

    return Array.from(exportNames)
      .map((name) => createWidgetRecord({ componentName, exportedName: name, filePath }))
      .filter((widget): widget is VoltraDirectiveWidget => widget !== null)
  }

  if (declaration.type === 'VariableDeclaration') {
    const widgets: VoltraDirectiveWidget[] = []

    for (const variableDeclarator of declaration.declarations) {
      const componentName = identifierName(variableDeclarator.id)
      const init = variableDeclarator.init
      const exportNames = componentName ? exportedLocals.get(componentName) : null

      if (!hasVoltraDirective(init) || !exportNames) {
        continue
      }

      for (const name of exportNames) {
        const widget = createWidgetRecord({ componentName, exportedName: name, filePath })

        if (widget) {
          widgets.push(widget)
        }
      }
    }

    return widgets
  }

  return []
}

export function scanVoltraDirectives({
  filePath,
  source,
}: {
  filePath: string
  source: string
}): VoltraDirectiveWidget[] {
  if (!supportedExtensions.has(path.extname(filePath))) {
    return []
  }

  if (!source.includes("'use voltra'") && !source.includes('"use voltra"')) {
    return []
  }

  const ast = parseSource(source, filePath)
  const exportedLocals = collectExportedLocals(ast.program)
  const widgets: VoltraDirectiveWidget[] = []

  for (const statement of ast.program.body) {
    if (statement.type === 'ExportDefaultDeclaration') {
      if (hasVoltraDirective(statement.declaration)) {
        const componentName =
          statement.declaration.type === 'FunctionDeclaration' ? statement.declaration.id?.name ?? null : null
        const widget = createWidgetRecord({
          componentName,
          exportedName: 'default',
          filePath,
        })

        if (widget) {
          widgets.push(widget)
        }
      }

      continue
    }

    if (statement.type === 'ExportNamedDeclaration') {
      widgets.push(...scanDeclaration({ declaration: statement.declaration, exportedLocals, filePath }))
      continue
    }

    widgets.push(...scanDeclaration({ declaration: statement, exportedLocals, filePath }))
  }

  return widgets
}
