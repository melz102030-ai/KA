package sa.akbadna.watch.pairing

import android.content.Context
import android.provider.Settings
import com.google.firebase.auth.ktx.auth
import com.google.firebase.functions.ktx.functions
import com.google.firebase.ktx.Firebase
import kotlinx.coroutines.tasks.await
import sa.akbadna.watch.Config
import sa.akbadna.watch.Config.deviceToken
import sa.akbadna.watch.Config.kidId
import sa.akbadna.watch.Config.watchId

/**
 * Pairing: the parent app calls `startWatchPairing` and shows a code; the watch
 * submits it here via `confirmWatchPairing` and stores the returned identity.
 */
class PairingRepository(private val ctx: Context) {

    private val functions = Firebase.functions(Config.FUNCTIONS_REGION)

    suspend fun confirm(pairingCode: String): Result<Unit> = runCatching {
        // watch signs in anonymously; the callable binds this uid as the device
        Firebase.auth.signInAnonymously().await()

        val payload = mapOf("imei" to imei(), "pairingCode" to pairingCode.trim().uppercase())
        val res = functions.getHttpsCallable("confirmWatchPairing").call(payload).await()

        @Suppress("UNCHECKED_CAST")
        val data = res.data as Map<String, Any?>
        ctx.watchId = data["watchId"] as String
        ctx.kidId = data["kidId"] as String?
        ctx.deviceToken = data["deviceToken"] as String
    }

    @Suppress("HardwareIds")
    private fun imei(): String =
        Settings.Secure.getString(ctx.contentResolver, Settings.Secure.ANDROID_ID).take(15).padStart(15, '0')
}
