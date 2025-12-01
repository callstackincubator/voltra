//
//  VoltraUIWidgetBundle.swift
//
//  This file defines which Voltra widgets are available in your app.
//  You can customize which widgets to include by adding or removing them below.
//

import SwiftUI
import WidgetKit
import Voltra  // Import Voltra widgets

@main
struct VoltraUIWidgetBundle: WidgetBundle {
  var body: some Widget {
    // Live Activity Widget (Dynamic Island + Lock Screen)
    VoltraUIWidget()
    
    // Static Home Screen Widgets (you can remove any you don't need)
    VoltraSlotWidget1()
    VoltraSlotWidget2()
    VoltraSlotWidget3()
  }
}
