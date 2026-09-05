import Foundation
import SwiftUI
import WidgetKit

/// Timeline provider for a Dynamic Widget that has a `serverUpdate`.
///
/// It wraps `VoltraClientWidgetProvider` rather than replacing it: the bundle load, the render and
/// the fallback to the prerendered initial state are exactly what they are for any Dynamic Widget.
/// What this adds is a fetch on `getTimeline`, a commit of the fetched props into the widget's
/// existing props slot, and a schedule — a plain Dynamic Widget's timeline is `.never`, so without
/// one nothing would ever ask again.
///
/// `placeholder` and `getSnapshot` stay local. Apple's guidance is to keep the gallery preview off
/// the network, and a snapshot that waited for a fetch would show a spinner in the widget picker.
public struct VoltraDynamicWidgetServerUpdateProvider: TimelineProvider {
  public let widgetId: String
  public let initialState: Data?

  public init(widgetId: String, initialState: Data? = nil) {
    self.widgetId = widgetId
    self.initialState = initialState
  }

  private var scope: WidgetScope {
    .of(widgetId)
  }

  public func placeholder(in _: Context) -> VoltraClientWidgetEntry {
    VoltraClientWidgetEntry(date: Date(), widgetId: widgetId, bundleReady: false)
  }

  public func getSnapshot(in _: Context, completion: @escaping (VoltraClientWidgetEntry) -> Void) {
    Task { completion(await localEntry(configuration: [:])) }
  }

  public func getTimeline(in context: Context, completion: @escaping (Timeline<VoltraClientWidgetEntry>) -> Void) {
    Task {
      completion(await timeline(family: context.family, configuration: [:]))
    }
  }

  /// Shared with the generated `AppIntentTimelineProvider`s, which pass the user-configured
  /// parameters as `configuration`.
  public static func timeline(
    widgetId: String,
    family: WidgetFamily,
    configuration: [String: String]
  ) async -> Timeline<VoltraClientWidgetEntry> {
    await VoltraDynamicWidgetServerUpdateProvider(widgetId: widgetId).timeline(
      family: family,
      configuration: configuration
    )
  }

  func timeline(family: WidgetFamily, configuration: [String: String]) async -> Timeline<VoltraClientWidgetEntry> {
    let settings = VoltraWidgetServer.resolver.resolve(scope)

    guard settings.shouldFetch else {
      // No URL yet, or the app has taken the widget over. Either way there is nothing to schedule:
      // the app reloads the widget itself, and setting a URL later queues a reload of its own.
      DynamicWidgetServerPropsStore().markDisabledIfNeeded(enabled: settings.enabled, for: scope)

      return Timeline(entries: [await localEntry(configuration: configuration)], policy: .never)
    }

    var nextIntervalMinutes = settings.intervalMinutes

    if await shouldFetch() {
      let result = await runner(family: family, configuration: configuration).run(scope)

      // What the server asked for wins over the configured interval: `Cache-Control: max-age` on a
      // success, `Retry-After` on a 429 or 503.
      if let asked = result.nextIntervalMinutes {
        nextIntervalMinutes = asked
      } else if result.outcome == .retry || result.outcome == .failed {
        // A failure the server did not put a number on. Coming back sooner than the widget's own
        // interval would spend the reload budget on an endpoint that is already unhappy, so the
        // floor is used rather than the configured value only when that is shorter.
        nextIntervalMinutes = max(settings.intervalMinutes, WidgetServerUpdateDefaults.minIntervalMinutes)
      }
    }

    let entry = await localEntry(configuration: configuration)
    let nextUpdate = Date().addingTimeInterval(TimeInterval(nextIntervalMinutes * 60))

    return Timeline(entries: [entry], policy: .after(nextUpdate))
  }

