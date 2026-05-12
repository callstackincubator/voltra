package voltra

import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.uimanager.ViewManager

class VoltraPackage : TurboReactPackage() {
    override fun getModule(
        name: String,
        reactContext: ReactApplicationContext,
    ): NativeModule? =
        when (name) {
            NativeVoltraAndroidSpec.NAME -> VoltraModule(reactContext)
            else -> null
        }

    override fun getReactModuleInfoProvider() =
        ReactModuleInfoProvider {
            mapOf(
                NativeVoltraAndroidSpec.NAME to
                    ReactModuleInfo(
                        NativeVoltraAndroidSpec.NAME,
                        VoltraModule::class.java.name,
                        false,
                        false,
                        false,
                        true,
                    ),
            )
        }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        listOf(VoltraRNManager())
}
