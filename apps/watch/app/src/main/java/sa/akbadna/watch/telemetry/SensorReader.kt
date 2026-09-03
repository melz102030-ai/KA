package sa.akbadna.watch.telemetry

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.BatteryManager
import android.telephony.TelephonyManager
import kotlin.coroutines.resume
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull

/** Reads the KT37 health + device sensors. */
class SensorReader(private val ctx: Context) {

    private val sm = ctx.getSystemService(Context.SENSOR_SERVICE) as SensorManager

    data class Snapshot(
        val heartRate: Int?,
        val steps: Int?,
        val batteryPct: Int?,
        val charging: Boolean?,
        val skinTempC: Double?,
        val simPresent: Boolean?,
    )

    suspend fun read(): Snapshot = Snapshot(
        heartRate = sampleInt(Sensor.TYPE_HEART_RATE),
        steps = sampleInt(Sensor.TYPE_STEP_COUNTER),
        batteryPct = battery().first,
        charging = battery().second,
        skinTempC = sampleDouble(Sensor.TYPE_AMBIENT_TEMPERATURE), // some 2025 KT37 batches
        simPresent = simPresent(),
    )

    private suspend fun sampleInt(type: Int): Int? = sample(type)?.toInt()
    private suspend fun sampleDouble(type: Int): Double? = sample(type)?.toDouble()

    /** Registers for a single reading, then unregisters. Null if the sensor is absent. */
    private suspend fun sample(type: Int): Float? {
        val sensor = sm.getDefaultSensor(type) ?: return null
        return withTimeoutOrNull(4_000) {
            suspendCancellableCoroutine { cont ->
                val l = object : SensorEventListener {
                    override fun onSensorChanged(e: SensorEvent) {
                        sm.unregisterListener(this)
                        if (cont.isActive) cont.resume(e.values.firstOrNull())
                    }
                    override fun onAccuracyChanged(s: Sensor?, a: Int) {}
                }
                sm.registerListener(l, sensor, SensorManager.SENSOR_DELAY_FASTEST)
                cont.invokeOnCancellation { sm.unregisterListener(l) }
            }
        }
    }

    private fun battery(): Pair<Int?, Boolean?> {
        val i = ctx.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED)) ?: return null to null
        val level = i.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
        val scale = i.getIntExtra(BatteryManager.EXTRA_SCALE, -1)
        val pct = if (level >= 0 && scale > 0) level * 100 / scale else null
        val status = i.getIntExtra(BatteryManager.EXTRA_STATUS, -1)
        val charging = status == BatteryManager.BATTERY_STATUS_CHARGING ||
            status == BatteryManager.BATTERY_STATUS_FULL
        return pct to charging
    }

    private fun simPresent(): Boolean? = runCatching {
        val tm = ctx.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
        tm.simState == TelephonyManager.SIM_STATE_READY
    }.getOrNull()
}
