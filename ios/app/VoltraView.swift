import ExpoModulesCore
import SwiftUI
import UIKit

class VoltraView: ExpoView {
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
    let view = Voltra(root: .empty, callback: { _ in }, activityId: viewId)
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
      root = VoltraNode(from: json)
    } catch {
      print("Error setting payload in VoltraView: \(error)")
      root = .empty
    }

    updateView()
  }

  private func updateView() {
    hostingController?.view.removeFromSuperview()

    // This is not the most performant way to update the view, but it's the easiest way to get the job done.
    let newView = Voltra(root: root, callback: { _ in }, activityId: viewId)
    let newHostingController = UIHostingController(rootView: AnyView(newView))
    newHostingController.view.backgroundColor = .clear
    newHostingController.view.frame = bounds
    addSubview(newHostingController.view)

    self.hostingController = newHostingController
  }
}
