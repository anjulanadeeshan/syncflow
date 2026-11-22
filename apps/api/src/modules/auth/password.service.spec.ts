import argon2 from 'argon2';
import { PasswordService } from './password.service.js';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes passwords with Argon2id and verifies them', async () => {
    const hash = await service.hash('SecurePassword123');

    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain('SecurePassword123');
    await expect(service.verify(hash, 'SecurePassword123')).resolves.toBe(true);
    await expect(service.verify(hash, 'wrong-password')).resolves.toBe(false);
    expect(
      argon2.needsRehash(hash, {
        memoryCost: 65_536,
        timeCost: 3,
        parallelism: 1,
      }),
    ).toBe(false);
  });
});
