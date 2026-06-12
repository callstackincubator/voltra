import { ConfigPlugin, withXcodeProject } from '@expo/config-plugins'
import * as path from 'path'

import type { IOSWidgetConfig } from '../../types'
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
 * Plugin step that configures the Xcode project for the widget extension.
 *
 * This:
 * - Adds XCConfigurationList with Debug/Release configurations
 * - Adds the product file (.appex)
 * - Configures the native target
 * - Adds build phases (Sources, CopyFiles, Frameworks, Resources)
 * - Adds PBXGroup for widget files
 *
 * This should run after generateWidgetExtensionFiles so the files exist.
 */
export const configureXcodeProject: ConfigPlugin<ConfigureXcodeProjectProps> = (config, props) => {
  const { targetName, bundleIdentifier, deploymentTarget, widgets } = props

  return withXcodeProject(config, (config) => {
    if (config.modRequest.introspect) {
      return config
    }

    const xcodeProject = config.modResults
    const groupName = 'Embed Foundation Extensions'

    // The release widget-bundling phase is only needed when a widget is client-rendered (server
    // widgets carry no JS bundle). Detect once so both the create and update paths agree.
    const hasClientRenderedWidgets =
      !!widgets &&
      detectClientRenderedWidgets(widgets, config.modRequest.projectRoot).some((widget) => widget.clientRendered)

    // Check if target already exists
    const nativeTargets = xcodeProject.pbxNativeTargetSection()
    const existingTargetKey = xcodeProject.findTargetKey(targetName)
    const existingTarget = existingTargetKey ? nativeTargets[existingTargetKey] : null

    const { platformProjectRoot } = config.modRequest
    const targetPath = path.join(platformProjectRoot, targetName)
    const widgetFiles = getIOSWidgetExtensionFiles(targetPath, targetName)

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

      // Ensure build phases and groups
      ensureBuildPhases(xcodeProject, {
        targetUuid: existingTargetKey,
        groupName,
        productFile,
        widgetFiles,
        mainTargetUuid: xcodeProject.getFirstTarget().uuid,
      })

      if (hasClientRenderedWidgets) {
        ensureWidgetBundleScriptPhase(xcodeProject, existingTargetKey)
      }

      ensurePbxGroup(xcodeProject, {
        targetName,
        widgetFiles,
      })

      ensureTargetAttributes(xcodeProject, existingTargetKey)
      ensureTargetDependency(xcodeProject, existingTargetKey)

      return config
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

    // Add build phases
    addBuildPhases(xcodeProject, {
      targetUuid,
      groupName,
      productFile,
      widgetFiles,
    })

    if (hasClientRenderedWidgets) {
      ensureWidgetBundleScriptPhase(xcodeProject, targetUuid)
    }

    // Add PBX group
    addPbxGroup(xcodeProject, {
      targetName,
      widgetFiles,
    })

    return config
  })
}
