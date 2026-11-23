import { ConfigService } from '@nestjs/config';
import { InvitationTokenService } from './invitation-token.service.js';

describe('InvitationTokenService', () => {
  const service = new InvitationTokenService(
    new ConfigService({
      INVITATION_TOKEN_SECRET:
        'unit-test-invitation-secret-with-at-least-32-characters',
    }),
  );

  it('creates parseable, hashed, tamper-evident tokens', () => {
    const invitationId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    const token = service.create(invitationId);
    const hash = service.hash(token);

    expect(service.getInvitationId(token)).toBe(invitationId);
    expect(hash).toHaveLength(64);
    expect(service.matches(token, hash)).toBe(true);
    expect(service.matches(`${token}changed`, hash)).toBe(false);
    expect(service.getInvitationId('not-a-token')).toBeNull();
  });
});
