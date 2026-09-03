/**
 * Single source of truth for Firestore document/collection paths.
 * Keeps the client, functions and security rules in agreement.
 */
export const paths = {
  users: () => "users",
  user: (uid: string) => `users/${uid}`,

  memberships: () => "memberships",
  membership: (id: string) => `memberships/${id}`,

  schools: () => "schools",
  school: (schoolId: string) => `schools/${schoolId}`,
  classes: (schoolId: string) => `schools/${schoolId}/classes`,
  class: (schoolId: string, classId: string) => `schools/${schoolId}/classes/${classId}`,

  joinCodes: () => "joinCodes",
  joinCode: (code: string) => `joinCodes/${code}`,

  kids: () => "kids",
  kid: (kidId: string) => `kids/${kidId}`,

  watches: () => "watches",
  watch: (watchId: string) => `watches/${watchId}`,
  telemetryPackets: (watchId: string) => `telemetry/${watchId}/packets`,
  vitalsRollups: (watchId: string) => `telemetry/${watchId}/rollups`,

  attendanceSessions: (schoolId: string) => `schools/${schoolId}/attendanceSessions`,
  attendanceSession: (schoolId: string, sessionId: string) =>
    `schools/${schoolId}/attendanceSessions/${sessionId}`,
  attendanceRecords: (schoolId: string, sessionId: string) =>
    `schools/${schoolId}/attendanceSessions/${sessionId}/records`,
  attendanceSummary: (kidId: string) => `kids/${kidId}/attendanceSummary/current`,
  rewards: () => "rewards",

  threads: () => "threads",
  thread: (threadId: string) => `threads/${threadId}`,
  messages: (threadId: string) => `threads/${threadId}/messages`,

  carpoolTrips: () => "carpoolTrips",
  carpoolTrip: (tripId: string) => `carpoolTrips/${tripId}`,
  carpoolRequests: (tripId: string) => `carpoolTrips/${tripId}/requests`,

  walletAccount: (kidId: string) => `walletAccounts/${kidId}`,
  walletTransactions: (kidId: string) => `walletAccounts/${kidId}/transactions`,

  geofences: () => "geofences",
  alerts: () => "alerts",
  contacts: () => "contacts",
} as const;
