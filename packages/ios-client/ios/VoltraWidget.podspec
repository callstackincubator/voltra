require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'VoltraWidget'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = 'Voltra Widget Extension support.'
  s.license        = package['license']
  s.author         = package['author']
  s.homepage       = package['homepage']
  s.platforms      = {
    :ios => '16.2',
  }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/callstackincubator/voltra' }
  s.static_framework = true

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = [
    "ui/**/*.swift",
    "shared/**/*.swift",
    "target/**/*.swift",
  ]
end
