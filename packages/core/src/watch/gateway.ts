import type { SmsCommandKey } from "./kt37.js";
import type { TelemetryPacket } from "../schema/watch.js";

/**
 * Abstraction over "how we talk to a watch". The APK path writes telemetry
 * directly; the SMS bridge and a future SeTracker/GT06 bridge implement the same
 * surface so callers (functions, admin tools) never branch on transport.
 */
export interface WatchGateway {
  readonly kind: "apk" | "sms" | "setracker_bridge";

  /** Push a control command to the device. Resolves when dispatched, not when acked. */
  sendCommand(
    watchId: string,
    command: SmsCommandKey,
    params?: Record<string, string | number>,
  ): Promise<{ dispatched: boolean; detail?: string }>;

  /** Request an immediate position report (best-effort). */
  requestPosition(watchId: string): Promise<void>;

  /** Normalise a raw inbound message from the transport into a TelemetryPacket. */
  parseInbound?(raw: unknown): TelemetryPacket | null;
}

/** No-op gateway for tests / unpaired devices. */
export const nullGateway: WatchGateway = {
  kind: "apk",
  async sendCommand() {
    return { dispatched: false, detail: "no gateway configured" };
  },
  async requestPosition() {},
};
