import { ConfigPlugin, withXcodeProject, XcodeProject } from '@expo/config-plugins'
import * as path from 'path'

import type { IOSWidgetConfig, IOSWidgetExtensionFiles } from '../../types'
import { getIOSWidgetExtensionFiles } from '../../utils/fileDiscovery'
import { detectClientRenderedWidgets } from '../clientRendered'
import { addBuildPhases, ensureBuildPhases, ensureWidgetBundleScriptPhase } from './buildPhases'
import { addXCConfigurationList, ensureXCConfigurationList } from './configurationList'
import { addPbxGroup, ensurePbxGroup } from './groups'
import { getMainAppTargetSettings } from './mainAppSettings'
import { addProductFile, ensureProductFile } from './productFile'
import { configureTarget, ensureTargetAttributes, ensureTargetDependency } from './target'

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
 * It either creates the widget extension target (and all its build phases, product file and group)
 * or, when the target already exists, reconciles it idempotently.
 */
export function applyXcodeChanges(
  xcodeProject: XcodeProject,
  props: ConfigureXcodeProjectProps,
  widgetFiles: IOSWidgetExtensionFiles,
  hasClientRenderedWidgets = false
): void {
  const { targetName, bundleIdentifier, deploymentTarget } = props
  const groupName = 'Embed Foundation Extensions'

  // Check if target already exists
  const nativeTargets = xcodeProject.pbxNativeTargetSection()
  const existingTargetKey = xcodeProject.findTargetKey(targetName)
  const existingTarget = existingTargetKey ? nativeTargets[existingTargetKey] : null

  // Read main app target settings to synchronize code signing
  const mainAppSettings = getMainAppTargetSettings(xcodeProject)

  // Use the deploymentTarget from plugin config (or default), ignore main app's deployment target
  // This allows the widget extension to have its own deployment target independent of the main app

  if (existingTarget && existingTargetKey) {
    // Ensure configuration list is up to date
    const xCConfigurationList = ensureXCConfigurationList(
      xcodeProject,
      {
        targetName,
        bundleIdentifier,
        deploymentTarget,
        codeSignStyle: mainAppSettings?.codeSignStyle,
        developmentTeam: mainAppSettings?.developmentTeam,
        provisioningProfileSpecifier: mainAppSettings?.provisioningProfileSpecifier,
      },
      existingTarget.buildConfigurationList
    )

    // Ensure product file exists
    const productFile = ensureProductFile(xcodeProject, {
      targetName,
      groupName,
    })

    // Update target references
    existingTarget.productReference = productFile.fileRef
    existingTarget.buildConfigurationList = xCConfigurationList.uuid
    existingTarget.productType = `"com.apple.product-type.app-extension"`
    existingTarget.name = targetName
    existingTarget.productName = targetName
    if (!existingTarget.buildPhases) {
      existingTarget.buildPhases = []
    }

    // Ensure the group first so the widget's file references exist before the build phases
    // reference them (the phases resolve files through the widget-scoped group).
    ensurePbxGroup(xcodeProject, {
      targetName,
      widgetFiles,
    })

    // Ensure build phases and files
    ensureBuildPhases(xcodeProject, {
      targetUuid: existingTargetKey,
      targetName,
      groupName,
      productFile,
      widgetFiles,
      mainTargetUuid: xcodeProject.getFirstTarget().uuid,
    })

    if (hasClientRenderedWidgets) {
      ensureWidgetBundleScriptPhase(xcodeProject, existingTargetKey)
    }

    ensureTargetAttributes(xcodeProject, existingTargetKey)
    ensureTargetDependency(xcodeProject, existingTargetKey)

    return
  }

  // Add configuration list
  const targetUuid = xcodeProject.generateUuid()

  const xCConfigurationList = addXCConfigurationList(xcodeProject, {
    targetName,
    bundleIdentifier,
    deploymentTarget,
    codeSignStyle: mainAppSettings?.codeSignStyle,
    developmentTeam: mainAppSettings?.developmentTeam,
    provisioningProfileSpecifier: mainAppSettings?.provisioningProfileSpecifier,
  })

  // Add product file
  const productFile = addProductFile(xcodeProject, {
    targetName,
    groupName,
  })

  // Configure target (native target, project section, dependency)
  configureTarget(xcodeProject, {
    targetName,
    targetUuid,
    productFile,
    xCConfigurationList,
  })

  // Add PBX group first so the widget's file references exist before the build phases reference
  // them (the phases resolve files through the widget-scoped group).
  addPbxGroup(xcodeProject, {
    targetName,
    widgetFiles,
  })

  // Add build phases
  addBuildPhases(xcodeProject, {
    targetUuid,
    targetName,
    groupName,
    productFile,
    widgetFiles,
  })

  if (hasClientRenderedWidgets) {
    ensureWidgetBundleScriptPhase(xcodeProject, targetUuid)
  }
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
