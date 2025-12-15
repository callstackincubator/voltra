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

  /// The JSON key for this region in the payload
  public var jsonKey: String {
    switch self {
    case .lockScreen:
      return "ls"
    case .islandExpandedCenter:
      return "isl_exp_c"
    case .islandExpandedLeading:
      return "isl_exp_l"
    case .islandExpandedTrailing:
      return "isl_exp_t"
    case .islandExpandedBottom:
      return "isl_exp_b"
    case .islandCompactLeading:
      return "isl_cmp_l"
    case .islandCompactTrailing:
      return "isl_cmp_t"
    case .islandMinimal:
      return "isl_min"
    }
  }
}
