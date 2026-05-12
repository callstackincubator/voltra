import SwiftUI

/// Protocol for Voltra component views with typed parameters
public protocol VoltraView: View {
  /// The parameters type for this component
  associatedtype Parameters: ComponentParameters

  /// The backing element
  var element: VoltraElement { get }

  init(_ element: VoltraElement)
}

public extension VoltraView {
  /// Automatically typed parameters accessor
  var params: Parameters {
    element.parameters(Parameters.self)
  }
}

/// Empty parameters for components that don't need any
public struct EmptyParameters: ComponentParameters {}

/// Convenience extension for views with no parameters
public extension VoltraView where Parameters == EmptyParameters {
  var params: EmptyParameters {
    EmptyParameters()
  }
}
