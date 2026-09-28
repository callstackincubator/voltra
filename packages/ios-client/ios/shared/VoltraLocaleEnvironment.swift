import Foundation

/// The locale and formatting fields of `WidgetEnvironment` (ADR 0009 §1), captured once per render
/// and shared by the Dynamic Widget and Dynamic Live Activity env builders so both hand JS the same
/// shape.
///
/// Foundation-only on purpose: the SwiftUI views pass `\.layoutDirection` in as a plain `Bool`, so
/// the mapping stays testable without a simulator.
public struct VoltraLocaleEnvironment: Hashable {
  /// BCP-47 tag with Unicode extensions (`pl-PL`, `en-US-u-hc-h23`). Never the ICU `pl_PL` form,
  /// which `Intl` rejects with a `RangeError`.
  public let locale: String
  /// `Locale.preferredLanguages`: the user's list, independent of the extension bundle.
  public let preferredLanguages: [String]
  /// The tag the app stored with `setDynamicWidgetLocale`, if any.
  public let appLocale: String?
  /// `"ltr"` or `"rtl"`.
  public let layoutDirection: String
  /// `"h12"` or `"h23"`.
  public let hourCycle: String
  public let timeZone: String
  /// `"metric"`, `"us"` or `"uk"`.
  public let measurementSystem: String?
  /// Unicode calendar identifier as `Intl` spells it (`gregory`, not `gregorian`).
  public let calendar: String?
  /// 1 = Sunday … 7 = Saturday.
  public let firstDayOfWeek: Int?

  public init(
    locale: String,
    preferredLanguages: [String],
    appLocale: String?,
    layoutDirection: String,
    hourCycle: String,
    timeZone: String,
    measurementSystem: String?,
    calendar: String?,
    firstDayOfWeek: Int?
  ) {
    self.locale = locale
    self.preferredLanguages = preferredLanguages
    self.appLocale = appLocale
    self.layoutDirection = layoutDirection
    self.hourCycle = hourCycle
    self.timeZone = timeZone
    self.measurementSystem = measurementSystem
    self.calendar = calendar
    self.firstDayOfWeek = firstDayOfWeek
  }

  /// Captures the environment for `locale`, the SwiftUI `\.locale` of the view being drawn.
  ///
  /// - Parameters:
  ///   - isRightToLeft: SwiftUI's `\.layoutDirection == .rightToLeft`; `nil` outside a view body
  ///     (the server-update trial render), in which case the locale's script direction is used.
  ///   - appLocale: the app's override from the App Group, read by the caller.
  public static func capture(
    locale: Locale,
    isRightToLeft: Bool? = nil,
    appLocale: String? = nil,
    preferredLanguages: [String] = Locale.preferredLanguages,
    timeZone: TimeZone = .current
  ) -> VoltraLocaleEnvironment {
    let rtl = isRightToLeft ?? (locale.language.characterDirection == .rightToLeft)
    return VoltraLocaleEnvironment(
      locale: bcp47(locale),
      preferredLanguages: preferredLanguages,
      appLocale: appLocale.flatMap { $0.isEmpty ? nil : $0 },
      layoutDirection: rtl ? "rtl" : "ltr",
      hourCycle: hourCycle(locale.hourCycle),
      timeZone: timeZone.identifier,
      measurementSystem: measurementSystem(locale.measurementSystem),
      calendar: calendarIdentifier((locale as NSLocale).calendarIdentifier),
      firstDayOfWeek: firstDayOfWeek(locale)
    )
  }

  // MARK: - Mapping

  public static func bcp47(_ locale: Locale) -> String {
    locale.identifier(.bcp47)
  }

  /// `Locale.hourCycle` already reflects the user's 24-Hour Time override on the current locale.
  static func hourCycle(_ cycle: Locale.HourCycle) -> String {
    switch cycle {
    case .zeroToEleven, .oneToTwelve:
      return "h12"
    default:
      return "h23"
    }
  }

  static func measurementSystem(_ system: Locale.MeasurementSystem) -> String {
    if system == .us {
      return "us"
    }
    if system == .uk {
      return "uk"
    }
    return "metric"
  }

  /// Foundation spells CLDR calendar types the long way; `Intl` and BCP-47 use the short keys.
  static func calendarIdentifier(_ foundationIdentifier: String) -> String? {
    if foundationIdentifier.isEmpty {
      return nil
    }
    switch foundationIdentifier {
    case "gregorian":
      return "gregory"
    case "ethiopic-amete-alem":
      return "ethioaa"
    default:
      return foundationIdentifier
    }
  }

  static func firstDayOfWeek(_ locale: Locale) -> Int? {
    var calendar = Calendar(identifier: .gregorian)
    calendar.locale = locale
    let weekday = calendar.firstWeekday
    return (1 ... 7).contains(weekday) ? weekday : nil
  }

  // MARK: - JSON

  /// The fields as `"key": value` pairs, one per line, for splicing into a hand-rolled env JSON
  /// object. Absent optionals are left out so they read as `undefined` in JS.
  public var jsonFields: String {
    var fields: [String] = [
      "\"locale\": \(Self.jsonString(locale))",
      "\"preferredLanguages\": [\(preferredLanguages.map(Self.jsonString).joined(separator: ", "))]",
    ]
    if let appLocale {
      fields.append("\"appLocale\": \(Self.jsonString(appLocale))")
    }
    fields.append("\"layoutDirection\": \(Self.jsonString(layoutDirection))")
    fields.append("\"hourCycle\": \(Self.jsonString(hourCycle))")
    fields.append("\"timeZone\": \(Self.jsonString(timeZone))")
    if let measurementSystem {
      fields.append("\"measurementSystem\": \(Self.jsonString(measurementSystem))")
    }
    if let calendar {
      fields.append("\"calendar\": \(Self.jsonString(calendar))")
    }
    if let firstDayOfWeek {
      fields.append("\"firstDayOfWeek\": \(firstDayOfWeek)")
    }
    return fields.joined(separator: ",\n  ")
  }

  /// The same fields for `JSONSerialization`-based builders.
  public var dictionary: [String: Any] {
    var values: [String: Any] = [
      "locale": locale,
      "preferredLanguages": preferredLanguages,
      "layoutDirection": layoutDirection,
      "hourCycle": hourCycle,
      "timeZone": timeZone,
    ]
    if let appLocale {
      values["appLocale"] = appLocale
    }
    if let measurementSystem {
      values["measurementSystem"] = measurementSystem
    }
    if let calendar {
      values["calendar"] = calendar
    }
    if let firstDayOfWeek {
      values["firstDayOfWeek"] = firstDayOfWeek
    }
    return values
  }

  static func jsonString(_ value: String) -> String {
    let escaped = value
      .replacingOccurrences(of: "\\", with: "\\\\")
      .replacingOccurrences(of: "\"", with: "\\\"")
      .replacingOccurrences(of: "\n", with: "\\n")
      .replacingOccurrences(of: "\r", with: "\\r")
    return "\"\(escaped)\""
  }
}
