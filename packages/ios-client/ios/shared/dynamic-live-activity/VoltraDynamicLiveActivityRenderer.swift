import ActivityKit
import Foundation
import SwiftUI
import WidgetKit

/// Renders generated Dynamic Live Activity configurations through their bundled
/// JavaScript definitions. Failures intentionally become `EmptyView`: a remote
/// ActivityKit start may already exist and a later update can recover it.
public enum VoltraDynamicLiveActivityRenderer {
  public static func lockScreen<Attributes: VoltraDynamicLiveActivityDefinition>(
    definitionId: String,
    context: ActivityViewContext<Attributes>
  ) -> some View {
    if #available(iOS 18.0, *) {
      return VoltraDynamicLiveActivityAdaptiveLockScreenView(definitionId: definitionId, context: context)
    }
    return VoltraDynamicLiveActivityLockScreenView(definitionId: definitionId, context: context)
  }

  public static func dynamicIsland<Attributes: VoltraDynamicLiveActivityDefinition>(
    definitionId: String,
    context: ActivityViewContext<Attributes>
  ) -> DynamicIsland {
    let content = resolve(definitionId: definitionId, context: context, activityFamily: nil)
    let island = DynamicIsland {
      DynamicIslandExpandedRegion(.leading) {
        content.view(for: .islandExpandedLeading, activityId: context.activityID, deepLink: context.attributes.deepLinkUrl)
      }
      DynamicIslandExpandedRegion(.trailing) {
        content.view(for: .islandExpandedTrailing, activityId: context.activityID, deepLink: context.attributes.deepLinkUrl)
      }
      DynamicIslandExpandedRegion(.center) {
        content.view(for: .islandExpandedCenter, activityId: context.activityID, deepLink: context.attributes.deepLinkUrl)
      }
      DynamicIslandExpandedRegion(.bottom) {
        content.view(for: .islandExpandedBottom, activityId: context.activityID, deepLink: context.attributes.deepLinkUrl)
      }
    } compactLeading: {
      content.view(for: .islandCompactLeading, activityId: context.activityID, deepLink: context.attributes.deepLinkUrl)
    } compactTrailing: {
      content.view(for: .islandCompactTrailing, activityId: context.activityID, deepLink: context.attributes.deepLinkUrl)
    } minimal: {
      content.view(for: .islandMinimal, activityId: context.activityID, deepLink: context.attributes.deepLinkUrl)
    }

    if let keylineTint = content.payload?.keylineTint, let color = JSColorParser.parse(keylineTint) {
      return island.keylineTint(color)
    }
    return island
  }

  fileprivate static func resolve<Attributes: VoltraDynamicLiveActivityDefinition>(
    definitionId: String,
    context: ActivityViewContext<Attributes>,
    activityFamily: String?,
    colorScheme: ColorScheme? = nil,
    locale: Locale = .current,
    widgetRenderingMode: WidgetRenderingMode = .fullColor
  ) -> VoltraDynamicLiveActivityResolvedContent {
    guard VoltraDynamicLiveActivityRegistry.shared.contains(definitionId) else {
      logFailure(definitionId: definitionId, activityName: context.attributes.name, message: "Definition is missing from the installed catalog")
      return .empty
    }
    guard let propsJSON = DynamicLiveActivityPropsCodec.encode(context.state.props) else {
      logFailure(definitionId: definitionId, activityName: context.attributes.name, message: "Could not encode content-state props")
      return .empty
    }
    let environmentJSON = VoltraDynamicLiveActivityEnvironmentBuilder.build(
      date: Date(),
      colorScheme: colorScheme,
      locale: locale,
      widgetRenderingMode: widgetRenderingMode,
      isStale: context.isStale,
      activityFamily: activityFamily
    )

    do {
      let source = try VoltraDynamicLiveActivityBundleSource.load(definitionId: definitionId)
      guard VoltraJSRenderer.ensureLiveActivityEvaluated(definitionId: definitionId, source: source) else {
        logFailure(definitionId: definitionId, activityName: context.attributes.name, message: "Could not evaluate definition bundle")
        return .empty
      }
      guard let renderedJSON = VoltraJSRenderer.renderLiveActivity(
        definitionId: definitionId,
        propsJSON: propsJSON,
        envJSON: environmentJSON
      ) else {
        logFailure(definitionId: definitionId, activityName: context.attributes.name, message: "Definition render failed")
        return .empty
      }
      let payload = try VoltraLiveActivityPayload(jsonString: renderedJSON)
      return VoltraDynamicLiveActivityResolvedContent(payload: payload)
    } catch {
      logFailure(definitionId: definitionId, activityName: context.attributes.name, message: error.localizedDescription)
      return .empty
    }
  }

  fileprivate static func logFailure(definitionId: String, activityName: String, message: String) {
    VoltraDynamicLiveActivityRenderFailureReporter.record(
      activityName: activityName,
      definitionId: definitionId,
      message: message
    )
  }
}

private struct VoltraDynamicLiveActivityLockScreenView<Attributes: VoltraDynamicLiveActivityDefinition>: View {
  let definitionId: String
  let context: ActivityViewContext<Attributes>

