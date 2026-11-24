import Foundation

/// One choice of a `dynamicOptions` Edit Widget parameter: `value` reaches the widget as
/// `env.configuration[parameter]` and fills `{parameter}` in its `serverUpdate` URL, `title` is what
/// the Edit Widget sheet lists.
public struct WidgetParameterOption: Codable, Equatable, Sendable {
  public let value: String
  public let title: String

  public init(value: String, title: String) {
    self.value = value
    self.title = title
  }
}
