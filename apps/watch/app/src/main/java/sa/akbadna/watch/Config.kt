package sa.akbadna.watch

import android.content.Context

/** Device-side configuration and the pairing-derived identity. */
object Config {
    /** Telemetry upload cadence. KT37 minimum is 10s; 30s balances battery. */
    const val UPLOAD_INTERVAL_MS = 30_000L

    /** Cloud Functions region — must match services/functions. */
    const val FUNCTIONS_REGION = "europe-west1"

    const val LOW_BATTERY_PCT = 20

    private const val PREFS = "akbadna_watch"

    fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    var Context.watchId: String?
        get() = prefs(this).getString("watchId", null)
        set(v) = prefs(this).edit().putString("watchId", v).apply()

    var Context.kidId: String?
        get() = prefs(this).getString("kidId", null)
        set(v) = prefs(this).edit().putString("kidId", v).apply()

    var Context.deviceToken: String?
        get() = prefs(this).getString("deviceToken", null)
        set(v) = prefs(this).edit().putString("deviceToken", v).apply()

    fun Context.isPaired() = watchId != null && deviceToken != null
}
