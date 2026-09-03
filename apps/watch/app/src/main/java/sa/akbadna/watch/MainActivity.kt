package sa.akbadna.watch

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import sa.akbadna.watch.Config.isPaired
import sa.akbadna.watch.pairing.PairingActivity
import sa.akbadna.watch.telemetry.TelemetryService

class MainActivity : AppCompatActivity() {

    private val permissions = ActivityResultContracts.RequestMultiplePermissions()
    private val requestPerms = registerForActivityResult(permissions) { startSyncIfReady() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        if (!isPaired()) {
            startActivity(Intent(this, PairingActivity::class.java))
            finish()
            return
        }

        findViewById<TextView>(R.id.state).text = getString(R.string.state_active)
        ensurePermissions()
    }

    private fun ensurePermissions() {
        val needed = buildList {
            add(Manifest.permission.ACCESS_FINE_LOCATION)
            add(Manifest.permission.BODY_SENSORS)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) add(Manifest.permission.ACTIVITY_RECOGNITION)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) add(Manifest.permission.POST_NOTIFICATIONS)
        }.filter { ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED }

        if (needed.isEmpty()) startSyncIfReady() else requestPerms.launch(needed.toTypedArray())
    }

    private fun startSyncIfReady() {
        ContextCompat.startForegroundService(this, Intent(this, TelemetryService::class.java))
    }
}
