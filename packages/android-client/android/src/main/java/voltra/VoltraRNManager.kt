package voltra

import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class VoltraRNManager : SimpleViewManager<VoltraRN>() {
    companion object {
        const val NAME = "AndroidVoltraView"
    }

    override fun getName() = NAME

    override fun createViewInstance(context: ThemedReactContext) = VoltraRN(context)

    @ReactProp(name = "payload")
    fun setPayload(
        view: VoltraRN,
        payload: String?,
    ) {
        if (payload != null) view.setPayload(payload)
    }

    @ReactProp(name = "viewId")
    fun setViewId(
        view: VoltraRN,
        viewId: String?,
    ) {
        if (viewId != null) view.setViewId(viewId)
    }
}
