import { paths } from "@akbadna/core";
import { db, now } from "../lib/admin.js";
import { defineCallable } from "../lib/callable.js";

/** A driver-parent offers a recurring ride. */
export const offerCarpoolTrip = defineCallable("offerCarpoolTrip", async (input, { uid }) => {
  const ref = db.collection(paths.carpoolTrips()).doc();
  await ref.set({
    id: ref.id,
    schoolId: input.schoolId,
    driverUid: uid,
    direction: input.direction,
    status: "offered",
    seatsTotal: input.seatsTotal,
    seatsTaken: 0,
    vehicle: input.vehicle,
    weekDays: input.weekDays,
    riders: [],
    createdAt: now(),
    updatedAt: now(),
  });
  return { tripId: ref.id };
});
