const DEFAULT_DATABASE_URL =
  'postgresql://syncflow:syncflow@localhost:5432/syncflow?schema=public';
const DEFAULT_ACCESS_SECRET = 'local-development-access-secret-change-me';
const DEFAULT_REFRESH_SECRET = 'local-development-refresh-secret-change-me';

type Environment = Record<string, unknown>;

export function validateEnvironment(config: Environment): Environment {
  const port = Number(config.PORT ?? 3001);
  const accessTokenTtlMinutes = Number(config.ACCESS_TOKEN_TTL_MINUTES ?? 15);
  const sessionTtlHours = Number(config.SESSION_TTL_HOURS ?? 168);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  if (!Number.isInteger(accessTokenTtlMinutes) || accessTokenTtlMinutes < 1) {
    throw new Error('ACCESS_TOKEN_TTL_MINUTES must be a positive integer.');
  }

  if (!Number.isInteger(sessionTtlHours) || sessionTtlHours < 1) {
    throw new Error('SESSION_TTL_HOURS must be a positive integer.');
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

  if (config.NODE_ENV === 'production' && !databaseUrl) {
    throw new Error('DATABASE_URL is required in production.');
  }

  if (
    config.NODE_ENV === 'production' &&
    (!config.AUTH_ACCESS_SECRET || !config.AUTH_REFRESH_SECRET)
  ) {
    throw new Error(
      'AUTH_ACCESS_SECRET and AUTH_REFRESH_SECRET are required in production.',
    );
  }

  if (accessSecret.length < 32 || refreshSecret.length < 32) {
    throw new Error('Authentication secrets must be at least 32 characters.');
  }

  if (accessSecret === refreshSecret) {
    throw new Error('Authentication secrets must be different.');
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
    COOKIE_DOMAIN: config.COOKIE_DOMAIN || undefined,
  };
}
