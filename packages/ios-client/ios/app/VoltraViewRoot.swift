import os
import SwiftUI
import UIKit

@objc public class VoltraViewRoot: UIView {
  private var hostingController: UIHostingController<AnyView>?
  private var root: VoltraNode = .empty
  private var viewId: String = UUID().uuidString

  override public init(frame: CGRect) {
    super.init(frame: frame)
    clipsToBounds = true
    setupHostingController()
  }

  public required init?(coder: NSCoder) {
    super.init(coder: coder)
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

  override public func layoutSubviews() {
    super.layoutSubviews()
    hostingController?.view.frame = bounds
  }

  @objc public func setViewId(_ id: String) {
    guard !id.isEmpty else { return }
    viewId = id
    updateView()
  }

  @objc public func setPayload(_ jsonString: String) {
    do {
      let json = try JSONValue.parse(from: jsonString)
      root = VoltraNode.parse(from: json)
    } catch {
      VoltraLogger.module.error("Failed to parse payload in VoltraView: \(error)")
      root = .empty
    }
    updateView()
  }

  private func updateView() {
    hostingController?.view.removeFromSuperview()

    let newView = Voltra(root: root, activityId: viewId)
    let newHostingController = UIHostingController(rootView: AnyView(newView))
    newHostingController.view.backgroundColor = .clear
    newHostingController.view.frame = bounds
    addSubview(newHostingController.view)

    hostingController = newHostingController
  }
}
