package sa.akbadna.watch.telemetry

import android.app.Notification
import android.app.Service
import android.content.Intent
import android.os.IBinder
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import sa.akbadna.watch.Config
import sa.akbadna.watch.WatchApp

/**
 * Foreground service: every UPLOAD_INTERVAL_MS reads sensors + location and
 * uploads one telemetry packet. Restarts on boot (see BootReceiver).
 */
class TelemetryService : Service() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private lateinit var sensors: SensorReader
    private lateinit var location: LocationReader
    private lateinit var uploader: TelemetryUploader
    private var loop: Job? = null

    override fun onCreate() {
        super.onCreate()
        sensors = SensorReader(this)
        location = LocationReader(this)
        uploader = TelemetryUploader(this)
        startForeground(NOTIF_ID, notification())
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (loop?.isActive != true) loop = scope.launch { runLoop() }
        return START_STICKY
    }

    private suspend fun runLoop() {
        while (scope.isActive) {
            runCatching {
                val snap = sensors.read()
                val fix = location.current()
                uploader.upload(snap, fix, sos = false, fall = false)
            }
            delay(Config.UPLOAD_INTERVAL_MS)
        }
    }

    private fun notification(): Notification =
        NotificationCompat.Builder(this, WatchApp.CHANNEL_SERVICE)
            .setContentTitle("أكبادنا")
            .setContentText("المزامنة نشطة")
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setOngoing(true)
            .build()

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        private const val NOTIF_ID = 1001
    }
}
