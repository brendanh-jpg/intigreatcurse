/**
 * Data mapping: PlaySpace schemas → Owl input schemas.
 */

import type {
  PlaySpaceClient,
  PlaySpaceAppointment,
  PlaySpaceSessionNote,
} from "../playspace/types.js";
import type {
  OwlClientInput,
  OwlAppointmentInput,
  OwlSessionNoteInput,
  OwlMeetingLinkInput,
} from "../owl/types.js";

export function mapClient(playspaceClient: PlaySpaceClient): OwlClientInput {
  return {
    firstName: playspaceClient.firstName,
    lastName: playspaceClient.lastName,
    email: playspaceClient.email || undefined,
    phone: playspaceClient.phone,
    dateOfBirth: playspaceClient.dateOfBirth,
  };
}

export function mapAppointment(
  appt: PlaySpaceAppointment,
  clientIdMap: Map<string, string>
): OwlAppointmentInput {
  const clientId = clientIdMap.get(appt.clientId);
  if (!clientId) throw new Error(`No Owl client ID for PlaySpace client ${appt.clientId}`);
  return {
    clientId,
    clinicianName: appt.clinicianName,
    dateTime: appt.dateTime,
    duration: appt.duration,
    type: appt.type,
    meetingLink: appt.meetingLink,
    notes: undefined,
  };
}

export function mapSessionNote(
  note: PlaySpaceSessionNote,
  clientIdMap: Map<string, string>,
  appointmentIdMap: Map<string, string>
): OwlSessionNoteInput {
  const clientId = clientIdMap.get(note.clientId);
  if (!clientId) throw new Error(`No Owl client ID for PlaySpace client ${note.clientId}`);
  const appointmentId = note.appointmentId
    ? appointmentIdMap.get(note.appointmentId)
    : undefined;
  let content = note.noteContent;
  if (note.activityData && Object.keys(note.activityData).length > 0) {
    content += "\n\nDigital Therapy Activities:\n";
    for (const [name, result] of Object.entries(note.activityData)) {
      content += `- ${name}: ${JSON.stringify(result)}\n`;
    }
  }
  return {
    clientId,
    appointmentId,
    sessionDate: note.sessionDate,
    duration: note.duration,
    content,
  };
}

export function mapMeetingLink(
  appt: PlaySpaceAppointment,
  appointmentIdMap: Map<string, string>
): OwlMeetingLinkInput | null {
  if (!appt.meetingLink) return null;
  const appointmentId = appointmentIdMap.get(appt.id);
  if (!appointmentId) return null;
  return {
    appointmentId,
    meetingLink: appt.meetingLink,
  };
}
