const DEFAULT_DATABASE_URL =
  'postgresql://syncflow:syncflow@localhost:5432/syncflow?schema=public';
const DEFAULT_ACCESS_SECRET = 'local-development-access-secret-change-me';
const DEFAULT_REFRESH_SECRET = 'local-development-refresh-secret-change-me';
const DEFAULT_INVITATION_SECRET =
  'local-development-invitation-secret-change-me';

type Environment = Record<string, unknown>;

export function validateEnvironment(config: Environment): Environment {
  const port = Number(config.PORT ?? 3001);
  const accessTokenTtlMinutes = Number(config.ACCESS_TOKEN_TTL_MINUTES ?? 15);
  const sessionTtlHours = Number(config.SESSION_TTL_HOURS ?? 168);
  const invitationTtlHours = Number(config.INVITATION_TTL_HOURS ?? 168);
  const smtpPort = Number(config.SMTP_PORT ?? 1025);
  const databaseTransactionMaxWaitMs = Number(
    config.DATABASE_TRANSACTION_MAX_WAIT_MS ?? 15_000,
  );
  const databaseTransactionTimeoutMs = Number(
    config.DATABASE_TRANSACTION_TIMEOUT_MS ?? 15_000,
  );
  const databaseUseLibpqSslCompat =
    config.DATABASE_USE_LIBPQ_SSL_COMPAT === true ||
    config.DATABASE_USE_LIBPQ_SSL_COMPAT === 'true';
  const configuredMailProvider = config.MAIL_PROVIDER ?? 'smtp';
  if (typeof configuredMailProvider !== 'string') {
    throw new Error('MAIL_PROVIDER must be either smtp or brevo.');
  }
  const mailProvider = configuredMailProvider.toLowerCase();

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  if (!Number.isInteger(accessTokenTtlMinutes) || accessTokenTtlMinutes < 1) {
    throw new Error('ACCESS_TOKEN_TTL_MINUTES must be a positive integer.');
  }

  if (!Number.isInteger(sessionTtlHours) || sessionTtlHours < 1) {
    throw new Error('SESSION_TTL_HOURS must be a positive integer.');
  }

  if (!Number.isInteger(invitationTtlHours) || invitationTtlHours < 1) {
    throw new Error('INVITATION_TTL_HOURS must be a positive integer.');
  }

  if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65_535) {
    throw new Error('SMTP_PORT must be an integer between 1 and 65535.');
  }

  if (!['smtp', 'brevo'].includes(mailProvider)) {
    throw new Error('MAIL_PROVIDER must be either smtp or brevo.');
  }

  if (
    !Number.isInteger(databaseTransactionMaxWaitMs) ||
    databaseTransactionMaxWaitMs < 1
  ) {
    throw new Error(
      'DATABASE_TRANSACTION_MAX_WAIT_MS must be a positive integer.',
    );
  }

  if (
    !Number.isInteger(databaseTransactionTimeoutMs) ||
    databaseTransactionTimeoutMs < 1
  ) {
    throw new Error(
      'DATABASE_TRANSACTION_TIMEOUT_MS must be a positive integer.',
    );
  }

  const databaseUrl =
    typeof config.DATABASE_URL === 'string' ? config.DATABASE_URL : undefined;
  const accessSecret =
    typeof config.AUTH_ACCESS_SECRET === 'string'
      ? config.AUTH_ACCESS_SECRET
      : DEFAULT_ACCESS_SECRET;
  const refreshSecret =
    typeof config.AUTH_REFRESH_SECRET === 'string'
      ? config.AUTH_REFRESH_SECRET
      : DEFAULT_REFRESH_SECRET;
  const invitationSecret =
    typeof config.INVITATION_TOKEN_SECRET === 'string'
      ? config.INVITATION_TOKEN_SECRET
      : DEFAULT_INVITATION_SECRET;

  if (config.NODE_ENV === 'production' && !databaseUrl) {
    throw new Error('DATABASE_URL is required in production.');
  }

  if (
    config.NODE_ENV === 'production' &&
    (!config.AUTH_ACCESS_SECRET ||
      !config.AUTH_REFRESH_SECRET ||
      !config.INVITATION_TOKEN_SECRET)
  ) {
    throw new Error(
      'Authentication and invitation secrets are required in production.',
    );
  }

  if (
    accessSecret.length < 32 ||
    refreshSecret.length < 32 ||
    invitationSecret.length < 32
  ) {
    throw new Error('Security secrets must be at least 32 characters.');
  }

  if (new Set([accessSecret, refreshSecret, invitationSecret]).size !== 3) {
    throw new Error('Security secrets must be different.');
  }

  if (config.NODE_ENV === 'production' && !config.WEB_URL) {
    throw new Error('WEB_URL is required in production.');
  }

  if (
    config.NODE_ENV !== 'test' &&
    mailProvider === 'brevo' &&
    (!config.BREVO_API_KEY || !config.MAIL_FROM_EMAIL)
  ) {
    throw new Error(
      'BREVO_API_KEY and MAIL_FROM_EMAIL are required when MAIL_PROVIDER is brevo.',
    );
  }

  if (
    config.NODE_ENV === 'production' &&
    mailProvider === 'smtp' &&
    (!config.SMTP_HOST || !config.MAIL_FROM)
  ) {
    throw new Error('SMTP_HOST and MAIL_FROM are required for SMTP delivery.');
  }

  return {
    ...config,
    PORT: port,
    CORS_ORIGIN: config.CORS_ORIGIN ?? 'http://localhost:3000',
    DATABASE_URL: databaseUrl ?? DEFAULT_DATABASE_URL,
    DATABASE_USE_LIBPQ_SSL_COMPAT: databaseUseLibpqSslCompat,
    DATABASE_TRANSACTION_MAX_WAIT_MS: databaseTransactionMaxWaitMs,
    DATABASE_TRANSACTION_TIMEOUT_MS: databaseTransactionTimeoutMs,
    AUTH_ACCESS_SECRET: accessSecret,
    AUTH_REFRESH_SECRET: refreshSecret,
    ACCESS_TOKEN_TTL_MINUTES: accessTokenTtlMinutes,
    SESSION_TTL_HOURS: sessionTtlHours,
    INVITATION_TOKEN_SECRET: invitationSecret,
    INVITATION_TTL_HOURS: invitationTtlHours,
    WEB_URL: config.WEB_URL ?? 'http://localhost:3000',
    MAIL_PROVIDER: mailProvider,
    SMTP_HOST: config.SMTP_HOST ?? 'localhost',
    SMTP_PORT: smtpPort,
    MAIL_FROM: config.MAIL_FROM ?? 'SyncFlow <no-reply@syncflow.local>',
    MAIL_FROM_EMAIL: config.MAIL_FROM_EMAIL ?? 'no-reply@syncflow.local',
    MAIL_FROM_NAME: config.MAIL_FROM_NAME ?? 'SyncFlow',
    BREVO_API_KEY: config.BREVO_API_KEY || undefined,
    COOKIE_DOMAIN: config.COOKIE_DOMAIN || undefined,
  };
}
