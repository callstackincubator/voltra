# ADR 0015: A configuration screen for Android Dynamic Widgets

Status: Proposed

## Context

ADR 0006 gives each Android placement its own configuration, written by the
app with `setWidgetInstanceConfiguration`. It left the launcher-side flow
(`android:configure`, a configuration activity, `widgetFeatures`) for its own
decision, because declaring it changes what happens when anyone places the
widget. Until now the app is the only place to change a placement's values,
while on iOS the same `appIntent.parameters` generate the system Edit Widget
sheet. ADR 0014 adds `dynamicOptions`, whose choices the user cannot pick on
Android without a screen the app builds itself (#400).

What Android provides, from the platform documentation:

- A provider declares `android:configure`, an activity the host starts with
  `ACTION_APPWIDGET_CONFIGURE`. By default it starts once, right after the user
  adds the widget. If it returns `RESULT_CANCELED`, "the host will cancel the
  add and not display this AppWidget".
- `widgetFeatures="reconfigurable"` lets the user open it again from the
  widget's long-press menu, and `configuration_optional` skips it on add. The
  Glance guide says both are "only available starting in Android 12 (API level
  31)"; earlier versions ignore them. `AppWidgetProviderInfo` calls them
  "hints to the widget host".
- The Glance guide says the system sends no first update when a configuration
  activity is launched, and the activity must request it. The
  `AppWidgetManager` reference says a `RESULT_OK` does send one.
- A widget pinned with `requestPinAppWidget` never shows the activity.

minSdk is 24.

## Decision

### Opt-in per widget

A widget declares `configurationScreen: true` in the Android plugin config. It
needs `entry` and `appIntent.parameters`; Expo prebuild rejects it otherwise.
Voltra Apply does not declare the activity, so it stops with an error rather
than drop the flag. Widgets that do not opt in are unchanged, and so is an app
where none does: the activity is declared only while a widget opts in.

### Android 12 and newer only

The plugin keeps writing `res/xml/voltra_widget_<id>_info.xml` without the
activity, and writes an Android 12+ copy to `res/xml-v31/` that adds
`android:configure` and `widgetFeatures="reconfigurable|configuration_optional"`.
Android picks the copy through the platform-version resource qualifier.

So on Android 12+ adding the widget does not open the screen, and Reconfigure
does. Below Android 12 nothing changes: without `configuration_optional` the
screen would open on every add, backing out of it would drop the widget, and
there would be no Reconfigure. A copy for a widget that no longer opts in is
removed.

### Every parameter

The screen lists every `appIntent` parameter in declared order, as iOS does:

- fixed `options` as a single-choice list,
- `dynamicOptions` as a single-choice list of the choices the app set with
  `setWidgetParameterOptions`, or a message to open the app when there are
  none yet,
- anything else as free text.

Each row shows the value the placement renders with now, all layers merged. The
plugin writes `assets/voltra/widget_configuration_screens.json` with each
parameter and the `voltra_widgets.xml` string names of its title and option
titles, so the activity reads localized copy from the app's resources without
its own copy of the resource-name rules. A missing title falls back to the
parameter name, a missing option title to its value.

### Saving

OK writes the changed values as the placement's instance values in one
transaction, the same write as `setWidgetInstanceConfiguration`, recomputes the
server-update scope (ADR 0007), and redraws that placement. Cancel or back
leaves without writing. Either way the placement is redrawn, so a launcher that
opens the screen on add despite `configuration_optional` still gets its first
render.

The activity always returns `RESULT_OK` with the `appWidgetId`, so no way out
can make a launcher drop the widget.

### Safety

The activity is exported, since the launcher starts it. It configures only a
placement that `DynamicWidgetInstanceResolver` resolves to one of the app's own
Dynamic Widgets (ADR 0006) and that opted in; anything else closes the screen
without writing.

## Consequences

- Android 12+ users can change a placement's values from the Home Screen, with
  the same parameters iOS shows. The app-side APIs are unchanged.
- Below Android 12, and for pinned widgets until the user picks Reconfigure,
  the app stays the only place to configure a placement.
- The screen is plain `AlertDialog`s in a translucent activity. It does not
  start the React Native runtime, and it does not look like the app.
- Launchers other than the Pixel launcher may treat the `widgetFeatures` hints
  differently. Returning `RESULT_OK` on every way out limits the damage to the
  screen opening on add.

## Not decided here

- A screen below Android 12.
- Opening a screen of the host app instead of the built-in one.
- Validation of free-text values.
