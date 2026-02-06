import { z } from "zod";

export const PlaySpaceClientSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type PlaySpaceClient = z.infer<typeof PlaySpaceClientSchema>;

export const PlaySpaceAppointmentSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  clinicianName: z.string(),
  dateTime: z.string(),
  duration: z.number(),
  status: z.string(),
  type: z.string(),
  meetingLink: z.string().url().optional(),
});

export type PlaySpaceAppointment = z.infer<typeof PlaySpaceAppointmentSchema>;

export const PlaySpaceSessionNoteSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  clinicianName: z.string(),
  sessionDate: z.string(),
  duration: z.number(),
  noteContent: z.string(),
  activityData: z.record(z.unknown()).optional(),
  appointmentId: z.string().optional(),
});

export type PlaySpaceSessionNote = z.infer<typeof PlaySpaceSessionNoteSchema>;

export const PlaySpaceExportDataSchema = z.object({
  clients: z.array(PlaySpaceClientSchema),
  appointments: z.array(PlaySpaceAppointmentSchema),
  sessionNotes: z.array(PlaySpaceSessionNoteSchema),
  extractedAt: z.string(),
});

export type PlaySpaceExportData = z.infer<typeof PlaySpaceExportDataSchema>;
