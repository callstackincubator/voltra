const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')

const { runGeneration, createGenerationPaths } = require('../generator/generate-types.ts')
const { validateComponentsData } = require('../generator/validate-components.ts')

const generatorRoot = path.resolve(__dirname, '..')
const schema = JSON.parse(fs.readFileSync(path.join(generatorRoot, 'schemas', 'components.schema.json'), 'utf-8'))

const createLogger = () => {
  const entries = []
  const logger = {
    log: (...args) => entries.push({ level: 'log', text: args.join(' ') }),
    warn: (...args) => entries.push({ level: 'warn', text: args.join(' ') }),
    error: (...args) => entries.push({ level: 'error', text: args.join(' ') }),
  }

  return { logger, entries }
}

const createFixtureData = () => ({
  version: '9.9.9',
  shortNames: {
    style: 's',
    backgroundColor: 'bg',
    numberOfLines: 'nol',
    maxLines: 'mxl',
    destination: 'dest',
    text: 'txt',
    contentAlignment: 'ca',
  },
  styleProperties: ['backgroundColor'],
  components: [
    {
      name: 'Text',
      description: 'Display text content',
      swiftAvailability: 'iOS 13.0, macOS 10.15',
      parameters: {
        numberOfLines: {
          type: 'number',
          optional: true,
          description: 'Maximum number of lines to display',
        },
      },
    },
    {
      name: 'Link',
      description: 'Open a destination',
      swiftAvailability: 'iOS 14.0, macOS 11.0',
      hasChildren: true,
      parameters: {
        destination: {
          type: 'string',
          optional: false,
          description: 'Destination URL',
        },
      },
    },
    {
      name: 'AndroidText',
      description: 'Android text',
      swiftAvailability: 'Not available',
      androidAvailability: 'Android 12+',
      parameters: {
        maxLines: {
          type: 'number',
          optional: true,
          description: 'Maximum lines',
        },
      },
    },
    {
      name: 'AndroidBox',
      description: 'Android box',
      swiftAvailability: 'Not available',
      androidAvailability: 'Android 12+',
      hasChildren: true,
      parameters: {
        contentAlignment: {
          type: 'string',
          optional: true,
          enum: ['center'],
          description: 'Content alignment within the box',
        },
      },
    },
  ],
})

const writeJson = (filePath, value) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2))
}

test('validates component fixtures and reports useful schema errors', () => {
  const validData = createFixtureData()
  const validCapture = createLogger()
  assert.equal(validateComponentsData(schema, validData, validCapture.logger), true)
  assert.match(validCapture.entries.map((entry) => entry.text).join('\n'), /Components schema is valid/)

  const missingFieldCapture = createLogger()
  const missingFieldData = createFixtureData()
  delete missingFieldData.components[0].parameters
  assert.equal(validateComponentsData(schema, missingFieldData, missingFieldCapture.logger), false)
  assert.match(
    missingFieldCapture.entries.map((entry) => entry.text).join('\n'),
    /must have required property 'parameters'/
  )

  const invalidEnumCapture = createLogger()
  const invalidEnumData = createFixtureData()
  invalidEnumData.components[0].parameters.numberOfLines.type = 'integer'
  assert.equal(validateComponentsData(schema, invalidEnumData, invalidEnumCapture.logger), false)
  assert.match(
    invalidEnumCapture.entries.map((entry) => entry.text).join('\n'),
    /must be equal to one of the allowed values/
  )

  const duplicateCapture = createLogger()
  const duplicateData = createFixtureData()
  duplicateData.components.push({ ...duplicateData.components[0] })
  assert.equal(validateComponentsData(schema, duplicateData, duplicateCapture.logger), false)
  assert.match(duplicateCapture.entries.map((entry) => entry.text).join('\n'), /Duplicate component names found: Text/)

  const invalidParamCapture = createLogger()
  const invalidParamData = createFixtureData()
  invalidParamData.components[0].parameters['not-valid'] = invalidParamData.components[0].parameters.numberOfLines
  assert.equal(validateComponentsData(schema, invalidParamData, invalidParamCapture.logger), false)
  assert.match(invalidParamCapture.entries.map((entry) => entry.text).join('\n'), /Text.not-valid/)
})

