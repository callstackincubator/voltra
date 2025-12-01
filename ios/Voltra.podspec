require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'Voltra'
  s.version        = package['version']
  s.summary        = 'Voltra · Live Activities and Widgets from React Native'
  s.description    = 'Voltra converts React Native JSX into VoltraUI JSON to render SwiftUI surfaces like Live Activities, widgets, and Dynamic Island layouts.'
  s.license        = package['license']
  s.author         = package['author']
  s.homepage       = package['homepage']
  s.platforms      = {
    :ios => '16.2',
    :tvos => '16.2'
  }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/saulsharma/voltra' }
  s.static_framework = true

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  # Default subspec: main app module (auto-linked by Expo)
  s.default_subspecs = 'Core'

  # Core subspec: React Native bridge module
  s.subspec 'Core' do |ss|
    ss.dependency 'ExpoModulesCore'
    
    ss.source_files = [
      "app/**/*.swift",
      "shared/**/*.swift",
    ]
  end

  # Widget subspec: Widget extension code
  s.subspec 'Widget' do |ss|
    ss.source_files = [
      "shared/**/*.swift",
      "target/**/*.swift",
    ]
  end
end
