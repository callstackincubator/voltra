import Foundation

/// In-memory record of the last successful server response for each server-driven widget.
///
/// Lives for the lifetime of the widget extension process. It is the source of truth for
/// "the last content the server actually sent", independent of whether an App Group is
/// configured for on-disk persistence.
actor ServerWidgetResponseStore {
  struct Response: Equatable {
    let data: Data
    let fetchedAt: Date
  }

  private var responses: [String: Response] = [:]

  init() {}

  func response(for widgetId: String) -> Response? {
    responses[widgetId]
  }

  func store(_ data: Data, for widgetId: String, fetchedAt: Date) {
    responses[widgetId] = Response(data: data, fetchedAt: fetchedAt)
  }
}