test('generates synchronized artifacts into the intended directories and cleans stale files', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-generator-'))
  const workspaceRoot = path.join(tempRoot, 'workspace')
  const generatorTempRoot = path.join(workspaceRoot, 'packages', 'generator')
  const fixtureData = createFixtureData()
  const fixtureSchemaPath = path.join(generatorTempRoot, 'schemas', 'components.schema.json')
  const fixtureDataPath = path.join(generatorTempRoot, 'data', 'components.json')
  const paths = createGenerationPaths(generatorTempRoot, workspaceRoot)
  const { logger, entries } = createLogger()
  const formatCalls = []
  const workspaceFormatCalls = []

  writeJson(fixtureSchemaPath, schema)
  writeJson(fixtureDataPath, fixtureData)

  fs.mkdirSync(paths.tsIosPropsOutputDir, { recursive: true })
  fs.writeFileSync(path.join(paths.tsIosPropsOutputDir, 'Stale.ts'), 'stale')
  fs.writeFileSync(path.join(paths.tsIosPropsOutputDir, 'keep.txt'), 'keep')

  fs.mkdirSync(paths.swiftParametersOutputDir, { recursive: true })
  fs.writeFileSync(path.join(paths.swiftParametersOutputDir, 'OldParameters.swift'), 'stale')
  fs.writeFileSync(path.join(paths.swiftParametersOutputDir, 'keep.txt'), 'keep')

  fs.mkdirSync(paths.kotlinParametersOutputDir, { recursive: true })
  fs.writeFileSync(path.join(paths.kotlinParametersOutputDir, 'OldParameters.kt'), 'stale')
  fs.writeFileSync(path.join(paths.kotlinParametersOutputDir, 'keep.txt'), 'keep')

  const outsidePath = path.join(tempRoot, 'outside.txt')
  fs.writeFileSync(outsidePath, 'untouched')

  runGeneration({
    paths,
    logger,
    runFormatScript: (scriptName, stepLabel) => {
      formatCalls.push({ scriptName, stepLabel })
    },
    runWorkspaceFormatScript: (scriptName, workspace, stepLabel) => {
      workspaceFormatCalls.push({ scriptName, workspace, stepLabel })
    },
  })

  assert.equal(fs.existsSync(path.join(paths.tsIosPropsOutputDir, 'Stale.ts')), false)
  assert.equal(fs.existsSync(path.join(paths.swiftParametersOutputDir, 'OldParameters.swift')), false)
  assert.equal(fs.existsSync(path.join(paths.kotlinParametersOutputDir, 'OldParameters.kt')), false)
  assert.equal(fs.readFileSync(path.join(paths.tsIosPropsOutputDir, 'keep.txt'), 'utf-8'), 'keep')
  assert.equal(fs.readFileSync(path.join(paths.swiftParametersOutputDir, 'keep.txt'), 'utf-8'), 'keep')
  assert.equal(fs.readFileSync(path.join(paths.kotlinParametersOutputDir, 'keep.txt'), 'utf-8'), 'keep')
  assert.equal(fs.readFileSync(outsidePath, 'utf-8'), 'untouched')

  const iosTextProps = fs.readFileSync(path.join(paths.tsIosPropsOutputDir, 'Text.ts'), 'utf-8')
  const iosLinkProps = fs.readFileSync(path.join(paths.tsIosPropsOutputDir, 'Link.ts'), 'utf-8')
  const androidTextProps = fs.readFileSync(path.join(paths.tsAndroidPropsOutputDir, 'AndroidText.ts'), 'utf-8')
  const androidBoxProps = fs.readFileSync(path.join(paths.tsAndroidPropsOutputDir, 'AndroidBox.ts'), 'utf-8')

  assert.match(iosTextProps, /export type TextProps = VoltraBaseProps & \{/)
  assert.match(iosTextProps, /numberOfLines\?: number/)
  assert.match(iosLinkProps, /destination: string/)
  assert.match(androidTextProps, /export type AndroidTextProps = VoltraBaseProps & \{/)
  assert.match(androidTextProps, /maxLines\?: number/)
  assert.doesNotMatch(androidTextProps, /text: string/)
  assert.match(androidBoxProps, /contentAlignment\?: 'center'/)
  assert.equal(fs.existsSync(path.join(paths.tsIosPropsOutputDir, 'AndroidText.ts')), false)
  assert.equal(fs.existsSync(path.join(paths.tsAndroidPropsOutputDir, 'Text.ts')), false)

  const iosComponentIds = fs.readFileSync(path.join(paths.tsIosPayloadOutputDir, 'component-ids.ts'), 'utf-8')
  const androidComponentIds = fs.readFileSync(path.join(paths.tsAndroidPayloadOutputDir, 'component-ids.ts'), 'utf-8')
  const swiftComponentIds = fs.readFileSync(path.join(paths.swiftSharedOutputDir, 'ComponentTypeID.swift'), 'utf-8')
  const kotlinComponentIds = fs.readFileSync(path.join(paths.kotlinPayloadOutputDir, 'ComponentTypeID.kt'), 'utf-8')

  assert.match(iosComponentIds, /'Text': 0/)
  assert.match(iosComponentIds, /'Link': 1/)
  assert.doesNotMatch(iosComponentIds, /AndroidText/)
  assert.match(androidComponentIds, /'AndroidText': 0/)
  assert.match(androidComponentIds, /'AndroidBox': 1/)
  assert.match(swiftComponentIds, /case TEXT = 0/)
  assert.match(swiftComponentIds, /case LINK = 1/)
  assert.match(kotlinComponentIds, /const val TEXT = 0/)
  assert.match(kotlinComponentIds, /const val BOX = 1/)

  const tsShortNames = fs.readFileSync(path.join(paths.tsCorePayloadOutputDir, 'short-names.ts'), 'utf-8')
  const swiftShortNames = fs.readFileSync(path.join(paths.swiftSharedOutputDir, 'ShortNames.swift'), 'utf-8')
  const kotlinShortNames = fs.readFileSync(path.join(paths.kotlinGeneratedDir, 'ShortNames.kt'), 'utf-8')

  assert.match(tsShortNames, /'backgroundColor': 'bg'/)
  assert.match(tsShortNames, /'contentAlignment': 'ca'/)
  assert.match(swiftShortNames, /"bg": "backgroundColor"/)
  assert.match(swiftShortNames, /"ca": "contentAlignment"/)
  assert.match(kotlinShortNames, /"bg" to "backgroundColor"/)
  assert.match(kotlinShortNames, /"ca" to "contentAlignment"/)

  assert.deepEqual(formatCalls, [{ scriptName: 'format:js:fix', stepLabel: '8' }])
  assert.deepEqual(workspaceFormatCalls, [
    { scriptName: 'format:kotlin:fix', workspace: '@use-voltra/android-client', stepLabel: '9' },
    { scriptName: 'format:swift:fix', workspace: '@use-voltra/ios-client', stepLabel: '10' },
  ])
  assert.match(entries.map((entry) => entry.text).join('\n'), /Generation complete/)
})
