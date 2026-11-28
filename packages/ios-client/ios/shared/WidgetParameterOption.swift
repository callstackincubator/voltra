import Foundation

/// One choice of a `dynamicOptions` Edit Widget parameter: `value` reaches the widget as
/// `env.configuration[parameter]`, `title` is what the Edit Widget sheet lists.
public struct WidgetParameterOption: Codable, Equatable, Sendable {
  public let value: String
  public let title: String

  public init(value: String, title: String) {
    self.value = value
    self.title = title
  }
}

/// Why `setWidgetParameterOptions` cannot store choices for a widget's parameter. The bridge turns
/// each `errorCode` into the matching `VOLTRA_WIDGET_*` promise code (NativeVoltra.mm).
public enum WidgetParameterOptionsTargetError: Error, Equatable, CustomNSError {
  case widgetNotFound(widgetId: String)
  case kindMismatch(widgetId: String)
  case parameterNotDeclared(widgetId: String, parameter: String)

  public static let errorDomain = "com.callstack.voltra.widgetParameterOptions"

  public var errorCode: Int {
    switch self {
    case .widgetNotFound: 1
    case .kindMismatch: 2
    case .parameterNotDeclared: 3
    }
  }

  public var errorUserInfo: [String: Any] {
    let message = switch self {
    case let .widgetNotFound(widgetId):
      "Widget '\(widgetId)' is not one of this app's widgets."
    case let .kindMismatch(widgetId):
      "Widget '\(widgetId)' is a payload-driven widget and has no configuration. setWidgetParameterOptions only applies to Dynamic Widgets."
    case let .parameterNotDeclared(widgetId, parameter):
      "Widget '\(widgetId)' declares no appIntent parameter '\(parameter)' with dynamicOptions: true."
    }
    return [NSLocalizedDescriptionKey: message]
  }

  /// nil when [widgetId] is one of [widgetIds], a Dynamic Widget in [dynamicWidgetParameters], and
  /// declares [parameter] with `dynamicOptions: true`.
  public static func check(
    widgetId: String,
    parameter: String,
    widgetIds: [String],
    dynamicWidgetParameters: [String: [String]]
  ) -> WidgetParameterOptionsTargetError? {
    guard widgetIds.contains(widgetId) else { return .widgetNotFound(widgetId: widgetId) }
    guard let declared = dynamicWidgetParameters[widgetId] else { return .kindMismatch(widgetId: widgetId) }
    guard declared.contains(parameter) else {
      return .parameterNotDeclared(widgetId: widgetId, parameter: parameter)
    }
    return nil
  }
}
