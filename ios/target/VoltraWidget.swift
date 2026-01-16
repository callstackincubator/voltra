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
      return withAdaptiveViewConfig()
    } else {
      return defaultViewConfig()
    }
  }

  // MARK: - iOS 18+ Configuration (with adaptive view for supplemental activity families)

  @available(iOS 18.0, *)
  private func withAdaptiveViewConfig() -> some WidgetConfiguration {
    ActivityConfiguration(for: VoltraAttributes.self) { context in
      VoltraAdaptiveLockScreenView(
        context: context,
        rootNodeProvider: rootNode
      )
      .widgetURL(VoltraDeepLinkResolver.resolve(context.attributes))
      .voltraIfLet(context.state.activityBackgroundTint) { view, tint in
        let color = JSColorParser.parse(tint)
        view.activityBackgroundTint(color)
      }
    } dynamicIsland: { context in
      dynamicIslandContent(context: context)
    }
    // NOTE: .supplementalActivityFamilies() is applied by VoltraWidgetWithSupplementalActivityFamilies
    // wrapper when configured via plugin (see VoltraWidgetBundle.swift)
  }

  // MARK: - Default Configuration (iOS 16.2 - 17.x)

  private func defaultViewConfig() -> some WidgetConfiguration {
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

// MARK: - Adaptive Lock Screen View (iOS 18+)

/// A view that adapts its content based on the activity family environment
/// - For .small (watchOS/CarPlay): Uses supplementalActivityFamiliesSmall content if available, falls back to lockScreen
/// - For .medium (iPhone lock screen) and unknown: Always uses lockScreen
@available(iOS 18.0, *)
struct VoltraAdaptiveLockScreenView: View {
  let context: ActivityViewContext<VoltraAttributes>
  let rootNodeProvider: (VoltraRegion, VoltraAttributes.ContentState) -> VoltraNode

  @Environment(\.activityFamily) private var activityFamily

  var body: some View {
    switch activityFamily {
    case .small:
      let region: VoltraRegion = context.state.regions[.supplementalActivityFamiliesSmall] != nil
        ? .supplementalActivityFamiliesSmall
        : .lockScreen
      Voltra(root: rootNodeProvider(region, context.state), activityId: context.activityID)

    case .medium:
      Voltra(root: rootNodeProvider(.lockScreen, context.state), activityId: context.activityID)

    @unknown default:
      Voltra(root: rootNodeProvider(.lockScreen, context.state), activityId: context.activityID)
    }
  }
}
