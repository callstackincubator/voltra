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
        "VoltraConfig.swift",
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
        "JSONValue.swift",
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
  ]
)
