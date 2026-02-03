#!/usr/bin/env node
/* eslint-env node */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const readline = require('readline')

const packageJsonPath = path.join(process.cwd(), 'package.json')

if (!fs.existsSync(packageJsonPath)) {
  console.error('Error: package.json not found')
  process.exit(1)
}

// Read package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
const currentVersion = packageJson.version

const restoreVersion = () => {
  packageJson.version = currentVersion
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n')
  console.log(`✓ Restored package.json version to ${currentVersion}`)
}

// Generate timestamp
const timestamp = Date.now()
const canaryVersion = `${currentVersion}-canary.${timestamp}`

console.log(`Current version: ${currentVersion}`)
console.log(`Canary version: ${canaryVersion}`)

// Update package.json version
packageJson.version = canaryVersion
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n')
console.log(`✓ Updated package.json version to ${canaryVersion}`)

// Ask for OTP
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

rl.question('Enter OTP for npm publish: ', (otp) => {
  rl.close()

  if (!otp || otp.trim() === '') {
    console.error('Error: OTP is required')
    restoreVersion()
    process.exit(1)
  }

  try {
    console.log('Publishing canary release...')
    execSync(`npm publish --tag canary --otp ${otp.trim()}`, {
      stdio: 'inherit',
    })
    console.log(`✓ Successfully published ${canaryVersion} with tag 'canary'`)
    restoreVersion()
  } catch (error) {
    console.error('Error publishing:', error.message)
    restoreVersion()
    process.exit(1)
  }
})
