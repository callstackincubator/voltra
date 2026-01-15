package voltra

/**
 * Maps component type IDs to names.
 * Must match ANDROID_COMPONENT_NAME_TO_ID in TypeScript.
 */
object ComponentRegistry {
    const val TEXT = 36
    const val COLUMN = 27
    const val ROW = 32
    const val BOX = 23
    const val SPACER = 34
    const val IMAGE = 4
    const val BUTTON = 24
    const val LINEAR_PROGRESS = 30
    const val CIRCULAR_PROGRESS = 26
    const val SWITCH = 7
    const val RADIO_BUTTON = 9
    const val CHECK_BOX = 8
    const val FILLED_BUTTON = 2
    const val OUTLINE_BUTTON = 31
    const val CIRCLE_ICON_BUTTON = 25
    const val SQUARE_ICON_BUTTON = 35
    const val TITLE_BAR = 37
    const val SCAFFOLD = 33
    const val LAZY_COLUMN = 28
    const val LAZY_VERTICAL_GRID = 29

    fun getName(id: Int): String =
        when (id) {
            TEXT -> "AndroidText"
            COLUMN -> "AndroidColumn"
            ROW -> "AndroidRow"
            BOX -> "AndroidBox"
            SPACER -> "AndroidSpacer"
            IMAGE -> "AndroidImage"
            BUTTON -> "AndroidButton"
            LINEAR_PROGRESS -> "AndroidLinearProgressIndicator"
            CIRCULAR_PROGRESS -> "AndroidCircularProgressIndicator"
            SWITCH -> "AndroidSwitch"
            RADIO_BUTTON -> "AndroidRadioButton"
            CHECK_BOX -> "AndroidCheckBox"
            FILLED_BUTTON -> "AndroidFilledButton"
            OUTLINE_BUTTON -> "AndroidOutlineButton"
            CIRCLE_ICON_BUTTON -> "AndroidCircleIconButton"
            SQUARE_ICON_BUTTON -> "AndroidSquareIconButton"
            TITLE_BAR -> "AndroidTitleBar"
            SCAFFOLD -> "AndroidScaffold"
            LAZY_COLUMN -> "AndroidLazyColumn"
            LAZY_VERTICAL_GRID -> "AndroidLazyVerticalGrid"
            else -> "Unknown ($id)"
        }
}
