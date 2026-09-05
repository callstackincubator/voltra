// swift-tools-version: 5.9
import PackageDescription

let package = Package(
  name: "VoltraNativeTests",
  platforms: [
    .iOS(.v16),
    .macOS(.v13),
  ],
  products: [
    .library(
      name: "VoltraSharedCore",
      targets: ["VoltraSharedCore"]
    ),
    .library(
      name: "VoltraStyleCore",
      targets: ["VoltraStyleCore"]
    ),
  ],
  targets: [
    .target(
      name: "VoltraSharedCore",
      path: "shared",
      exclude: [
        "BrotliCompression.swift",
        "Data+hexString.swift",
        "Date+toTimerInterval.swift",
        "ShortNames.swift",
        "VoltraAttributes.swift",
        "VoltraElement.swift",
        "VoltraEvent.swift",
        "VoltraEventBus.swift",
        "VoltraImageStore.swift",
        "VoltraInteractionIntent.swift",
        "VoltraLiveActivityPayload.swift",
        "VoltraNode.swift",
        "VoltraPersistentEventQueue.swift",
      ],
      sources: [
        "DynamicWidgetPropsCodec.swift",
        "DynamicWidgetPropsStorage.swift",
        "DynamicWidgetPropsStore.swift",
        "DynamicWidgetRenderCoordinator.swift",
        "DynamicWidgetUpdater.swift",
        "ServerWidgetContentResolver.swift",
        "ServerWidgetResponseStore.swift",
        // The settings stack's pure half. The Keychain-, Bundle- and URLSession-backed files in
        // this folder are compiled only by the podspec, which ships the whole tree.
        "WidgetServer/WidgetScope.swift",
        "WidgetServer/WidgetServerUpdateSettings.swift",
        "WidgetServer/WidgetServerSettingsResolver.swift",
        "WidgetServer/WidgetServerSettingsCodec.swift",
        "WidgetServer/WidgetServerSettingsValidator.swift",
        "WidgetServer/WidgetServerRequestBuilder.swift",
        "WidgetServer/WidgetServerFetcher.swift",
        "WidgetServer/WidgetServerSettingsStore.swift",
        "WidgetServer/WidgetServerEtagStore.swift",
        "WidgetServer/VoltraKeychainHelper.swift",
        "WidgetServer/VoltraWidgetServer.swift",
        "VoltraLogger.swift",
        "dynamic-live-activity/VoltraDynamicLiveActivityTypes.swift",
        "dynamic-live-activity/VoltraDynamicLiveActivityPayloadValidator.swift",
        "dynamic-live-activity/VoltraDynamicLiveActivityRenderFailureQueue.swift",
        "dynamic-live-activity/VoltraLiveActivityOrder.swift",
        "JSONValue.swift",
        "VoltraConfig.swift",
        "VoltraConstants.swift",
        "VoltraPayloadMigrator.swift",
        "VoltraRegion.swift",
        "ComponentTypeID.swift",
      ]
    ),
    .testTarget(
      name: "VoltraSharedTests",
      dependencies: ["VoltraSharedCore"],
      path: "Tests/VoltraSharedTests"
    ),
    .target(
      name: "VoltraStyleCore",
      path: "ui",
      sources: [
        "Style/BackgroundValue.swift",
        "Style/JSColorParser.swift",
        "Style/JSGradientParser.swift",
      ]
    ),
    .testTarget(
      name: "VoltraStyleTests",
      dependencies: ["VoltraStyleCore"],
      path: "tests",
      sources: ["JSGradientParserTests.swift"]
    ),
  ]
)
