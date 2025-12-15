import ActivityKit
import Foundation
import SwiftUI
import WidgetKit

public struct VoltraWidget: Widget {
  public init() {}
  
  public var body: some WidgetConfiguration {
    ActivityConfiguration(for: VoltraAttributes.self) { context in
      let nodes = context.state.regions[.lockScreen] ?? []
      VoltraContentBuilder.build(nodes: nodes, source: "activity_content", activityId: context.activityID, activityBackgroundTint: context.state.activityBackgroundTint)
        .widgetURL(VoltraDeepLinkResolver.resolve(context.attributes))

    } dynamicIsland: { context in
      let dynamicIsland = DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          let nodes = context.state.regions[.islandExpandedLeading] ?? []
          VoltraContentBuilder.build(nodes: nodes, source: "dynamic_island_expanded_leading", activityId: context.activityID)
            .widgetURL(VoltraDeepLinkResolver.resolve(context.attributes))
        }
        DynamicIslandExpandedRegion(.trailing) {
          let nodes = context.state.regions[.islandExpandedTrailing] ?? []
          VoltraContentBuilder.build(nodes: nodes, source: "dynamic_island_expanded_trailing", activityId: context.activityID)
            .widgetURL(VoltraDeepLinkResolver.resolve(context.attributes))
        }
        DynamicIslandExpandedRegion(.center) {
          let nodes = context.state.regions[.islandExpandedCenter] ?? []
          VoltraContentBuilder.build(nodes: nodes, source: "dynamic_island_expanded_center", activityId: context.activityID)
            .widgetURL(VoltraDeepLinkResolver.resolve(context.attributes))
        }
        DynamicIslandExpandedRegion(.bottom) {
          let nodes = context.state.regions[.islandExpandedBottom] ?? []
          VoltraContentBuilder.build(nodes: nodes, source: "dynamic_island_expanded_bottom", activityId: context.activityID)
            .widgetURL(VoltraDeepLinkResolver.resolve(context.attributes))
        }
      } compactLeading: {
        let nodes = context.state.regions[.islandCompactLeading] ?? []
        VoltraContentBuilder.build(nodes: nodes, source: "dynamic_island_compact_leading", activityId: context.activityID)
          .widgetURL(VoltraDeepLinkResolver.resolve(context.attributes))
      } compactTrailing: {
        let nodes = context.state.regions[.islandCompactTrailing] ?? []
        VoltraContentBuilder.build(nodes: nodes, source: "dynamic_island_compact_trailing", activityId: context.activityID)
          .widgetURL(VoltraDeepLinkResolver.resolve(context.attributes))
      } minimal: {
        let nodes = context.state.regions[.islandMinimal] ?? []
        VoltraContentBuilder.build(nodes: nodes, source: "dynamic_island_minimal", activityId: context.activityID)
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
