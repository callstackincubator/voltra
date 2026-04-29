package voltra.resolvable

import voltra.styling.VoltraThemeColorRole

/**
 * Runtime inputs for evaluating `$rv` payloads. Android widgets resolve Material color env IDs to
 * the same `~` tokens consumed by [voltra.styling.JSColorParser].
 */
fun interface ResolvableRuntimeEnvironment {
    fun envValue(envId: Int): Any?
}

/** Default Android widget environment: iOS-only env IDs are absent; Material roles map to `~` tokens. */
object AndroidWidgetResolvableEnvironment : ResolvableRuntimeEnvironment {
    private const val FIRST_ANDROID_MATERIAL_ENV_ID = 2

    override fun envValue(envId: Int): Any? {
        if (envId < FIRST_ANDROID_MATERIAL_ENV_ID) {
            return null
        }
        val index = envId - FIRST_ANDROID_MATERIAL_ENV_ID
        val roles = VoltraThemeColorRole.entries
        if (index !in roles.indices) {
            return null
        }
        return roles[index].token
    }
}
