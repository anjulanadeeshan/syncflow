import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InvitationTokenService {
  private readonly secret: string;

  constructor(configService: ConfigService) {
    this.secret = configService.getOrThrow<string>('INVITATION_TOKEN_SECRET');
  }

  create(invitationId: string): string {
    return `${invitationId}.${randomBytes(32).toString('base64url')}`;
  }

  getInvitationId(token: string): string | null {
    const [id, secret, ...extra] = token.split('.');
    if (
      !id ||
      !secret ||
      extra.length > 0 ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      )
    ) {
      return null;
    }
    return id;
  }

  hash(token: string): string {
    return createHmac('sha256', this.secret).update(token).digest('hex');
  }

  matches(token: string, expectedHash: string): boolean {
    const presented = Buffer.from(this.hash(token), 'hex');
    const expected = Buffer.from(expectedHash, 'hex');
    return (
      presented.length === expected.length &&
      timingSafeEqual(presented, expected)
    );
  }
}
