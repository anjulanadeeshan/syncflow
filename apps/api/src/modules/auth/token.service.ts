import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jwtVerify, SignJWT } from 'jose';
import {
  ACCESS_TOKEN_AUDIENCE,
  ACCESS_TOKEN_ISSUER,
} from './auth.constants.js';

export type AccessTokenPayload = {
  userId: string;
  sessionId: string;
};

@Injectable()
export class TokenService {
  private readonly accessSecret: Uint8Array;
  private readonly refreshSecret: string;
  private readonly accessTtlMinutes: number;

  constructor(configService: ConfigService) {
    this.accessSecret = new TextEncoder().encode(
      configService.getOrThrow<string>('AUTH_ACCESS_SECRET'),
    );
    this.refreshSecret = configService.getOrThrow<string>(
      'AUTH_REFRESH_SECRET',
    );
    this.accessTtlMinutes = configService.getOrThrow<number>(
      'ACCESS_TOKEN_TTL_MINUTES',
    );
  }

  async signAccessToken(userId: string, sessionId: string): Promise<string> {
    return new SignJWT({ sid: sessionId })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(userId)
      .setIssuer(ACCESS_TOKEN_ISSUER)
      .setAudience(ACCESS_TOKEN_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(`${this.accessTtlMinutes}m`)
      .sign(this.accessSecret);
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
    try {
      const { payload } = await jwtVerify(token, this.accessSecret, {
        issuer: ACCESS_TOKEN_ISSUER,
        audience: ACCESS_TOKEN_AUDIENCE,
        algorithms: ['HS256'],
      });

      if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string') {
        return null;
      }

      return { userId: payload.sub, sessionId: payload.sid };
    } catch {
      return null;
    }
  }

  createRefreshToken(sessionId: string): string {
    return `${sessionId}.${randomBytes(32).toString('base64url')}`;
  }

  getRefreshTokenSessionId(token: string): string | null {
    const [sessionId, secret, ...extra] = token.split('.');
    if (
      !sessionId ||
      !secret ||
      extra.length > 0 ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        sessionId,
      )
    ) {
      return null;
    }
    return sessionId;
  }

  hashRefreshToken(token: string): string {
    return createHmac('sha256', this.refreshSecret).update(token).digest('hex');
  }

  refreshTokenMatches(token: string, expectedHash: string): boolean {
    const presented = Buffer.from(this.hashRefreshToken(token), 'hex');
    const expected = Buffer.from(expectedHash, 'hex');
    return (
      presented.length === expected.length &&
      timingSafeEqual(presented, expected)
    );
  }
}
