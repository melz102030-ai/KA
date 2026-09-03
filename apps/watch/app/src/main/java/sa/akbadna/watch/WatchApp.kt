package sa.akbadna.watch

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.google.firebase.FirebaseApp

class WatchApp : Application() {
    override fun onCreate() {
        super.onCreate()
        FirebaseApp.initializeApp(this)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(
                NotificationChannel(
                    CHANNEL_SERVICE,
                    "مزامنة أكبادنا",
                    NotificationManager.IMPORTANCE_MIN,
                ),
            )
            nm.createNotificationChannel(
                NotificationChannel(
                    CHANNEL_ALERT,
                    "تنبيهات",
                    NotificationManager.IMPORTANCE_HIGH,
                ),
            )
        }
    }

    companion object {
        const val CHANNEL_SERVICE = "svc"
        const val CHANNEL_ALERT = "alert"
    }
}
