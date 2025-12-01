import ActivityKit
import Foundation
import SwiftUI
import WidgetKit

public struct VoltraUIWidget: Widget {
  public init() {}
  
  public var body: some WidgetConfiguration {
    ActivityConfiguration(for: VoltraUIAttributes.self) { context in
      let components = context.state.regions[.lockScreen] ?? []
      VoltraUIContentBuilder.build(components: components, source: "activity_content")
        .widgetURL(VoltraUIDeepLinkResolver.resolve(context.attributes))

    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          let components = context.state.regions[.islandExpandedLeading] ?? []
          VoltraUIContentBuilder.build(components: components, source: "dynamic_island_expanded_leading")
            .widgetURL(VoltraUIDeepLinkResolver.resolve(context.attributes))
        }
        DynamicIslandExpandedRegion(.trailing) {
          let components = context.state.regions[.islandExpandedTrailing] ?? []
          VoltraUIContentBuilder.build(components: components, source: "dynamic_island_expanded_trailing")
            .widgetURL(VoltraUIDeepLinkResolver.resolve(context.attributes))
        }
        DynamicIslandExpandedRegion(.center) {
          let components = context.state.regions[.islandExpandedCenter] ?? []
          VoltraUIContentBuilder.build(components: components, source: "dynamic_island_expanded_center")
            .widgetURL(VoltraUIDeepLinkResolver.resolve(context.attributes))
        }
        DynamicIslandExpandedRegion(.bottom) {
          let components = context.state.regions[.islandExpandedBottom] ?? []
          VoltraUIContentBuilder.build(components: components, source: "dynamic_island_expanded_bottom")
            .widgetURL(VoltraUIDeepLinkResolver.resolve(context.attributes))
        }
      } compactLeading: {
        let components = context.state.regions[.islandCompactLeading] ?? []
        VoltraUIContentBuilder.build(components: components, source: "dynamic_island_compact_leading")
          .widgetURL(VoltraUIDeepLinkResolver.resolve(context.attributes))
      } compactTrailing: {
        let components = context.state.regions[.islandCompactTrailing] ?? []
        VoltraUIContentBuilder.build(components: components, source: "dynamic_island_compact_trailing")
          .widgetURL(VoltraUIDeepLinkResolver.resolve(context.attributes))
      } minimal: {
        let components = context.state.regions[.islandMinimal] ?? []
        VoltraUIContentBuilder.build(components: components, source: "dynamic_island_minimal")
          .widgetURL(VoltraUIDeepLinkResolver.resolve(context.attributes))
      }
    }
  }
}
