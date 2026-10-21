# voltra_js_renderer.cpp throws this class by name through JNI (FindClass + GetMethodID), so R8
# must neither rename it nor strip its constructor. See ADR 0013.
-keep class voltra.dynamicwidget.VoltraJSException {
    <init>(java.lang.String, java.lang.String);
}
