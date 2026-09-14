extension VoltraElement {
  /// Descriptors decoded from the JSON-encoded `modifiers` prop.
  var nativeModifiers: [VoltraModifierDescriptor] {
    VoltraModifierRegistry.parseDescriptors(props?["modifiers"]?.stringValue)
  }
}
