import ActivityKit
import Foundation
import SwiftUI
import WidgetKit

public struct VoltraWidget: Widget {
  public init() {}

  /// Convert an array of nodes to a single root node for rendering
  private func rootNode(for region: VoltraRegion, from state: VoltraAttributes.ContentState) -> VoltraNode {
    let nodes = state.regions[region] ?? []
    if nodes.isEmpty { return .empty }
    return nodes.count == 1 ? nodes[0] : .array(nodes)
  }

  public var body: some WidgetConfiguration {
    if #available(iOS 18.0, *) {
      return adaptiveConfig()
    } else {
      return defaultConfig()
    }
  }

  // MARK: - iOS 18+ Configuration (with supplemental activity families)

  @available(iOS 18.0, *)
  private func adaptiveConfig() -> some WidgetConfiguration {
    ActivityConfiguration(for: VoltraAttributes.self) { context in
      adaptiveLocksScreenView(context: context)
        .widgetURL(VoltraDeepLinkResolver.resolve(context.attributes))
        .voltraIfLet(context.state.activityBackgroundTint) { view, tint in
          let color = JSColorParser.parse(tint)
          view.activityBackgroundTint(color)
        }
    } dynamicIsland: { context in
      dynamicIslandContent(context: context)
    }
    .supplementalActivityFamilies([.small, .medium])
  }

  // MARK: - Default Configuration (iOS 16.2 - 17.x)

  private func defaultConfig() -> some WidgetConfiguration {
    ActivityConfiguration(for: VoltraAttributes.self) { context in
      Voltra(root: rootNode(for: .lockScreen, from: context.state), activityId: context.activityID)
        .widgetURL(VoltraDeepLinkResolver.resolve(context.attributes))
        .voltraIfLet(context.state.activityBackgroundTint) { view, tint in
          let color = JSColorParser.parse(tint)
          view.activityBackgroundTint(color)
        }
    } dynamicIsland: { context in
      dynamicIslandContent(context: context)
    }
  }

  // MARK: - Adaptive Lock Screen View (iOS 18+)

  @available(iOS 18.0, *)
  private func adaptiveLocksScreenView(context: ActivityViewContext<VoltraAttributes>) -> some View {
    VoltraAdaptiveLockScreenView(context: context, rootNodeProvider: rootNode)
  }

  // MARK: - Dynamic Island (shared between iOS versions)

  private func dynamicIslandContent(context: ActivityViewContext<VoltraAttributes>) -> DynamicIsland {
    let dynamicIsland = DynamicIsland {
      DynamicIslandExpandedRegion(.leading) {
        Voltra(root: rootNode(for: .islandExpandedLeading, from: context.state), activityId: context.activityID)
          .widgetURL(VoltraDeepLinkResolver.resolve(context.attributes))
      }
      DynamicIslandExpandedRegion(.trailing) {
        Voltra(root: rootNode(for: .islandExpandedTrailing, from: context.state), activityId: context.activityID)
          .widgetURL(VoltraDeepLinkResolver.resolve(context.attributes))
      }
      DynamicIslandExpandedRegion(.center) {
        Voltra(root: rootNode(for: .islandExpandedCenter, from: context.state), activityId: context.activityID)
          .widgetURL(VoltraDeepLinkResolver.resolve(context.attributes))
      }
      DynamicIslandExpandedRegion(.bottom) {
        Voltra(root: rootNode(for: .islandExpandedBottom, from: context.state), activityId: context.activityID)
          .widgetURL(VoltraDeepLinkResolver.resolve(context.attributes))
      }
    } compactLeading: {
      Voltra(root: rootNode(for: .islandCompactLeading, from: context.state), activityId: context.activityID)
        .widgetURL(VoltraDeepLinkResolver.resolve(context.attributes))
    } compactTrailing: {
      Voltra(root: rootNode(for: .islandCompactTrailing, from: context.state), activityId: context.activityID)
        .widgetURL(VoltraDeepLinkResolver.resolve(context.attributes))
    } minimal: {
      Voltra(root: rootNode(for: .islandMinimal, from: context.state), activityId: context.activityID)
        .widgetURL(VoltraDeepLinkResolver.resolve(context.attributes))
    }

    // Apply keylineTint if specified
    if let keylineTint = context.state.keylineTint,
       let color = JSColorParser.parse(keylineTint)
    {
      return dynamicIsland.keylineTint(color)
    } else {
      return dynamicIsland
    }
  }
}

// MARK: - Adaptive Lock Screen View Helper

@available(iOS 18.0, *)
private struct VoltraAdaptiveLockScreenView: View {
  let context: ActivityViewContext<VoltraAttributes>
  let rootNodeProvider: (VoltraRegion, VoltraAttributes.ContentState) -> VoltraNode

  @Environment(\.activityFamily) private var activityFamily

  var body: some View {
    switch activityFamily {
    case .small:
      watchContent()
    case .medium:
      defaultContent()
    @unknown default:
      defaultContent()
    }
  }

  @ViewBuilder
  private func watchContent() -> some View {
    let leading = context.state.regions[.islandCompactLeading] ?? []
    let trailing = context.state.regions[.islandCompactTrailing] ?? []
    let hasCompactContent = !leading.isEmpty || !trailing.isEmpty

    // 1. Try dedicated Watch region
    if let nodes = context.state.regions[.supplementalActivityFamiliesSmall], !nodes.isEmpty {
      Voltra(root: rootNodeProvider(.supplementalActivityFamiliesSmall, context.state), activityId: context.activityID)
    }
    // 2. Compose from compact Dynamic Island regions
    else if hasCompactContent {
      HStack(spacing: 0) {
        if !leading.isEmpty {
          Voltra(root: rootNodeProvider(.islandCompactLeading, context.state), activityId: context.activityID)
        }
        Spacer()
        if !trailing.isEmpty {
          Voltra(root: rootNodeProvider(.islandCompactTrailing, context.state), activityId: context.activityID)
        }
      }
      .frame(maxWidth: .infinity)
    }
    // 3. No content available for Watch
    else {
      EmptyView()
    }
  }

  private func defaultContent() -> some View {
    // Default content for both StandBy (.medium) and unknown activity families
    Voltra(root: rootNodeProvider(.lockScreen, context.state), activityId: context.activityID)
  }
}
