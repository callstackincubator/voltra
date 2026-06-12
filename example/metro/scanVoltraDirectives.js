const { requireProjectModule } = require('./resolveProjectModule')

const parser = requireProjectModule('@babel/parser')

const supportedExtensions = new Set(['.cjs', '.js', '.jsx', '.mjs', '.ts', '.tsx'])

function hasVoltraDirective(functionNode) {
  if (!functionNode || !functionNode.body || functionNode.body.type !== 'BlockStatement') {
    return false
  }

  return functionNode.body.directives.some((item) => item.value && item.value.value === 'use voltra')
}

function parseSource(source, filePath) {
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

function collectExportedLocals(program) {
  const exportedLocals = new Map()

  function add(localName, exportName) {
    if (!localName) {
      return
    }

    const exports = exportedLocals.get(localName) || new Set()
    exports.add(exportName)
    exportedLocals.set(localName, exports)
  }

  for (const statement of program.body) {
    if (statement.type === 'ExportNamedDeclaration') {
      if (statement.declaration) {
        if (statement.declaration.type === 'FunctionDeclaration') {
          add(statement.declaration.id && statement.declaration.id.name, statement.declaration.id && statement.declaration.id.name)
        }

        if (statement.declaration.type === 'VariableDeclaration') {
          for (const declaration of statement.declaration.declarations) {
            add(declaration.id && declaration.id.name, declaration.id && declaration.id.name)
          }
        }
      }

      for (const specifier of statement.specifiers) {
        add(specifier.local && specifier.local.name, specifier.exported && specifier.exported.name)
      }
    }

    if (statement.type === 'ExportDefaultDeclaration' && statement.declaration.type === 'Identifier') {
      add(statement.declaration.name, 'default')
    }
  }

  return exportedLocals
}

function createWidgetRecord({ componentName, exportName, filePath }) {
  if (!componentName || componentName === 'default') {
    return null
  }

  return {
    id: componentName,
    componentName,
    exportName,
    sourcePath: filePath,
  }
}

function scanDeclaration({ declaration, exportedLocals, filePath }) {
  if (!declaration) {
    return []
  }

  if (declaration.type === 'FunctionDeclaration') {
    const componentName = declaration.id && declaration.id.name
    const exportNames = componentName ? exportedLocals.get(componentName) : null

    if (!hasVoltraDirective(declaration) || !exportNames) {
      return []
    }

    return Array.from(exportNames)
      .map((exportName) => createWidgetRecord({ componentName, exportName, filePath }))
      .filter(Boolean)
  }

  if (declaration.type === 'VariableDeclaration') {
    const widgets = []

    for (const variableDeclarator of declaration.declarations) {
      const componentName = variableDeclarator.id && variableDeclarator.id.name
      const init = variableDeclarator.init
      const exportNames = componentName ? exportedLocals.get(componentName) : null

      if (!hasVoltraDirective(init) || !exportNames) {
        continue
      }

      for (const exportName of exportNames) {
        const widget = createWidgetRecord({ componentName, exportName, filePath })

        if (widget) {
          widgets.push(widget)
        }
      }
    }

    return widgets
  }

  return []
}

function scanVoltraDirectives({ filePath, source }) {
  if (!supportedExtensions.has(require('node:path').extname(filePath))) {
    return []
  }

  if (!source.includes("'use voltra'") && !source.includes('"use voltra"')) {
    return []
  }

  const ast = parseSource(source, filePath)
  const exportedLocals = collectExportedLocals(ast.program)
  const widgets = []

  for (const statement of ast.program.body) {
    if (statement.type === 'ExportDefaultDeclaration') {
      if (hasVoltraDirective(statement.declaration)) {
        const componentName = statement.declaration.id ? statement.declaration.id.name : 'default'
        const widget = createWidgetRecord({
          componentName,
          exportName: 'default',
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

module.exports = { scanVoltraDirectives }
