import os
import SwiftUI
import UIKit

@objc public class VoltraViewRoot: UIView {
  private var hostingController: UIHostingController<Voltra>?
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
    let hostingController = UIHostingController(rootView: Voltra(root: .empty, activityId: viewId))
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

  /// Updates the existing hosting controller in place. SwiftUI then diffs the new tree against the
  /// previous one, so `animation`, `transition` and `contentTransition` modifiers animate between
  /// payloads and view state survives updates, as it does in widgets and Live Activities.
  private func updateView() {
    hostingController?.rootView = Voltra(root: root, activityId: viewId)
  }
}
