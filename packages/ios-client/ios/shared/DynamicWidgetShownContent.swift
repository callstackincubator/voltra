/// What a Dynamic Widget draws, given how its render went (ADR 0013 §3).
///
/// | Build   | Render succeeds | Render fails                                                    |
/// | ------- | --------------- | --------------------------------------------------------------- |
/// | Dev     | the node        | the dev error view, even when a last good render exists         |
/// | Release | the node        | the last good render, else the placeholder, else the spinner    |
public enum DynamicWidgetShownContent<Node> {
  case node(Node)
  case devError(DynamicWidgetRenderFailure)
  case lastGood(Node)
  case placeholder(Node)
  case loading

  public static func resolve(
    isDev: Bool,
    result: Result<Node, DynamicWidgetRenderFailure>,
    lastGood: () -> Node?,
    placeholder: () -> Node?
  ) -> DynamicWidgetShownContent<Node> {
    switch result {
    case let .success(node):
      return .node(node)
    case let .failure(failure):
      if isDev {
        return .devError(failure)
      }
      if let node = lastGood() {
        return .lastGood(node)
      }
      if let node = placeholder() {
        return .placeholder(node)
      }
      return .loading
    }
  }
}
