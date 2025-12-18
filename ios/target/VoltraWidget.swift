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
    ActivityConfiguration(for: VoltraAttributes.self) { context in
      Voltra(root: rootNode(for: .lockScreen, from: context.state), activityId: context.activityID)
        .widgetURL(VoltraDeepLinkResolver.resolve(context.attributes))
        .voltraIfLet(context.state.activityBackgroundTint) { view, tint in 
          let color = JSColorParser.parse(tint)
          view.activityBackgroundTint(color)
        }
    } dynamicIsland: { context in
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
         let color = JSColorParser.parse(keylineTint) {
        return dynamicIsland.keylineTint(color)
      } else {
        return dynamicIsland
      }
    }
  }
}
