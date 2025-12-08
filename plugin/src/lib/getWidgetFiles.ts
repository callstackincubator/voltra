import * as fs from 'fs'
import * as path from 'path'

export type WidgetFiles = {
  swiftFiles: string[]
  entitlementFiles: string[]
  plistFiles: string[]
  assetDirectories: string[]
  intentFiles: string[]
  otherFiles: string[]
}

const MAX_IMAGE_SIZE_BYTES = 4096 // 4KB limit for Live Activities

function validateLiveActivityImageSize(imagePath: string, fileName: string): void {
  const stats = fs.statSync(imagePath)
  const imageSizeInBytes = stats.size

  if (imageSizeInBytes >= MAX_IMAGE_SIZE_BYTES) {
    throw new Error(
      `Live Activity image size limit exceeded: ${fileName} is ${imageSizeInBytes} bytes (${(imageSizeInBytes / 1024).toFixed(2)}KB). ` +
        `Live Activity images must be less than 4KB (4096 bytes).`
    )
  }
}

export function getWidgetFiles(targetPath: string) {
  let packagePath: string | undefined
  try {
    packagePath = path.dirname(require.resolve('voltra/package.json'))
  } catch {
    console.log('Building for example app')
  }
  // Determine package root: if require.resolve failed, compute from plugin build directory
  const fallbackRoot = path.resolve(__dirname, '..', '..', '..')
  const baseRoot = packagePath ?? fallbackRoot
  const liveActivityFilesPath = path.join(baseRoot, 'ios-files')
  const imageAssetsPath = './assets/voltra'

  const widgetFiles: WidgetFiles = {
    swiftFiles: [],
    entitlementFiles: [],
    plistFiles: [],
    assetDirectories: [],
    intentFiles: [],
    otherFiles: [],
  }

  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true })
  }

  if (fs.lstatSync(liveActivityFilesPath).isDirectory()) {
    const files = fs.readdirSync(liveActivityFilesPath)

    files.forEach((file) => {
      const itemPath = path.join(liveActivityFilesPath, file)

      // Handle directories (Assets.xcassets)
      if (fs.lstatSync(itemPath).isDirectory()) {
        if (file === 'Assets.xcassets') {
          widgetFiles.assetDirectories.push(file)
        }
        return
      }

      const fileExtension = file.split('.').pop()

      if (fileExtension === 'entitlements') {
        widgetFiles.entitlementFiles.push(file)
      } else if (fileExtension === 'plist') {
        widgetFiles.plistFiles.push(file)
      } else if (fileExtension === 'intentdefinition') {
        widgetFiles.intentFiles.push(file)
      } else if (fileExtension === 'swift') {
        widgetFiles.swiftFiles.push(file)
      }
    })
  }

  ;[
    ...widgetFiles.swiftFiles,
    ...widgetFiles.entitlementFiles,
    ...widgetFiles.plistFiles,
    ...widgetFiles.intentFiles,
    ...widgetFiles.otherFiles,
  ].forEach((file) => {
    const source = path.join(liveActivityFilesPath, file)
    copyFileSync(source, targetPath)
  })

  // Copy assets directory
  const imagesXcassetsSource = path.join(liveActivityFilesPath, 'Assets.xcassets')
  if (fs.existsSync(imagesXcassetsSource)) {
    copyFolderRecursiveSync(imagesXcassetsSource, targetPath)
  }

  // Move images to assets directory
  if (fs.existsSync(imageAssetsPath) && fs.lstatSync(imageAssetsPath).isDirectory()) {
    const imagesXcassetsTarget = path.join(targetPath, 'Assets.xcassets')

    const files = fs.readdirSync(imageAssetsPath)

    files.forEach((file) => {
      if (path.extname(file).match(/\.(png|jpg|jpeg)$/)) {
        const source = path.join(imageAssetsPath, file)

        validateLiveActivityImageSize(source, file)

        const imageSetDir = path.join(imagesXcassetsTarget, `${path.basename(file, path.extname(file))}.imageset`)

        // Create the .imageset directory if it doesn't exist
        if (!fs.existsSync(imageSetDir)) {
          fs.mkdirSync(imageSetDir, { recursive: true })
        }

        // Copy image file to the .imageset directory
        const destPath = path.join(imageSetDir, file)
        fs.copyFileSync(source, destPath)

        // Create Contents.json file
        const contentsJson = {
          images: [
            {
              filename: file,
              idiom: 'universal',
            },
          ],
          info: {
            author: 'xcode',
            version: 1,
          },
        }

        fs.writeFileSync(path.join(imageSetDir, 'Contents.json'), JSON.stringify(contentsJson, null, 2))
      }
    })
  } else {
    console.warn(
      `Warning: Skipping adding images to widget extension because directory does not exist at path: ${imageAssetsPath}`
    )
  }

  return widgetFiles
}

export function copyFileSync(source: string, target: string) {
  let targetFile = target

  if (fs.existsSync(target) && fs.lstatSync(target).isDirectory()) {
    targetFile = path.join(target, path.basename(source))
  }

  fs.writeFileSync(targetFile, fs.readFileSync(source))
}

function copyFolderRecursiveSync(source: string, target: string) {
  const targetPath = path.join(target, path.basename(source))
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true })
  }

  if (fs.lstatSync(source).isDirectory()) {
    const files = fs.readdirSync(source)
    files.forEach((file) => {
      const currentPath = path.join(source, file)
      if (fs.lstatSync(currentPath).isDirectory()) {
        copyFolderRecursiveSync(currentPath, targetPath)
      } else {
        // Validate image size for Live Activities (must be less than 4KB)
        const fileExtension = path.extname(file).toLowerCase()
        if (fileExtension.match(/\.(png|jpg|jpeg)$/)) {
          validateLiveActivityImageSize(currentPath, file)
        }
        copyFileSync(currentPath, targetPath)
      }
    })
  }
}
