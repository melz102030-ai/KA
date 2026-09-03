import { httpsCallable } from "firebase/functions";
import {
  callables,
  type CallableName,
  type CallableRequest,
  type CallableResponse,
} from "@akbadna/core";
import { functions } from "./firebase";

/**
 * Typed wrapper over Firebase callables. Input is validated with the shared
 * zod schema before it leaves the device; the response is parsed on the way back.
 */
export async function call<K extends CallableName>(
  name: K,
  payload: CallableRequest<K>,
): Promise<CallableResponse<K>> {
  const spec = callables[name];
  const input = spec.request.parse(payload);
  const fn = httpsCallable(functions, spec.name);
  const res = await fn(input);
  return spec.response.parse(res.data) as CallableResponse<K>;
}
