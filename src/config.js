export const config = {
  port: Number(process.env.PORT || 8080),
  nodeEnv: process.env.NODE_ENV || 'development',
  churchId: process.env.DEFAULT_CHURCH_ID || 'westbury',
  seedProfile: process.env.SEED_PROFILE || '',
  initialOwnerUsername: (process.env.INITIAL_OWNER_USERNAME || 'churchadmin').trim().toLowerCase(),
  bootstrapCode: process.env.BOOTSTRAP_CODE || '',
  storageAccountName: process.env.AZURE_STORAGE_ACCOUNT_NAME || '',
  storageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING || '',
  managedIdentityClientId: process.env.AZURE_CLIENT_ID || '',
  attachmentsContainer: process.env.AZURE_BLOB_ATTACHMENTS_CONTAINER || 'attachments',
  importsContainer: process.env.AZURE_BLOB_IMPORTS_CONTAINER || 'imports',
  backupsContainer: process.env.AZURE_BLOB_BACKUPS_CONTAINER || 'backups',
  cookieSecure: String(process.env.COOKIE_SECURE || '').toLowerCase() === 'true' || process.env.NODE_ENV === 'production',
  sessionDays: Number(process.env.SESSION_DAYS || 30),
  defaultTimezone: process.env.DEFAULT_TIMEZONE || 'America/Chicago'
};

export const tableNames = {
  settings: 'Settings',
  users: 'Users',
  sessions: 'Sessions',
  members: 'Members',
  ministries: 'Ministries',
  services: 'Services',
  templates: 'ProgramTemplates',
  programs: 'Programs',
  assignments: 'Assignments',
  history: 'HistoryEvents',
  content: 'Content',
  songs: 'Songs',
  visitorContacts: 'VisitorContacts',
  petitions: 'Petitions',
  pushSubscriptions: 'PushSubscriptions'
};
