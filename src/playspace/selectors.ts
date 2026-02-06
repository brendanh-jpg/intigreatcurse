/**
 * PlaySpace UI selectors. Update after inspecting the actual PlaySpace UI.
 */

export const PLAYSPACE_SELECTORS = {
  LOGIN: {
    emailInput: "[data-testid='login-email'], input[name='email'], #email",
    passwordInput:
      "[data-testid='login-password'], input[name='password'], #password",
    submitButton:
      "[data-testid='login-submit'], button[type='submit'], input[type='submit']",
    dashboardIndicator:
      "[data-testid='dashboard'], .dashboard, [aria-label='Dashboard']",
  },
  CLIENTS: {
    listContainer: "[data-testid='client-list'], .client-list, table tbody",
    clientRow: "[data-testid='client-row'], .client-row, tbody tr",
    clientName: "[data-testid='client-name'], .client-name, td:nth-child(1)",
    clientEmail: "[data-testid='client-email'], .client-email, td:nth-child(2)",
    clientPhone: "[data-testid='client-phone'], .client-phone, td:nth-child(3)",
    clientDOB: "[data-testid='client-dob'], .client-dob, td:nth-child(4)",
    newClientButton:
      "[data-testid='new-client'], button:has-text('New Client'), .new-client",
    searchInput:
      "[data-testid='client-search'], input[placeholder*='Search'], #search",
    pagination: "[data-testid='pagination'], .pagination, nav[aria-label='pagination']",
  },
  APPOINTMENTS: {
    calendarView:
      "[data-testid='calendar'], .calendar-view, [aria-label='Calendar']",
    appointmentCard:
      "[data-testid='appointment-card'], .appointment-card, .event",
    clientField: "[data-testid='appt-client'], .appt-client",
    clinicianField: "[data-testid='appt-clinician'], .appt-clinician",
    dateField: "[data-testid='appt-date'], .appt-date, input[type='date']",
    timeField: "[data-testid='appt-time'], .appt-time, input[type='time']",
    durationField: "[data-testid='appt-duration'], .appt-duration",
    statusField: "[data-testid='appt-status'], .appt-status",
    meetingLinkField:
      "[data-testid='appt-meeting-link'], .appt-meeting-link, input[name*='link']",
    pagination: "[data-testid='appt-pagination'], .pagination",
  },
  SESSION_NOTES: {
    notesList: "[data-testid='notes-list'], .session-notes-list, .notes-list",
    noteRow: "[data-testid='note-row'], .note-row, .session-note",
    noteContent: "[data-testid='note-content'], .note-content, .content",
    sessionDate: "[data-testid='session-date'], .session-date",
    sessionDuration: "[data-testid='session-duration'], .session-duration",
    activityData: "[data-testid='activity-data'], .activity-data",
    clientName: "[data-testid='note-client'], .note-client",
    clinicianName: "[data-testid='note-clinician'], .note-clinician",
  },
} as const;
