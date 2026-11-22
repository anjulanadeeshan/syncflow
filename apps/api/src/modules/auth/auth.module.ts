import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { CookieService } from './cookie.service.js';
import { CsrfGuard } from './csrf.guard.js';
import { PasswordService } from './password.service.js';
import { SessionAuthGuard } from './session-auth.guard.js';
import { TokenService } from './token.service.js';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', limit: 5, ttl: 60_000 }],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    CookieService,
    PasswordService,
    TokenService,
    SessionAuthGuard,
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
})
export class AuthModule {}
