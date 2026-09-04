package com.example.app.widget

import voltra.widget.VoltraClientWidgetReceiver
import voltra.widget.VoltraWidgetReceiver

/**
 * Generated-receiver-style test fixtures for [voltra.widget.VoltraWidgetKindResolverTest]. Named
 * and packaged to match the `<packageName>.widget.VoltraWidget_<id>Receiver` convention
 * ([voltra.widget.VoltraWidgetReceivers]) so [voltra.widget.VoltraWidgetKindResolver] can find
 * them by reflection, exactly as it would find a real generated receiver in a fresh process
 * before any widget instance has been placed.
 */
@Suppress("ktlint:standard:class-naming")
class VoltraWidget_resolverPayloadTestReceiver : VoltraWidgetReceiver() {
    override val widgetId: String = "resolverPayloadTest"
}

@Suppress("ktlint:standard:class-naming")
class VoltraWidget_resolverDynamicTestReceiver : VoltraClientWidgetReceiver() {
    override val widgetId: String = "resolverDynamicTest"
}

/** Matches the naming convention but is not a [VoltraWidgetReceiver] at all. */
@Suppress("ktlint:standard:class-naming")
class VoltraWidget_resolverNotAReceiverTestReceiver
