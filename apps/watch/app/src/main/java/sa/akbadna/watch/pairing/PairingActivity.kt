package sa.akbadna.watch.pairing

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import sa.akbadna.watch.MainActivity
import sa.akbadna.watch.R

/** Enter the pairing code shown in the parent app. */
class PairingActivity : AppCompatActivity() {

    private val repo by lazy { PairingRepository(this) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_pairing)

        val input = findViewById<EditText>(R.id.codeInput)
        val submit = findViewById<Button>(R.id.submit)
        val status = findViewById<TextView>(R.id.status)

        submit.setOnClickListener {
            val code = input.text.toString().trim()
            if (code.length < 4) {
                status.text = getString(R.string.pairing_code_hint)
                return@setOnClickListener
            }
            submit.isEnabled = false
            status.text = getString(R.string.pairing_working)
            lifecycleScope.launch {
                repo.confirm(code)
                    .onSuccess {
                        startActivity(Intent(this@PairingActivity, MainActivity::class.java))
                        finish()
                    }
                    .onFailure {
                        submit.isEnabled = true
                        status.text = getString(R.string.pairing_failed)
                    }
            }
        }
    }
}
