package voltra.resolvable

import android.util.Log
import kotlin.math.floor

private const val TAG = "ResolvableValue"

/**
 * Parses and evaluates Voltra `$rv` resolvable payloads (same wire format as iOS).
 */
internal object ResolvableValueEvaluator {
    fun resolveRoot(
        value: Any?,
        environment: ResolvableRuntimeEnvironment,
    ): Any? {
        if (!containsResolvable(value)) {
            return value
        }
        return try {
            val parsed = parse(value)
            evaluate(parsed, environment)
        } catch (e: Exception) {
            logWarning("Failed to resolve value: ${e.message}", e)
            null
        }
    }

    private sealed class Parsed {
        data class Literal(
            val value: Any?,
        ) : Parsed()

        data class ArrayVal(
            val items: List<Parsed>,
        ) : Parsed()

        data class Obj(
            val map: Map<String, Parsed>,
        ) : Parsed()

        data class Expr(
            val expr: ResolvableExpr,
        ) : Parsed()
    }

    private sealed class ResolvableExpr {
        data class Env(
            val envId: Int,
        ) : ResolvableExpr()

        data class When(
            val condition: Condition,
            val thenValue: Parsed,
            val elseValue: Parsed,
        ) : ResolvableExpr()

        data class Match(
            val value: Parsed,
            val cases: Map<String, Parsed>,
        ) : ResolvableExpr()
    }

    private sealed class Condition {
        data class Eq(
            val left: Parsed,
            val right: Parsed,
        ) : Condition()

        data class Ne(
            val left: Parsed,
            val right: Parsed,
        ) : Condition()

        data class And(
            val conditions: List<Condition>,
        ) : Condition()

        data class Or(
            val conditions: List<Condition>,
        ) : Condition()

        data class Not(
            val condition: Condition,
        ) : Condition()

        data class InList(
            val value: Parsed,
            val values: List<Parsed>,
        ) : Condition()
    }

    private fun parse(value: Any?): Parsed =
        when (value) {
            null, is String, is Boolean, is Number -> {
                Parsed.Literal(value)
            }

            is List<*> -> {
                Parsed.ArrayVal(value.map { parse(it) })
            }

            is Map<*, *> -> {
                @Suppress("UNCHECKED_CAST")
                val map = value as Map<String, Any?>
                if (ResolvableWireKey.SENTINEL in map) {
                    Parsed.Expr(parseWrappedExpression(map))
                } else {
                    val parsed =
                        map.mapValues { (_, nested) ->
                            parse(nested)
                        }
                    Parsed.Obj(parsed)
                }
            }

            else -> {
                Parsed.Literal(value)
            }
        }

    private fun parseWrappedExpression(map: Map<String, Any?>): ResolvableExpr {
        require(map.size == 1) { "Invalid wrapped resolvable value" }
        val tupleValue = map[ResolvableWireKey.SENTINEL] ?: error("Missing \$rv tuple")
        require(tupleValue is List<*>) { "Invalid resolvable tuple" }
        @Suppress("UNCHECKED_CAST")
        val tuple = tupleValue as List<Any?>
        val opcodeRaw = tuple.firstOrNull().asOpcodeInt() ?: error("Invalid resolvable opcode")
        val opcode =
            ResolvableValueOpcode.fromRaw(opcodeRaw) ?: error("Unknown resolvable opcode: $opcodeRaw")
        return when (opcode) {
            ResolvableValueOpcode.ENV -> {
                require(tuple.size == 2) { "Invalid env tuple" }
                val envId = tuple[1].asOpcodeInt() ?: error("Invalid environment id")
                ResolvableExpr.Env(envId)
            }

            ResolvableValueOpcode.WHEN -> {
                require(tuple.size == 4) { "Invalid when tuple" }
                ResolvableExpr.When(
                    condition = parseCondition(tuple[1]),
                    thenValue = parse(tuple[2]),
                    elseValue = parse(tuple[3]),
                )
            }

            ResolvableValueOpcode.MATCH -> {
                require(tuple.size == 3) { "Invalid match tuple" }
                val casesRaw = tuple[2]
                require(casesRaw is Map<*, *>) { "Invalid match cases" }
                @Suppress("UNCHECKED_CAST")
                val casesMap = casesRaw as Map<String, Any?>
                val parsedCases = casesMap.mapValues { (_, v) -> parse(v) }
                require(
                    ResolvableWireKey.DEFAULT_CASE in parsedCases,
                ) { "Resolvable match expression is missing a default case" }
                ResolvableExpr.Match(value = parse(tuple[1]), cases = parsedCases)
            }
        }
    }

    private fun parseCondition(value: Any?): Condition {
        require(value is List<*>) { "Invalid resolvable condition tuple" }
        @Suppress("UNCHECKED_CAST")
        val tuple = value as List<Any?>
        val opcodeRaw = tuple.firstOrNull().asOpcodeInt() ?: error("Invalid condition opcode")
        val opcode =
            ResolvableConditionOpcode.fromRaw(opcodeRaw)
                ?: error("Unknown resolvable condition opcode: $opcodeRaw")
        return when (opcode) {
            ResolvableConditionOpcode.EQ -> {
                require(tuple.size == 3) { "Invalid eq tuple" }
                Condition.Eq(parse(tuple[1]), parse(tuple[2]))
            }

            ResolvableConditionOpcode.NE -> {
                require(tuple.size == 3) { "Invalid ne tuple" }
                Condition.Ne(parse(tuple[1]), parse(tuple[2]))
            }

            ResolvableConditionOpcode.AND -> {
                require(tuple.size == 2 && tuple[1] is List<*>) { "Invalid and tuple" }
                @Suppress("UNCHECKED_CAST")
                val items = tuple[1] as List<Any?>
                Condition.And(items.map { parseCondition(it) })
            }

            ResolvableConditionOpcode.OR -> {
                require(tuple.size == 2 && tuple[1] is List<*>) { "Invalid or tuple" }
                @Suppress("UNCHECKED_CAST")
                val items = tuple[1] as List<Any?>
                Condition.Or(items.map { parseCondition(it) })
            }

            ResolvableConditionOpcode.NOT -> {
                require(tuple.size == 2) { "Invalid not tuple" }
                Condition.Not(parseCondition(tuple[1]))
            }

            ResolvableConditionOpcode.IN_LIST -> {
                require(tuple.size == 3 && tuple[2] is List<*>) { "Invalid inList tuple" }
                @Suppress("UNCHECKED_CAST")
                val items = tuple[2] as List<Any?>
                Condition.InList(parse(tuple[1]), items.map { parse(it) })
            }
        }
    }

