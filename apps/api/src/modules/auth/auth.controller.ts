import {
  Body,
  Controller,
  Cookies,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { CSRF_COOKIE_NAME, REFRESH_COOKIE_NAME } from './auth.constants.js';
import { AuthService } from './auth.service.js';
import type { PublicUser } from './auth.types.js';
import { CookieService } from './cookie.service.js';
import { CurrentUser } from './current-user.decorator.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { SessionAuthGuard } from './session-auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: CookieService,
  ) {}

  @Get('csrf')
  getCsrfToken(
    @Cookies(CSRF_COOKIE_NAME) existingToken: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): { csrfToken: string } {
    const csrfToken = existingToken || this.cookieService.createCsrfToken();
    if (!existingToken) this.cookieService.setCsrfCookie(response, csrfToken);
    return { csrfToken };
  }

  @Post('register')
  async register(
    @Body() input: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: PublicUser }> {
    const credentials = await this.authService.register(input);
    this.cookieService.setAuthCookies(
      response,
      credentials.accessToken,
      credentials.refreshToken,
    );
    return { user: credentials.user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Body() input: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: PublicUser }> {
    const credentials = await this.authService.login(input);
    this.cookieService.setAuthCookies(
      response,
      credentials.accessToken,
      credentials.refreshToken,
    );
    return { user: credentials.user };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Cookies(REFRESH_COOKIE_NAME) refreshToken: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: PublicUser }> {
    const credentials = await this.authService.refresh(refreshToken);
    this.cookieService.setAuthCookies(
      response,
      credentials.accessToken,
      credentials.refreshToken,
    );
    return { user: credentials.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Cookies(REFRESH_COOKIE_NAME) refreshToken: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logout(refreshToken);
    this.cookieService.clearAllCookies(response);
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  getCurrentUser(@CurrentUser() user: PublicUser): { user: PublicUser } {
    return { user };
  }
}
