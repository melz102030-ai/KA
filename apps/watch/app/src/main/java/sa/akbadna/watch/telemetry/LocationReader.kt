package sa.akbadna.watch.telemetry

import android.annotation.SuppressLint
import android.content.Context
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import kotlinx.coroutines.tasks.await

/** Single high-accuracy fix via fused location (GPS + AGPS + WiFi + LBS on the KT37). */
class LocationReader(ctx: Context) {

    private val client = LocationServices.getFusedLocationProviderClient(ctx)

    data class Fix(val lat: Double, val lng: Double, val accuracy: Float?)

    @SuppressLint("MissingPermission") // caller ensures ACCESS_FINE_LOCATION was granted
    suspend fun current(): Fix? = runCatching {
        val loc = client.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, null).await()
        loc?.let { Fix(it.latitude, it.longitude, if (it.hasAccuracy()) it.accuracy else null) }
    }.getOrNull()
}
