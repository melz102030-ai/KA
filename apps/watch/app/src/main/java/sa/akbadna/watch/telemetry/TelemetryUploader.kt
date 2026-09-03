package sa.akbadna.watch.telemetry

import android.content.Context
import android.provider.Settings
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.ktx.firestore
import com.google.firebase.ktx.Firebase
import kotlinx.coroutines.tasks.await
import sa.akbadna.watch.Config
import sa.akbadna.watch.Config.watchId

/**
 * Writes a TelemetryPacket to `telemetry/{watchId}/packets/{autoId}`.
 * Shape matches @akbadna/core `TelemetryPacket`.
 */
class TelemetryUploader(private val ctx: Context) {

    private val db = Firebase.firestore

    suspend fun upload(sensors: SensorReader.Snapshot, fix: LocationReader.Fix?, sos: Boolean, fall: Boolean) {
        val watchId = ctx.watchId ?: return
        val now = System.currentTimeMillis()

        val packet = hashMapOf<String, Any?>(
            "watchId" to watchId,
            "imei" to imei(),
            "at" to now,
            "receivedAt" to Timestamp.now(),
            "batteryPct" to sensors.batteryPct,
            "charging" to sensors.charging,
            "heartRate" to sensors.heartRate,
            "skinTempC" to sensors.skinTempC,
            "steps" to sensors.steps,
            "simPresent" to sensors.simPresent,
            "sos" to sos,
            "fall" to fall,
            "source" to "apk",
        )
        if (fix != null) {
            packet["location"] = mapOf("lat" to fix.lat, "lng" to fix.lng, "accuracy" to fix.accuracy)
        }
        packet.values.removeAll { it == null }

        db.collection("telemetry").document(watchId)
            .collection("packets").add(packet).await()

        // keep a lightweight "last seen" on the watch doc too
        db.collection("watches").document(watchId)
            .set(mapOf("lastSeenAt" to now, "batteryPct" to sensors.batteryPct), com.google.firebase.firestore.SetOptions.merge())
            .await()
        FieldValue.serverTimestamp()
    }

    @Suppress("HardwareIds")
    private fun imei(): String =
        Settings.Secure.getString(ctx.contentResolver, Settings.Secure.ANDROID_ID).take(15).padStart(15, '0')
}
