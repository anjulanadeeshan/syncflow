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

  if (
    config.NODE_ENV === 'production' &&
    (!config.SMTP_HOST || !config.MAIL_FROM || !config.WEB_URL)
  ) {
    throw new Error(
      'SMTP_HOST, MAIL_FROM, and WEB_URL are required in production.',
    );
  }

  return {
    ...config,
    PORT: port,
    CORS_ORIGIN: config.CORS_ORIGIN ?? 'http://localhost:3000',
    DATABASE_URL: databaseUrl ?? DEFAULT_DATABASE_URL,
    AUTH_ACCESS_SECRET: accessSecret,
    AUTH_REFRESH_SECRET: refreshSecret,
    ACCESS_TOKEN_TTL_MINUTES: accessTokenTtlMinutes,
    SESSION_TTL_HOURS: sessionTtlHours,
    INVITATION_TOKEN_SECRET: invitationSecret,
    INVITATION_TTL_HOURS: invitationTtlHours,
    WEB_URL: config.WEB_URL ?? 'http://localhost:3000',
    SMTP_HOST: config.SMTP_HOST ?? 'localhost',
    SMTP_PORT: smtpPort,
    MAIL_FROM: config.MAIL_FROM ?? 'SyncFlow <no-reply@syncflow.local>',
    COOKIE_DOMAIN: config.COOKIE_DOMAIN || undefined,
  };
}
