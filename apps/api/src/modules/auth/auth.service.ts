import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import { PasswordService } from './password.service.js';
import { TokenService } from './token.service.js';
import type { PublicUser, SessionCredentials } from './auth.types.js';

const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,t=3,p=1$PKJDm0B2dr5n80EFH0XlgA$/rua341RXDf3M8EnPsiM5Ft3SOPNnjjvJ1nLsS8ncms';

const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class AuthService {
  private readonly sessionTtlMilliseconds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    configService: ConfigService,
  ) {
    this.sessionTtlMilliseconds =
      configService.getOrThrow<number>('SESSION_TTL_HOURS') * 60 * 60 * 1000;
  }

  async register(input: RegisterDto): Promise<SessionCredentials> {
    const passwordHash = await this.passwordService.hash(input.password);
    const expiresAt = this.getSessionExpiration();
    const sessionId = randomUUID();
    const refreshToken = this.tokenService.createRefreshToken(sessionId);

    try {
      const result = await this.prisma.$transaction(async (transaction) => {
        const user = await transaction.user.create({
          data: { email: input.email, name: input.name, passwordHash },
          select: publicUserSelect,
        });
        const session = await transaction.session.create({
          data: {
            id: sessionId,
            userId: user.id,
            refreshTokenHash: this.tokenService.hashRefreshToken(refreshToken),
            expiresAt,
          },
        });
        return { user, sessionId: session.id, refreshToken };
      });

      return this.createCredentials(
        result.user,
        result.sessionId,
        result.refreshToken,
      );
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException({
          code: 'EMAIL_ALREADY_REGISTERED',
          message: 'An account with this email already exists.',
        });
      }
      throw error;
    }
  }

  async login(input: LoginDto): Promise<SessionCredentials> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    const passwordIsValid = await this.passwordService.verify(
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
      input.password,
    );

    if (!user || !passwordIsValid) this.throwInvalidCredentials();

    const sessionId = randomUUID();
    const refreshToken = this.tokenService.createRefreshToken(sessionId);
    const session = await this.prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshTokenHash: this.tokenService.hashRefreshToken(refreshToken),
        expiresAt: this.getSessionExpiration(),
      },
    });

    return this.createCredentials(
      this.toPublicUser(user),
      session.id,
      refreshToken,
    );
  }

  async refresh(refreshToken: string | undefined): Promise<SessionCredentials> {
    if (!refreshToken) this.throwInvalidSession();
    const sessionId = this.tokenService.getRefreshTokenSessionId(refreshToken);
    if (!sessionId) this.throwInvalidSession();

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      this.throwInvalidSession();
    }

    const presentedHash = this.tokenService.hashRefreshToken(refreshToken);
    if (
      !this.tokenService.refreshTokenMatches(
        refreshToken,
        session.refreshTokenHash,
      )
    ) {
      await this.prisma.session.updateMany({
        where: { id: sessionId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      this.throwInvalidSession();
    }

    const nextRefreshToken = this.tokenService.createRefreshToken(session.id);
    const updated = await this.prisma.session.updateMany({
      where: {
        id: session.id,
        refreshTokenHash: presentedHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        refreshTokenHash: this.tokenService.hashRefreshToken(nextRefreshToken),
      },
    });
    if (updated.count !== 1) this.throwInvalidSession();

    return this.createCredentials(
      this.toPublicUser(session.user),
      session.id,
      nextRefreshToken,
    );
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    const sessionId = refreshToken
      ? this.tokenService.getRefreshTokenSessionId(refreshToken)
      : null;
    if (!sessionId) return;

    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async authenticate(accessToken: string): Promise<{
    user: PublicUser;
    sessionId: string;
  } | null> {
    const payload = await this.tokenService.verifyAccessToken(accessToken);
    if (!payload) return null;

    const session = await this.prisma.session.findFirst({
      where: {
        id: payload.sessionId,
        userId: payload.userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
    if (!session) return null;

    return { user: this.toPublicUser(session.user), sessionId: session.id };
  }

  private async createCredentials(
    user: PublicUser,
    sessionId: string,
    refreshToken: string,
  ): Promise<SessionCredentials> {
    return {
      user,
      accessToken: await this.tokenService.signAccessToken(user.id, sessionId),
      refreshToken,
    };
  }

  private getSessionExpiration(): Date {
    return new Date(Date.now() + this.sessionTtlMilliseconds);
  }

  private toPublicUser(
    user: PublicUser & { passwordHash?: string },
  ): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }

  private throwInvalidCredentials(): never {
    throw new UnauthorizedException({
      code: 'AUTH_INVALID_CREDENTIALS',
      message: 'Invalid email or password.',
    });
  }

  private throwInvalidSession(): never {
    throw new UnauthorizedException({
      code: 'AUTH_SESSION_INVALID',
      message: 'Your session is invalid or has expired.',
    });
  }
}
