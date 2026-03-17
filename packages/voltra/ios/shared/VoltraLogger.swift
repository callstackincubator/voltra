import os

/// Centralized loggers for the Voltra module.
///
/// Each category maps to a distinct domain of concern so logs can be filtered
/// independently in Console.app or via `log stream --predicate 'subsystem == "com.voltra"'`.
enum VoltraLogger {
  private static let subsystem = "com.voltra"

  /// Expo module boundary (JS → native calls, error remapping)
  static let module = Logger(subsystem: subsystem, category: "module")

  /// Widget data, timelines, server credentials, WidgetCenter reloads
  static let widget = Logger(subsystem: subsystem, category: "widget")

  /// Live Activity lifecycle (create, update, end, reload)
  static let activity = Logger(subsystem: subsystem, category: "liveActivity")

  /// Image preloading and the shared image store
  static let image = Logger(subsystem: subsystem, category: "image")

  /// VoltraEventBus and VoltraPersistentEventQueue
  static let event = Logger(subsystem: subsystem, category: "event")

  /// Keychain reads and writes
  static let keychain = Logger(subsystem: subsystem, category: "keychain")

  /// UserDefaults / shared storage (VoltraWidgetDefaults)
  static let storage = Logger(subsystem: subsystem, category: "storage")
}
