package voltra.dynamicwidget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Intent
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows

@RunWith(RobolectricTestRunner::class)
class VoltraWidgetConfigurationScreenTest {
    private val asset =
        """
        {
          "scores": [
            { "name": "team", "title": "voltra_widget_scores_param_team_title", "dynamicOptions": true },
            {
              "name": "units",
              "title": "voltra_widget_scores_param_units_title",
              "options": [
                { "value": "metric", "title": "voltra_widget_scores_param_units_option_metric" },
                { "value": "imperial", "title": "voltra_widget_scores_param_units_option_imperial" }
              ]
            },
            { "name": "nickname" }
          ]
        }
        """.trimIndent()

    @Test
    fun parsesEveryParameterInDeclaredOrder() {
        assertEquals(
            mapOf(
                "scores" to
                    listOf(
                        ConfigurationScreenParameter("team", "voltra_widget_scores_param_team_title", null, true),
                        ConfigurationScreenParameter(
                            "units",
                            "voltra_widget_scores_param_units_title",
                            listOf(
                                "metric" to "voltra_widget_scores_param_units_option_metric",
                                "imperial" to "voltra_widget_scores_param_units_option_imperial",
                            ),
                            false,
                        ),
                        ConfigurationScreenParameter("nickname", null, null, false),
                    ),
            ),
            VoltraWidgetConfigurationScreens.parse(asset),
        )
    }

    @Test
    fun buildsRowsFromStoredChoicesFixedOptionsAndFreeText() {
        val strings =
            mapOf(
                "voltra_widget_scores_param_team_title" to "Team",
                "voltra_widget_scores_param_units_title" to "Units",
                "voltra_widget_scores_param_units_option_metric" to "Metric",
            )

        val rows =
            configurationRows(
                parameters = VoltraWidgetConfigurationScreens.parse(asset).getValue("scores"),
                storedOptions = mapOf("team" to listOf("red" to "Red Lions", "blue" to "Blue Hawks")),
                values = mapOf("team" to "blue", "units" to "metric"),
                string = strings::get,
            )

        assertEquals(
            listOf(
                ConfigurationRow.Choices("team", "Team", "blue", listOf("red" to "Red Lions", "blue" to "Blue Hawks")),
                // A missing option title falls back to the value.
                ConfigurationRow.Choices(
                    "units",
                    "Units",
                    "metric",
                    listOf(
                        "metric" to "Metric",
                        "imperial" to "imperial",
                    ),
                ),
                // A missing parameter title falls back to the name, a missing value to "".
                ConfigurationRow.Text("nickname", "nickname", ""),
            ),
            rows,
        )
    }

    @Test
    fun aDynamicParameterWithoutStoredChoicesHasNoChoices() {
        val rows =
            configurationRows(
                parameters = listOf(ConfigurationScreenParameter("team", null, null, true)),
                storedOptions = emptyMap(),
                values = mapOf("team" to ""),
                string = { null },
            )

        assertEquals(listOf(ConfigurationRow.Choices("team", "team", "", emptyList())), rows)
    }

    @Test
    fun closesWithoutDroppingThePlacementWhenItIsNotOneOfThisAppsWidgets() {
        val intent =
            Intent(AppWidgetManager.ACTION_APPWIDGET_CONFIGURE).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, 4242)

        val activity = Robolectric.buildActivity(VoltraWidgetConfigureActivity::class.java, intent).create().get()

        assertTrue(activity.isFinishing)
        val shadow = Shadows.shadowOf(activity)
        assertEquals(Activity.RESULT_OK, shadow.resultCode)
        assertEquals(4242, shadow.resultIntent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, -1))
    }
}
