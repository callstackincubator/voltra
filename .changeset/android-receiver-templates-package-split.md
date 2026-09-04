---
'voltra': minor
---

Generated Android widget receivers now extend the new payload/dynamic base classes
(`voltra.widget.payload.VoltraPayloadWidgetReceiver`, `voltra.widget.payload.VoltraWidgetUpdateScheduler`,
`voltra.dynamicwidget.VoltraClientWidgetReceiver`) introduced by the Android widget kind separation.
Re-run `voltra apply` after upgrading so your generated receivers pick up the new imports and superclasses.
