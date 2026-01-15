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
    /**
     * Get component name from numeric ID
     */
    fun getComponentName(id: Int): String? {
        return when (id) {
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
}
