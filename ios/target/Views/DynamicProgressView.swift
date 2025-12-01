//
//  DynamicProgressView.swift
//  VoltraUI
//
//  Created by Wesley de Groot on 19/04/2024.
//  https://x.com/saul_sharma
//
//  https://github.com/saulsharma/voltra
//  MIT LICENCE

import SwiftUI

public struct DynamicProgressView: View {
    @Environment(\.internalVoltraUIEnvironment)
    private var voltraUIEnvironment

    private let component: VoltraUIComponent

    private var params: ProgressViewParameters? {
        component.parameters(ProgressViewParameters.self)
    }

    init(_ component: VoltraUIComponent) {
        self.component = component
    }

    public var body: some View {
        // Prefer standardized time-driven parameters when available
        let endAtMs = params?.endAtMs ?? params?.timerEndDateInMilliseconds // back-compat
        let startAtMs = params?.startAtMs
        let mode = params?.mode?.lowercased() ?? "bar"

        if let timeRange = VoltraProgressDriver.resolveRange(startAtMs: startAtMs, endAtMs: endAtMs, durationMs: nil) {
            if #available(macOS 13.0, iOS 16.0, *) {
                let view = ProgressView(timerInterval: timeRange)

                if mode == "circular" {
                    view
                        .progressViewStyle(CircularProgressViewStyle())
                        .voltraUIModifiers(component)
                } else {
                    view
                        .progressViewStyle(LinearProgressViewStyle())
                        .voltraUIModifiers(component)
                }
            } else {
                // Fallback: static determinate progress
                if mode == "circular" {
                    ProgressView(
                        "\(component.props?["title"] as? String ?? "")",
                        value: params?.defaultValue ?? 0,
                        total: params?.maximumValue ?? 100
                    )
                    .progressViewStyle(CircularProgressViewStyle())
                    .voltraUIModifiers(component)
                } else {
                    ProgressView(
                        "\(component.props?["title"] as? String ?? "")",
                        value: params?.defaultValue ?? 0,
                        total: params?.maximumValue ?? 100
                    )
                    .progressViewStyle(LinearProgressViewStyle())
                    .voltraUIModifiers(component)
                }
            }
        } else {
            // Static mode only
            if mode == "circular" {
                ProgressView(
                    "\(component.props?["title"] as? String ?? "")",
                    value: params?.defaultValue ?? 0,
                    total: params?.maximumValue ?? 100
                )
                .progressViewStyle(CircularProgressViewStyle())
                .voltraUIModifiers(component)
            } else {
                ProgressView(
                    "\(component.props?["title"] as? String ?? "")",
                    value: params?.defaultValue ?? 0,
                    total: params?.maximumValue ?? 100
                )
                .progressViewStyle(LinearProgressViewStyle())
                .voltraUIModifiers(component)
            }
        }
    }
}