  @Environment(\.colorScheme) private var colorScheme
  @Environment(\.locale) private var locale
  @Environment(\.widgetRenderingMode) private var widgetRenderingMode

  var body: some View {
    let content = VoltraDynamicLiveActivityRenderer.resolve(
      definitionId: definitionId,
      context: context,
      activityFamily: nil,
      colorScheme: colorScheme,
      locale: locale,
      widgetRenderingMode: widgetRenderingMode
    )
    if let tint = content.payload?.activityBackgroundTint, let color = JSColorParser.parse(tint) {
      content.view(for: .lockScreen, activityId: context.activityID, deepLink: context.attributes.deepLinkUrl)
        .activityBackgroundTint(color)
    } else {
      content.view(for: .lockScreen, activityId: context.activityID, deepLink: context.attributes.deepLinkUrl)
    }
  }
}

@available(iOS 18.0, *)
private struct VoltraDynamicLiveActivityAdaptiveLockScreenView<Attributes: VoltraDynamicLiveActivityDefinition>: View {
  let definitionId: String
  let context: ActivityViewContext<Attributes>

  @Environment(\.activityFamily) private var activityFamily
  @Environment(\.colorScheme) private var colorScheme
  @Environment(\.locale) private var locale
  @Environment(\.widgetRenderingMode) private var widgetRenderingMode

  var body: some View {
    let content = VoltraDynamicLiveActivityRenderer.resolve(
      definitionId: definitionId,
      context: context,
      activityFamily: String(describing: activityFamily),
      colorScheme: colorScheme,
      locale: locale,
      widgetRenderingMode: widgetRenderingMode
    )
    if activityFamily == .small {
      smallFamilyContent(content: content)
    } else {
      lockScreenContent(content: content)
    }
  }

  @ViewBuilder
  private func smallFamilyContent(content: VoltraDynamicLiveActivityResolvedContent) -> some View {
    if content.hasContent(for: .supplementalActivityFamiliesSmall) {
      content.view(
        for: .supplementalActivityFamiliesSmall,
        activityId: context.activityID,
        deepLink: context.attributes.deepLinkUrl
      )
    } else if content.hasContent(for: .islandCompactLeading) || content.hasContent(for: .islandCompactTrailing) {
      HStack(spacing: 0) {
        content.view(for: .islandCompactLeading, activityId: context.activityID, deepLink: context.attributes.deepLinkUrl)
        Spacer()
        content.view(for: .islandCompactTrailing, activityId: context.activityID, deepLink: context.attributes.deepLinkUrl)
      }
      .frame(maxWidth: .infinity)
    }
  }

  @ViewBuilder
  private func lockScreenContent(content: VoltraDynamicLiveActivityResolvedContent) -> some View {
    if let tint = content.payload?.activityBackgroundTint, let color = JSColorParser.parse(tint) {
      content.view(for: .lockScreen, activityId: context.activityID, deepLink: context.attributes.deepLinkUrl)
        .activityBackgroundTint(color)
    } else {
      content.view(for: .lockScreen, activityId: context.activityID, deepLink: context.attributes.deepLinkUrl)
    }
  }
}

private struct VoltraDynamicLiveActivityResolvedContent {
  static let empty = VoltraDynamicLiveActivityResolvedContent(payload: nil)

  let payload: VoltraLiveActivityPayload?

  func hasContent(for region: VoltraRegion) -> Bool {
    !(payload?.regions[region] ?? []).isEmpty
  }

  @ViewBuilder
  func view(for region: VoltraRegion, activityId: String, deepLink: String?) -> some View {
    if let nodes = payload?.regions[region], !nodes.isEmpty {
      let root: VoltraNode = nodes.count == 1 ? nodes[0] : .array(nodes)
      Voltra(root: root, activityId: activityId)
        .voltraIfLet(deepLink) { view, url in view.widgetURL(URL(string: url)) }
    }
  }
}

private enum VoltraDynamicLiveActivityEnvironmentBuilder {
  static func build(
    date: Date,
    colorScheme: ColorScheme?,
    locale: Locale,
    widgetRenderingMode: WidgetRenderingMode,
    isStale: Bool,
    activityFamily: String?
  ) -> String {
    #if DEBUG
      let isDev = true
      let metroURL: String? = VoltraWidgetDefaults.devServerURL() ?? "http://localhost:8081"
    #else
      let isDev = false
      let metroURL: String? = nil
    #endif
    let build: [String: Any] = [
      "isDev": isDev,
      "metroUrl": metroURL as Any,
      "appVersion": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "unknown",
      "voltraVersion": "1.4.1",
    ]
    var environment: [String: Any] = [
      "date": Int(date.timeIntervalSince1970 * 1000),
      "colorScheme": String(describing: colorScheme ?? .light),
      "locale": locale.identifier,
      "widgetRenderingMode": String(describing: widgetRenderingMode),
      "build": build,
      "isStale": isStale,
    ]
    if let activityFamily {
      environment["activityFamily"] = activityFamily
    }
    guard
      let data = try? JSONSerialization.data(withJSONObject: environment),
      let json = String(data: data, encoding: .utf8)
    else {
      return "{}"
    }
    return json
  }
}
