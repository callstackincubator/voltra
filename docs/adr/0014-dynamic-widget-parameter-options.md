# ADR 0014: Configuration choices the app sets at runtime

Status: Proposed

## Context

An `appIntent` parameter can list fixed `options` in app.json, and the platform
draws a picker from them: the Edit Widget sheet on iOS. Many widgets pick from
the user's own data instead (the teams they follow, their accounts, the places
they saved), which is only known at runtime and changes while the widget is
placed. Until now such a parameter could only be a free-text field.

ADR 0006 gives each Android placement its own configuration, and ADR 0007
sends each placement's merged configuration on its server request
(`configuration=` and `instance=`), so a choice that ends up in
`env.configuration` already gets its own render, fetch and cache.

## Decision

### Declaring the parameter

A parameter declares `dynamicOptions: true` in place of `options`. It cannot
also declare `options` or a `default`: the first choice is the default. Expo
prebuild validates this in `@use-voltra/expo-plugin`. Voltra Apply does not
generate what the parameter needs on iOS, so it stops with an error rather
than dropping it.

### Setting the choices

The app calls `setWidgetParameterOptions(widgetId, parameter, options)` with
`options: { value: string; title: string }[]`, in the order it wants them
shown. The call is the same on both platforms and:

- throws before reaching native code when an option's `value` or `title` is
  not a string, or a `value` is empty or repeated;
- rejects with `VOLTRA_WIDGET_NOT_FOUND` when the widget is not one of the
  app's widgets, `VOLTRA_WIDGET_KIND_MISMATCH` when it is a payload-driven
  widget (the ADR 0000 kind check), and `VOLTRA_WIDGET_PARAMETER_NOT_DECLARED`
  when the widget does not declare that parameter with `dynamicOptions: true`.
  Nothing is stored when it rejects;
- replaces that parameter's stored choices and redraws the widget's
  placements.

The build step tells the native side which parameters are declared: an
Info.plist key `Voltra_DynamicWidgetParameters` (`{ widgetId: [parameter] }`,
listing every Dynamic Widget) on iOS, and the asset
`voltra/widget_dynamic_parameters.json` on Android.

### Resolving a placement's value

`env.configuration[parameter]` is, for each declared `dynamicOptions`
parameter:

1. the placement's own value, when it is still one of the current choices;
2. otherwise the first choice: a placement that was never configured, or
   whose value the app has since removed, falls back to it;
3. `""` when there are no choices, including before the app has set any, so a
   widget can ask the user to set something up in the app.

Only declared parameters are resolved. Choices stored under any other name
never reach `env.configuration`, so they cannot change a placement's ADR 0007
instance key. On iOS the generated App Intent reads only declared parameters;
on Android `VoltraConfigurationStore` resolves only the names the asset lists.

The resolved value is what the renderer, the instance key and the server
request all see, so server-driven widgets fetch and cache per choice with no
change to ADR 0007. A URL per placement (placeholders filled from the
configuration) is not part of this decision; a server routes on the
`configuration` query argument.

### Storage and clearing

On iOS the choices live in one App Group `UserDefaults` key per widget,
`Voltra_Widget_ParameterOptions_<widgetId>`, holding `{ parameter: options }`;
the generated `EntityQuery` in the extension reads it. Widget ids and
parameter names may both contain `_`, so a key per widget and parameter could
be shared by two pairs. On Android each parameter has its own DataStore key,
`voltra.options.<widgetId>.<parameter>`, which cannot collide because neither
part may contain `.`.

The choices belong to the user, so `clearWidget` and `clearAllWidgets` (and
`clearAndroidWidget` and `clearAllAndroidWidgets`) remove them. The orphan
cleanup that runs for unplaced widgets does not, since the app may set choices
before the first placement.

### Picking a value per placement

On iOS the parameter becomes an `AppEntity` whose `EntityQuery` lists the
stored choices, so the Edit Widget sheet shows them as a picker.

On Android a placement's value is written with
`setWidgetInstanceConfiguration` (ADR 0006). A native picker launched from
`android:configure` and long-press Reconfigure is left to its own proposal: it
has to decide which parameters it covers (static and dynamic alike, as the
iOS sheet does), which widgets get it, and what happens below Android 12,
where `widgetFeatures` is ignored and the screen would open on every
placement.

## Consequences

- Per-user lists drive each placement independently on both platforms, with
  no server change beyond reading `configuration`.
- Removing a choice silently moves the placements that used it to the first
  choice. That is deliberate: a placement pointing at something the user no
  longer follows is worse than a reasonable default.
- `Voltra_DynamicWidgetParameters` is another Info.plist key the config plugin
  and Voltra Apply keep in sync with app.json.