  /// Whether this timeline request should fetch, or ride on one that just happened.
  ///
  /// Skipped for a moment after `updateDynamicWidget` writes props, so an optimistic update is not
  /// wiped out by the very reload it triggered. ADR 0002 says the *next scheduled* fetch overwrites
  /// app-written props, not the one the write itself caused.
  private func shouldFetch() async -> Bool {
    if let writtenAt = DynamicWidgetServerPropsStore().appWriteAt(for: scope),
       Date().timeIntervalSince(writtenAt) < DynamicWidgetServerFetchCoordinator.defaultCoalesceInterval
    {
      return false
    }

    return await DynamicWidgetServerFetchCoordinator.shared.shouldFetch(scope)
  }

  /// The entry a widget renders from: the bundle, the configuration, and how the last fetch went.
  /// The props themselves are read by the view from the same slot `updateDynamicWidget` writes, so
  /// the render path does not know where they came from.
  private func localEntry(configuration: [String: String]) async -> VoltraClientWidgetEntry {
    let entry = await VoltraClientWidgetProvider.loadEntry(widgetId: widgetId, configuration: configuration)

    return entry.withServerUpdate(DynamicWidgetServerPropsStore().status(for: scope).toJSON())
  }

  private func runner(family: WidgetFamily, configuration: [String: String]) -> DynamicWidgetServerUpdateRunner {
    let statuses = DynamicWidgetServerPropsStore()

    return DynamicWidgetServerUpdateRunner(
      resolveSettings: { VoltraWidgetServer.resolver.resolve($0) },
      currentRevision: { VoltraWidgetServer.resolver.revision($0) },
      readEtag: { WidgetServerEtagStore.etag(for: $0, url: $1) },
      fetch: { scope, settings, etag in
        guard let request = WidgetServerRequestBuilder.build(
          scope: scope,
          settings: settings,
          // No `family`: one fetch serves every size and instance of a Dynamic Widget, so its
          // props must be size-agnostic and the entry picks its layout from env.widgetFamily.
          context: VoltraWidgetAppearance.requestContext(),
          etag: etag
        ) else {
          return .networkFailure(message: "Could not build a request")
        }

        return await WidgetServerFetcher.fetch(request)
      },
      writeEtag: { WidgetServerEtagStore.put($2, for: $0, url: $1) },
      trialRender: { scope, props in
        VoltraDynamicWidgetTrialRender.canRender(
          widgetId: scope.widgetId,
          propsJSON: props,
          family: family,
          configuration: configuration
        )
      },
      commitProps: { scope, props in
        try DynamicWidgetPropsStore().persistDynamicWidgetProps(props, for: scope.widgetId)
      },
      recordSuccess: { statuses.recordSuccess(fetchedAt: $1, httpStatus: $2, for: $0) },
      recordFailure: { statuses.recordFailure($1, httpStatus: $2, for: $0) },
      markDisabled: { statuses.markDisabledIfNeeded(enabled: $1, for: $0) }
    )
  }
}

/// Renders fetched props once, off screen, before they are allowed anywhere near the widget.
///
/// The trial uses one environment — the family WidgetKit asked the timeline for, in the current
/// appearance. A widget that only throws for another family slips through, and ADR 0002 accepts
/// that: rendering every supported family on every fetch would cost more than the failure it
/// prevents, inside a 30 MB extension.
enum VoltraDynamicWidgetTrialRender {
  static func canRender(
    widgetId: String,
    propsJSON: String,
    family: WidgetFamily,
    configuration: [String: String]
  ) -> Bool {
    // env.serverUpdate is deliberately absent here. The trial asks whether the props render, and a
    // widget that only fails when told the fetch went badly is a different problem from props that
    // cannot be drawn.
    let envJSON = VoltraClientWidgetEnvBuilder.build(
      date: Date(),
      widgetFamily: family,
      colorScheme: nil,
      widgetRenderingMode: .fullColor,
      showsWidgetContainerBackground: true,
      locale: Locale.current,
      configuration: configuration
    )

    guard let resolved = VoltraJSRenderer.render(widgetId: widgetId, propsJSON: propsJSON, envJSON: envJSON),
          let json = try? JSONValue.parse(from: resolved)
    else {
      return false
    }

    if case .empty = VoltraNode.parse(from: json) {
      return false
    }

    return true
  }
}
