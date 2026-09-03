/**
 * Runtime feature switches.
 *
 * The app runs fully on the Firebase **free (Spark) plan**: every write goes
 * client-side to Firestore, guarded by security rules. Cloud Functions (which
 * require the Blaze plan) are an optional upgrade — flip USE_FUNCTIONS to route
 * the same operations through the deployed callables instead.
 */
export const USE_FUNCTIONS = process.env.EXPO_PUBLIC_USE_FUNCTIONS === "1";
