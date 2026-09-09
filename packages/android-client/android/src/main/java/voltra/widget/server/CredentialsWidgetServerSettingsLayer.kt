package voltra.widget.server

import android.content.Context

/**
 * The deprecated `setWidgetServerCredentials` API, expressed as a settings layer.
 *
 * It reads the same encrypted token and header records it always has, which is why nothing
 * migrates. It sits below the global layer so an app that has moved to
 * `setWidgetServerUpdate({ headers: { Authorization: ... } })` overrides whatever an older call
 * left behind, rather than the other way round.
 */
class CredentialsWidgetServerSettingsLayer(
    private val context: Context,
) : WidgetServerSettingsLayer {
    override val name: String = "credentials"

    override suspend fun settings(scope: WidgetScope): WidgetServerUpdateSettings? {
        val headers = mutableMapOf<String, String>()

        VoltraWidgetCredentialStore.readToken(context)?.takeIf { it.isNotBlank() }?.let { token ->
            headers["Authorization"] = "Bearer $token"
        }

        headers.putAll(VoltraWidgetCredentialStore.readHeaders(context))

        return if (headers.isEmpty()) null else WidgetServerUpdateSettings(headers = headers)
    }
}
