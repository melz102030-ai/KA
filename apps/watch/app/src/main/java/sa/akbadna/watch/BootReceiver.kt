package sa.akbadna.watch

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat
import sa.akbadna.watch.Config.isPaired
import sa.akbadna.watch.telemetry.TelemetryService

/** Relaunch telemetry after a reboot so tracking survives the watch restarting. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        if (!ctx.isPaired()) return
        ContextCompat.startForegroundService(ctx, Intent(ctx, TelemetryService::class.java))
    }
}
