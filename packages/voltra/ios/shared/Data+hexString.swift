import Foundation

extension Data {
  /// Converts the data to a hexadecimal string representation.
  var hexString: String {
    map { String(format: "%02x", $0) }.joined()
  }
}
