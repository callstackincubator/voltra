//
//  ComponentTypeID.kt
//
//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

package voltra.payload

/**
 * Component type IDs mapped from data/components.json
 * IDs are assigned sequentially based on order in components.json (0-indexed)
 */
object ComponentTypeID {
    const val FILLED_BUTTON = 0
    const val IMAGE = 1
    const val SWITCH = 2
    const val CHECK_BOX = 3
    const val RADIO_BUTTON = 4
    const val BOX = 5
    const val BUTTON = 6
    const val CIRCLE_ICON_BUTTON = 7
    const val CIRCULAR_PROGRESS_INDICATOR = 8
    const val COLUMN = 9
    const val LAZY_COLUMN = 10
    const val LAZY_VERTICAL_GRID = 11
    const val LINEAR_PROGRESS_INDICATOR = 12
    const val OUTLINE_BUTTON = 13
    const val ROW = 14
    const val SCAFFOLD = 15
    const val SPACER = 16
    const val SQUARE_ICON_BUTTON = 17
    const val TEXT = 18
    const val TITLE_BAR = 19

    /**
     * Get component name from numeric ID
     */
    fun getComponentName(id: Int): String? =
        when (id) {
            0 -> "AndroidFilledButton"
            1 -> "AndroidImage"
            2 -> "AndroidSwitch"
            3 -> "AndroidCheckBox"
            4 -> "AndroidRadioButton"
            5 -> "AndroidBox"
            6 -> "AndroidButton"
            7 -> "AndroidCircleIconButton"
            8 -> "AndroidCircularProgressIndicator"
            9 -> "AndroidColumn"
            10 -> "AndroidLazyColumn"
            11 -> "AndroidLazyVerticalGrid"
            12 -> "AndroidLinearProgressIndicator"
            13 -> "AndroidOutlineButton"
            14 -> "AndroidRow"
            15 -> "AndroidScaffold"
            16 -> "AndroidSpacer"
            17 -> "AndroidSquareIconButton"
            18 -> "AndroidText"
            19 -> "AndroidTitleBar"
            else -> null
        }
}