    private fun evaluate(
        parsed: Parsed,
        environment: ResolvableRuntimeEnvironment,
    ): Any? =
        when (parsed) {
            is Parsed.Literal -> parsed.value
            is Parsed.ArrayVal -> parsed.items.map { evaluate(it, environment) }
            is Parsed.Obj -> parsed.map.mapValues { (_, v) -> evaluate(v, environment) }
            is Parsed.Expr -> evaluate(parsed.expr, environment)
        }

    private fun evaluate(
        expr: ResolvableExpr,
        environment: ResolvableRuntimeEnvironment,
    ): Any? =
        when (expr) {
            is ResolvableExpr.Env -> {
                environment.envValue(expr.envId)
            }

            is ResolvableExpr.When -> {
                if (evaluate(expr.condition, environment)) {
                    evaluate(expr.thenValue, environment)
                } else {
                    evaluate(expr.elseValue, environment)
                }
            }

            is ResolvableExpr.Match -> {
                val resolved = evaluate(expr.value, environment)
                val key = matchCaseKey(resolved)
                val branch = expr.cases[key] ?: expr.cases[ResolvableWireKey.DEFAULT_CASE]
                if (branch == null) {
                    logWarning("Resolvable match missing default case", null)
                    null
                } else {
                    evaluate(branch, environment)
                }
            }
        }

    private fun evaluate(
        condition: Condition,
        environment: ResolvableRuntimeEnvironment,
    ): Boolean =
        when (condition) {
            is Condition.Eq -> {
                jsonEquals(
                    evaluate(condition.left, environment),
                    evaluate(condition.right, environment),
                )
            }

            is Condition.Ne -> {
                !jsonEquals(
                    evaluate(condition.left, environment),
                    evaluate(condition.right, environment),
                )
            }

            is Condition.And -> {
                condition.conditions.all { evaluate(it, environment) }
            }

            is Condition.Or -> {
                condition.conditions.any { evaluate(it, environment) }
            }

            is Condition.Not -> {
                !evaluate(condition.condition, environment)
            }

            is Condition.InList -> {
                val resolved = evaluate(condition.value, environment)
                condition.values.any { jsonEquals(evaluate(it, environment), resolved) }
            }
        }

    private fun matchCaseKey(value: Any?): String =
        when (value) {
            null -> {
                "null"
            }

            is Boolean -> {
                if (value) "true" else "false"
            }

            is Number -> {
                val d = value.toDouble()
                if (d.isFinite() && floor(d) == d && d >= Long.MIN_VALUE.toDouble() && d <= Long.MAX_VALUE.toDouble()) {
                    d.toLong().toString()
                } else {
                    d.toString()
                }
            }

            is String -> {
                value
            }

            is List<*> -> {
                value.toString()
            }

            is Map<*, *> -> {
                value.toString()
            }

            else -> {
                value.toString()
            }
        }

    private fun jsonEquals(
        a: Any?,
        b: Any?,
    ): Boolean =
        when {
            a == null && b == null -> true
            a == null || b == null -> false
            a is Number && b is Number -> a.toDouble() == b.toDouble()
            else -> a == b
        }

    private fun containsResolvable(value: Any?): Boolean =
        when (value) {
            null, is String, is Boolean, is Number -> {
                false
            }

            is Map<*, *> -> {
                @Suppress("UNCHECKED_CAST")
                val m = value as Map<String, Any?>
                m.containsKey(ResolvableWireKey.SENTINEL) || m.values.any { containsResolvable(it) }
            }

            is List<*> -> {
                value.any { containsResolvable(it) }
            }

            else -> {
                false
            }
        }

    private fun Any?.asOpcodeInt(): Int? =
        when (this) {
            is Int -> this
            is Long -> this.toInt()
            is Double -> if (floor(this) == this) this.toInt() else null
            is Float -> if (floor(this.toDouble()) == this.toDouble()) this.toInt() else null
            else -> null
        }

    /**
     * Evaluate a pre-resolved condition tuple (e.g., from `element.p["condition"]`).
     * By the time this is called, all `$rv` env references inside the tuple are already
     * replaced with literal values by [ResolvablePayloadResolver], so the environment
     * is not needed for evaluation.
     */
    internal fun evaluateCondition(conditionTuple: Any?): Boolean =
        try {
            val condition = parseCondition(conditionTuple)
            evaluate(condition, ResolvableRuntimeEnvironment { null })
        } catch (e: Exception) {
            logWarning("Failed to evaluate condition: ${e.message}", e)
            false
        }

    private fun logWarning(
        message: String,
        error: Throwable?,
    ) {
        try {
            if (error != null) {
                Log.w(TAG, message, error)
            } else {
                Log.w(TAG, message)
            }
        } catch (_: RuntimeException) {
            // Unit tests may not provide android.util.Log.
        }
    }
}
