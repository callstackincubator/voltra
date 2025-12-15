import SwiftUI

public struct VoltraSpacer: View {
    private let element: VoltraElement

    public init(_ element: VoltraElement) {
        self.element = element
    }

    public var body: some View {
        let params = element.parameters(SpacerParameters.self)
        Spacer(minLength: params.minLength.map { CGFloat($0) })
            .applyStyle(element.style)
    }
}
