import ExpoModulesCore
import SwiftUI
import UIKit

class VoltraRN: ExpoView {
  private var hostingController: UIHostingController<AnyView>?
  private var root: VoltraNode = .empty

  /// Unique identifier for this view instance, used as 'source' in interaction events
  private var viewId: String = UUID().uuidString

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    setupHostingController()
  }

  private func setupHostingController() {
    let view = Voltra(root: .empty, activityId: viewId)
    let hostingController = UIHostingController(rootView: AnyView(view))
    hostingController.view.backgroundColor = .clear
    addSubview(hostingController.view)
    self.hostingController = hostingController
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    hostingController?.view.frame = bounds
  }

  func setViewId(_ id: String) {
    guard !id.isEmpty else { return }
    viewId = id
    updateView()
  }

  func setPayload(_ jsonString: String) {
    parseAndUpdatePayload(jsonString)
  }

  private func parseAndUpdatePayload(_ jsonString: String) {
    do {
      let json = try JSONValue.parse(from: jsonString)

      // Extract stylesheet and sharedElements from root if it's an object
      var stylesheet: [[String: JSONValue]]? = nil
      var sharedElements: [JSONValue]? = nil

      if case .object(let rootObject) = json {
        // Extract stylesheet (key "s")
        if case .array(let stylesheetArray) = rootObject["s"] {
          stylesheet = stylesheetArray.compactMap { item in
            if case .object(let dict) = item { return dict }
            return nil
          }
        }
        // Extract shared elements (key "e")
        if case .array(let elementsArray) = rootObject["e"] {
          sharedElements = elementsArray
        }
      }

      root = VoltraNode(from: json, stylesheet: stylesheet, sharedElements: sharedElements)
    } catch {
      print("Error setting payload in VoltraView: \(error)")
      root = .empty
    }

    updateView()
  }

  private func updateView() {
    hostingController?.view.removeFromSuperview()

    // This is not the most performant way to update the view, but it's the easiest way to get the job done.
    let newView = Voltra(root: root, activityId: viewId)
    let newHostingController = UIHostingController(rootView: AnyView(newView))
    newHostingController.view.backgroundColor = .clear
    newHostingController.view.frame = bounds
    addSubview(newHostingController.view)

    self.hostingController = newHostingController
  }
}
