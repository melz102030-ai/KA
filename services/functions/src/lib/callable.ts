import { HttpsError, onCall } from "firebase-functions/v2/https";
import type { z } from "zod";
import { callables, type CallableName } from "@akbadna/core";

/**
 * Wraps a callable with: auth check, zod-validated input (from @akbadna/core),
 * and zod-validated output. Handlers stay pure domain logic.
 */
export function defineCallable<K extends CallableName>(
  key: K,
  handler: (
    input: z.infer<(typeof callables)[K]["request"]>,
    ctx: { uid: string },
  ) => Promise<z.infer<(typeof callables)[K]["response"]>>,
) {
  const spec = callables[key];
  return onCall({ region: "europe-west1" }, async (req) => {
    if (!req.auth?.uid) throw new HttpsError("unauthenticated", "sign-in required");

    const parsed = spec.request.safeParse(req.data);
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", parsed.error.issues.map((i) => i.message).join("; "));
    }

    const result = await handler(parsed.data as never, { uid: req.auth.uid });

    const out = spec.response.safeParse(result);
    if (!out.success) throw new HttpsError("internal", "handler produced an invalid response");
    return out.data;
  });
}

export { HttpsError };
