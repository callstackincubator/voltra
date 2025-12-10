import SwiftUI

extension Binding {
    /// On Change of a Binding value
    ///
    /// - Parameter handler: Callback handler
    /// 
    /// - Returns: Binding
    func onChange(_ callback: @escaping (Value) -> Void) -> Binding<Value> {
        Binding(
            get: { self.wrappedValue },
            set: { newValue in
                self.wrappedValue = newValue
                callback(newValue)
            }
        )
    }
}
