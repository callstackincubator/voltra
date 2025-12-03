import Foundation

public enum VoltraRegion: String, Codable, Hashable, CaseIterable {
  case lockScreen
  case islandExpandedCenter
  case islandExpandedLeading
  case islandExpandedTrailing
  case islandExpandedBottom
  case islandCompactLeading
  case islandCompactTrailing
  case islandMinimal
}
