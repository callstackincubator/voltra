import SwiftUI

// MARK: - Environment Key

private struct IsInFlexContainerKey: EnvironmentKey {
  static let defaultValue = false
}

extension EnvironmentValues {
  var isInFlexContainer: Bool {
    get { self[IsInFlexContainerKey.self] }
    set { self[IsInFlexContainerKey.self] = newValue }
  }
}

// MARK: - Flex Item Values

struct FlexItemValues: Equatable {
  var flexGrow: CGFloat = 0
  var flexShrink: CGFloat = 0
  var flexBasis: SizeValue? // nil = auto
  var width: SizeValue?
  var height: SizeValue?
  var minWidth: CGFloat?
  var maxWidth: CGFloat?
  var minHeight: CGFloat?
  var maxHeight: CGFloat?
  var alignSelf: FlexAlign?
  var margin: EdgeInsets?
  var aspectRatio: CGFloat?
}

struct FlexItemLayoutKey: LayoutValueKey {
  static let defaultValue = FlexItemValues()
}
