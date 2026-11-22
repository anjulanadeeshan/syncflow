import { ConfigService } from '@nestjs/config';
import { TokenService } from './token.service.js';

describe('TokenService', () => {
  const service = new TokenService(
    new ConfigService({
      AUTH_ACCESS_SECRET: 'unit-test-access-secret-with-at-least-32-characters',
      AUTH_REFRESH_SECRET:
        'unit-test-refresh-secret-with-at-least-32-characters',
      ACCESS_TOKEN_TTL_MINUTES: 15,
    }),
  );

  it('signs and verifies scoped access tokens', async () => {
    const token = await service.signAccessToken('user-id', 'session-id');

    await expect(service.verifyAccessToken(token)).resolves.toEqual({
      userId: 'user-id',
      sessionId: 'session-id',
    });
    await expect(
      service.verifyAccessToken(`${token}tampered`),
    ).resolves.toBeNull();
  });

  it('creates opaque refresh tokens and deterministic hashes', () => {
    const sessionId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    const first = service.createRefreshToken(sessionId);
    const second = service.createRefreshToken(sessionId);

    expect(service.getRefreshTokenSessionId(first)).toBe(sessionId);
    expect(first).not.toBe(second);
    expect(service.hashRefreshToken(first)).toHaveLength(64);
    expect(service.hashRefreshToken(first)).not.toBe(
      service.hashRefreshToken(second),
    );
  });
});
