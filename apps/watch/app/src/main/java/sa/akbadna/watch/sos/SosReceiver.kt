package sa.akbadna.watch.sos

import android.annotation.SuppressLint
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.location.LocationManager
import android.telephony.SmsManager
import com.google.firebase.functions.ktx.functions
import com.google.firebase.ktx.Firebase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import sa.akbadna.watch.Config
import sa.akbadna.watch.Config.watchId

/**
 * Fired when the KT37 SOS button is held 3s (OEM broadcasts an intent; wire the
 * exact action in the manifest for the target firmware). Calls raiseSos and, as a
 * fallback, SMS-blasts the configured SOS numbers with the last known location.
 */
class SosReceiver : BroadcastReceiver() {

    @SuppressLint("MissingPermission")
    override fun onReceive(ctx: Context, intent: Intent) {
        val watchId = ctx.watchId ?: return
        val lm = ctx.getSystemService(Context.LOCATION_SERVICE) as LocationManager
        val last = lm.getLastKnownLocation(LocationManager.GPS_PROVIDER)
        val lat = last?.latitude ?: 0.0
        val lng = last?.longitude ?: 0.0

        CoroutineScope(Dispatchers.IO).launch {
            runCatching {
                Firebase.functions(Config.FUNCTIONS_REGION)
                    .getHttpsCallable("raiseSos")
                    .call(mapOf("watchId" to watchId, "lat" to lat, "lng" to lng))
                    .await()
            }.onFailure {
                // no data link — fall back to SMS
                val sms = SmsManager.getDefault()
                val body = "استغاثة أكبادنا — https://maps.google.com/?q=$lat,$lng"
                sosNumbers(ctx).forEach { sms.sendTextMessage(it, null, body, null, null) }
            }
        }
    }

    private fun sosNumbers(ctx: Context): List<String> =
        Config.prefs(ctx).getString("sosNumbers", "")?.split(",")?.filter { it.isNotBlank() } ?: emptyList()
}
