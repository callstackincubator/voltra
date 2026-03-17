import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const packageDirArg = process.argv[2]

if (!packageDirArg) {
  console.error('Usage: node scripts/build-package.mjs <package-dir>')
  process.exit(1)
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..')
const packageDir = path.resolve(repoRoot, packageDirArg)
const buildDir = path.join(packageDir, 'build')
const tscBinary = path.join(repoRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc')

const tscConfigs = ['tsconfig.esm.json', 'tsconfig.cjs.json', 'tsconfig.types.json']

function runTsc(configFile) {
  return new Promise((resolve, reject) => {
    const child = spawn(tscBinary, ['-p', configFile], {
      cwd: packageDir,
      stdio: 'inherit',
      env: process.env,
    })

    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`tsc failed for ${path.join(packageDirArg, configFile)} with exit code ${code ?? 'unknown'}`))
    })
  })
}

async function writeModuleTypePackageJson(dirName, type) {
  const targetDir = path.join(buildDir, dirName)
  await fs.mkdir(targetDir, { recursive: true })
  await fs.writeFile(path.join(targetDir, 'package.json'), `${JSON.stringify({ type }, null, 2)}\n`)
}

async function main() {
  await fs.rm(buildDir, { recursive: true, force: true })

  await Promise.all(tscConfigs.map((configFile) => runTsc(configFile)))

  await Promise.all([writeModuleTypePackageJson('esm', 'module'), writeModuleTypePackageJson('cjs', 'commonjs')])
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
