import { z } from "zod";
import { Audit, EpochMillis } from "../common.js";
import { MessageChannel } from "../enums.js";

/** threads/{threadId} — a conversation between two or more participants. */
export const Thread = Audit.extend({
  id: z.string().min(1),
  channel: MessageChannel,
  title: z.string().optional(),
  participantUids: z.array(z.string()).min(1),
  /** Context this thread hangs off, e.g. a kid, class or carpool trip. */
  subjectRef: z
    .object({ kind: z.enum(["kid", "class", "trip", "school"]), id: z.string() })
    .optional(),
  lastMessage: z.object({ text: z.string(), senderUid: z.string(), at: EpochMillis }).optional(),
  /** uid -> unread count. */
  unread: z.record(z.string(), z.number().int().nonnegative()).default({}),
});
export type Thread = z.infer<typeof Thread>;

/** threads/{threadId}/messages/{messageId} */
export const Message = z.object({
  id: z.string().min(1),
  threadId: z.string().min(1),
  senderUid: z.string().min(1),
  senderName: z.string().min(1),
  text: z.string().min(1).max(4000),
  at: EpochMillis,
  /** System messages (alerts, auto-notices) render differently and can't be replied to. */
  system: z.boolean().default(false),
  attachments: z
    .array(z.object({ kind: z.enum(["image", "location", "file"]), url: z.string().url() }))
    .default([]),
  readBy: z.array(z.string()).default([]),
});
export type Message = z.infer<typeof Message>;
