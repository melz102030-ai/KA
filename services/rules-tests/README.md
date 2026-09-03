# @akbadna/rules-tests

Security-rules tests for `../../firestore.rules`, run against the Firestore
emulator. **Standalone** — not part of the npm workspace (keeps `firebase-tools`
out of the main install). Needs **Java 11+**.

```bash
cd services/rules-tests
npm install
npm test          # firebase emulators:exec --only firestore "vitest run"
```

Covers: self-only profiles & memberships, guardian-only kid creation, the
function-owned `live` block, join-code create/usage, thread participation,
guardian-only wallet.
