import Foundation

/// Error types for payload migration
public enum VoltraPayloadError: Error {
  case missingVersion
  case invalidPayloadStructure
}

/// Protocol for migrating payloads from one version to the next
public protocol VoltraPayloadMigration {
  /// The source version this migration upgrades FROM
  static var fromVersion: Int { get }

  /// The target version this migration upgrades TO
  static var toVersion: Int { get }

  /// Migrate the raw JSON from the source version to the target version
  static func migrate(_ json: JSONValue) throws -> JSONValue
}

/// Manages payload version migrations
public enum VoltraPayloadMigrator {
  /// Current (latest) payload version
  public static let currentVersion = 1

  /// Registered migrations, keyed by source version
  /// When adding a new version:
  /// 1. Increment currentVersion
  /// 2. Add migration: [oldVersion: VOldToVNewMigration.self]
  private static let migrations: [Int: any VoltraPayloadMigration.Type] = [:
    // Empty for v1, add as needed:
    // 1: V1ToV2Migration.self,
  ]

  /// Migrate a payload to the current version
  /// - Parameter json: The raw parsed JSON payload
  /// - Returns: Migrated JSON, or nil if version is unsupported (future version)
  public static func migrateToCurrentVersion(_ json: JSONValue) throws -> JSONValue? {
    guard let version = json["v"]?.intValue else {
      throw VoltraPayloadError.missingVersion
    }

    // Future version we don't understand - silently ignore
    if version > currentVersion {
      return nil
    }

    var currentJson = json
    var currentVer = version

    // Apply migrations sequentially until we reach the current version
    while currentVer < currentVersion {
      guard let migration = migrations[currentVer] else {
        // Gap in migration chain - shouldn't happen if migrations are maintained properly
        return nil
      }
      currentJson = try migration.migrate(currentJson)
      currentVer = migration.toVersion
    }

    return currentJson
  }
}
