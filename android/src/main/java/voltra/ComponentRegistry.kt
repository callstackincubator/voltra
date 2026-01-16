package voltra

/**
 * Maps component type IDs to names.
 * Must match ANDROID_COMPONENT_NAME_TO_ID in TypeScript.
 */
object ComponentRegistry {
    const val TEXT = 0
    const val COLUMN = 1
    const val ROW = 2
    const val BOX = 3
    const val SPACER = 4
    const val IMAGE = 5
    const val BUTTON = 6
    const val LINEAR_PROGRESS = 7
    const val CIRCULAR_PROGRESS = 8
    
    fun getName(id: Int): String = when (id) {
        TEXT -> "Text"
        COLUMN -> "Column"
        ROW -> "Row"
        BOX -> "Box"
        SPACER -> "Spacer"
        IMAGE -> "Image"
        BUTTON -> "Button"
        LINEAR_PROGRESS -> "LinearProgressIndicator"
        CIRCULAR_PROGRESS -> "CircularProgressIndicator"
        else -> throw IllegalArgumentException("Unknown component ID: $id")
    }
}
