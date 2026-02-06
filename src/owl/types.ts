import { z } from "zod";

export const OwlClientInputSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
});

export type OwlClientInput = z.infer<typeof OwlClientInputSchema>;

export const OwlAppointmentInputSchema = z.object({
  clientId: z.string(),
  clinicianName: z.string(),
  dateTime: z.string(),
  duration: z.number(),
  type: z.string(),
  meetingLink: z.string().url().optional(),
  notes: z.string().optional(),
});

export type OwlAppointmentInput = z.infer<typeof OwlAppointmentInputSchema>;

export const OwlSessionNoteInputSchema = z.object({
  clientId: z.string(),
  appointmentId: z.string().optional(),
  sessionDate: z.string(),
  duration: z.number(),
  content: z.string(),
});

export type OwlSessionNoteInput = z.infer<typeof OwlSessionNoteInputSchema>;

export const OwlMeetingLinkInputSchema = z.object({
  appointmentId: z.string(),
  meetingLink: z.string(),
});

export type OwlMeetingLinkInput = z.infer<typeof OwlMeetingLinkInputSchema>;

export const SyncResultSchema = z.object({
  success: z.boolean(),
  recordType: z.enum(["client", "appointment", "sessionNote", "meetingLink"]),
  playspaceId: z.string(),
  owlId: z.string().optional(),
  error: z.string().optional(),
});

export type SyncResult = z.infer<typeof SyncResultSchema>;
