package voltra.resolvable

internal object ResolvableWireKey {
    const val SENTINEL = "\$rv"
    const val DEFAULT_CASE = "default"
}

internal enum class ResolvableValueOpcode(
    val raw: Int,
) {
    ENV(0),
    WHEN(1),
    MATCH(2),
    ;

    companion object {
        fun fromRaw(raw: Int): ResolvableValueOpcode? = entries.firstOrNull { it.raw == raw }
    }
}

internal enum class ResolvableConditionOpcode(
    val raw: Int,
) {
    EQ(0),
    NE(1),
    AND(2),
    OR(3),
    NOT(4),
    IN_LIST(5),
    ;

    companion object {
        fun fromRaw(raw: Int): ResolvableConditionOpcode? = entries.firstOrNull { it.raw == raw }
    }
}
