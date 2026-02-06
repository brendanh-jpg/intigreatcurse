/**
 * Owl Practice UI selectors. Update after inspecting the actual Owl Practice UI.
 */

export const OWL_SELECTORS = {
  LOGIN: {
    emailInput: "input[name='email'], #email, [type='email']",
    passwordInput: "input[name='password'], #password, [type='password']",
    submitButton: "button[type='submit'], input[type='submit'], [data-testid='login']",
    mfaInput: "input[name='code'], #mfa-code, [aria-label='Verification code']",
    dashboardIndicator: "[data-testid='dashboard'], .dashboard, main",
  },
  NAVIGATION: {
    clientsNav: "[data-testid='nav-clients'], a[href*='clients'], .nav-clients",
    calendarNav: "[data-testid='nav-calendar'], a[href*='calendar'], .nav-calendar",
    notesNav: "[data-testid='nav-notes'], a[href*='notes'], .nav-notes",
    settingsNav: "[data-testid='nav-settings'], a[href*='settings']",
  },
  CLIENTS: {
    newClientButton: "[data-testid='new-client'], button:has-text('New Client')",
    searchInput: "input[placeholder*='Search'], #client-search",
    clientList: "[data-testid='client-list'], .client-list, table tbody",
    clientRow: "[data-testid='client-row'], tbody tr",
    form: {
      firstName: "input[name='firstName'], #firstName, [data-testid='first-name']",
      lastName: "input[name='lastName'], #lastName, [data-testid='last-name']",
      email: "input[name='email'], #email, [data-testid='email']",
      phone: "input[name='phone'], #phone, [data-testid='phone']",
      dob: "input[name='dateOfBirth'], #dob, [data-testid='dob']",
      saveButton: "button[type='submit'], [data-testid='save-client']",
      cancelButton: "button:has-text('Cancel'), [data-testid='cancel']",
    },
  },
  APPOINTMENTS: {
    newButton: "[data-testid='new-appointment'], button:has-text('New Appointment')",
    form: {
      clientSelect: "select[name='clientId'], [data-testid='client-select']",
      clinicianSelect: "select[name='clinicianId'], [data-testid='clinician-select']",
      datePicker: "input[type='date'], [data-testid='date-picker']",
      timePicker: "input[type='time'], [data-testid='time-picker']",
      durationInput: "input[name='duration'], [data-testid='duration']",
      typeSelect: "select[name='type'], [data-testid='appointment-type']",
      notesField: "textarea[name='notes'], [data-testid='notes']",
      meetingLinkField: "input[name='meetingLink'], [data-testid='meeting-link']",
      saveButton: "button[type='submit'], [data-testid='save-appointment']",
    },
  },
  SESSION_NOTES: {
    newNoteButton: "[data-testid='new-note'], button:has-text('Add Note')",
    noteEditor: "[data-testid='note-editor'], .note-editor, [contenteditable='true']",
    form: {
      sessionDate: "input[name='sessionDate'], [data-testid='session-date']",
      duration: "input[name='duration'], [data-testid='duration']",
      contentEditor: "[contenteditable='true'], textarea[name='content']",
      saveButton: "button[type='submit'], [data-testid='save-note']",
    },
  },
} as const;
