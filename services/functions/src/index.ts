/**
 * @akbadna/functions entrypoint.
 * Every export here becomes a deployed Cloud Function.
 */
import "./lib/admin.js";

export { bootstrapProfile } from "./callables/profile.js";
export { seedDemoSchool } from "./callables/seed.js";
export { createFamily, createSchoolWithClass, joinByCode, addKid } from "./callables/onboarding.js";
export { sendMessage } from "./callables/messaging.js";
export { topUpWallet } from "./callables/wallet.js";
export { submitAttendance } from "./callables/attendance.js";
export { resolveAkbadnaId, raiseSos } from "./callables/safety.js";
export { startWatchPairing, confirmWatchPairing } from "./callables/watch.js";
export { offerCarpoolTrip } from "./callables/carpool.js";
export { sendWatchCommand } from "./callables/commands.js";

export { onTelemetryPacket } from "./triggers/telemetry.js";
export { watchOfflineSweep } from "./triggers/watchdog.js";
