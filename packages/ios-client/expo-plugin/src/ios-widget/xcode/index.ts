import { ConfigPlugin, withXcodeProject, XcodeProject } from '@expo/config-plugins'
import * as path from 'path'

import type { IOSWidgetConfig, IOSWidgetExtensionFiles } from '../../types'
import { getIOSWidgetExtensionFiles } from '../../utils/fileDiscovery'
import { detectClientRenderedWidgets } from '../clientRendered'
import { ensureBuildPhases, ensureWidgetBundleScriptPhase } from './buildPhases'
import { ensureXCConfigurationList } from './configurationList'
import { ensurePbxGroup } from './groups'
import { getMainAppTargetSettings } from './mainAppSettings'
import { ensureProductFile } from './productFile'
import { createTargetSkeleton, ensureTargetAttributes, ensureTargetDependency } from './target'

export interface ConfigureXcodeProjectProps {
  targetName: string
  bundleIdentifier: string
  deploymentTarget: string
  widgets?: IOSWidgetConfig[]
}

/**
 * Applies all widget-extension changes to an already-parsed Xcode project.
 *
 * This is the pure core of {@link configureXcodeProject}: it takes the parsed project, the plugin
 * props, the discovered widget files, and whether any widget is client-rendered, then mutates the
 * project in place. It performs no filesystem or `modRequest` access, which makes it directly
 * testable against pbxproj fixtures.
 *
 * When the widget target does not exist yet, the minimal native-target skeleton is created first
 * (targets cannot be "ensured" into existence); every other object is then reconciled by the same
 * idempotent ensure pipeline that runs for an already-existing target.
 */
export function applyXcodeChanges(
  xcodeProject: XcodeProject,
  props: ConfigureXcodeProjectProps,
  widgetFiles: IOSWidgetExtensionFiles,
  hasClientRenderedWidgets = false
): void {
  const { targetName, bundleIdentifier, deploymentTarget } = props
  const groupName = 'Embed Foundation Extensions'

  // Read main app target settings to synchronize code signing (per configuration).
  const mainAppSettings = getMainAppTargetSettings(xcodeProject)

  // Use the deploymentTarget from plugin config (or default), ignore main app's deployment target.
  // This allows the widget extension to have its own deployment target independent of the main app.

  // Resolve (or create) the widget target. A target cannot be reconciled into existence, so the
  // absent case creates the minimal skeleton; from here on both paths share one pipeline.
  let targetUuid = xcodeProject.findTargetKey(targetName)
  if (!targetUuid) {
    targetUuid = xcodeProject.generateUuid()
    createTargetSkeleton(xcodeProject, { targetName, targetUuid })
  }
  const target = xcodeProject.pbxNativeTargetSection()[targetUuid]

  // Ensure the configuration list is present and its settings are in sync.
  const xCConfigurationList = ensureXCConfigurationList(
    xcodeProject,
    {
      targetName,
      bundleIdentifier,
      deploymentTarget,
      mainAppSettings,
    },
    target.buildConfigurationList
  )

  // Ensure the product file (.appex) exists.
  const productFile = ensureProductFile(xcodeProject, {
    targetName,
    groupName,
  })

  // Point the target at the reconciled configuration list and product file.
  target.productReference = productFile.fileRef
  target.buildConfigurationList = xCConfigurationList.uuid
  target.productType = `"com.apple.product-type.app-extension"`
  target.name = targetName
  target.productName = targetName
  if (!target.buildPhases) {
    target.buildPhases = []
  }

  // Ensure the group first so the widget's file references exist before the build phases
  // reference them (the phases resolve files through the widget-scoped group).
  ensurePbxGroup(xcodeProject, {
    targetName,
    widgetFiles,
  })

  // Ensure build phases and their files.
  ensureBuildPhases(xcodeProject, {
    targetUuid,
    targetName,
    groupName,
    productFile,
    widgetFiles,
    mainTargetUuid: xcodeProject.getFirstTarget().uuid,
  })

  if (hasClientRenderedWidgets) {
    ensureWidgetBundleScriptPhase(xcodeProject, targetUuid)
  }

  ensureTargetAttributes(xcodeProject, targetUuid)
  ensureTargetDependency(xcodeProject, targetUuid)
}

/**
 * Plugin step that configures the Xcode project for the widget extension.
 *
 * This:
 * - Adds XCConfigurationList with Debug/Release configurations
 * - Adds the product file (.appex)
 * - Configures the native target
 * - Adds build phases (Sources, CopyFiles, Frameworks, Resources)
 * - Adds PBXGroup for widget files
 *
 * This should run after generateWidgetExtensionFiles so the files exist. The wrapper is kept thin:
 * it discovers widget files and detects client-rendered widgets, then delegates the actual pbxproj
 * mutation to {@link applyXcodeChanges}.
 */
export const configureXcodeProject: ConfigPlugin<ConfigureXcodeProjectProps> = (config, props) => {
  const { targetName, widgets } = props

  return withXcodeProject(config, (config) => {
    if (config.modRequest.introspect) {
      return config
    }

    const xcodeProject = config.modResults

    // The release widget-bundling phase is only needed when a widget is a Dynamic Widget (server
    // widgets carry no JS bundle). Detect once so both the create and update paths agree.
    const hasClientRenderedWidgets =
      !!widgets &&
      detectClientRenderedWidgets(widgets, config.modRequest.projectRoot).some((widget) => widget.clientRendered)

    const { platformProjectRoot } = config.modRequest
    const targetPath = path.join(platformProjectRoot, targetName)
    const widgetFiles = getIOSWidgetExtensionFiles(targetPath, targetName)

    applyXcodeChanges(xcodeProject, props, widgetFiles, hasClientRenderedWidgets)

    return config
  })
}
