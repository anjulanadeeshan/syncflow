import { randomBytes } from 'node:crypto';
import { Injectable, type CookieSerializeOptions } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import {
  ACCESS_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
} from './auth.constants.js';

@Injectable()
export class CookieService {
  private readonly secure: boolean;
  private readonly domain: string | undefined;
  private readonly accessMaxAge: number;
  private readonly sessionMaxAge: number;

  constructor(
    private readonly adapterHost: HttpAdapterHost,
    configService: ConfigService,
  ) {
    this.secure = configService.getOrThrow<string>('NODE_ENV') === 'production';
    this.domain = configService.get<string>('COOKIE_DOMAIN') || undefined;
    this.accessMaxAge =
      configService.getOrThrow<number>('ACCESS_TOKEN_TTL_MINUTES') * 60;
    this.sessionMaxAge =
      configService.getOrThrow<number>('SESSION_TTL_HOURS') * 60 * 60;
  }

  createCsrfToken(): string {
    return randomBytes(32).toString('base64url');
  }

  setAuthCookies(
    response: unknown,
    accessToken: string,
    refreshToken: string,
  ): void {
    this.setCookie(response, ACCESS_COOKIE_NAME, accessToken, {
      ...this.baseOptions,
      httpOnly: true,
      maxAge: this.accessMaxAge,
      path: '/',
    });
    this.setCookie(response, REFRESH_COOKIE_NAME, refreshToken, {
      ...this.baseOptions,
      httpOnly: true,
      maxAge: this.sessionMaxAge,
      path: '/api/auth',
    });
  }

  setCsrfCookie(response: unknown, token: string): void {
    this.setCookie(response, CSRF_COOKIE_NAME, token, {
      ...this.baseOptions,
      httpOnly: false,
      maxAge: this.sessionMaxAge,
      path: '/',
    });
  }

  clearAuthCookies(response: unknown): void {
    this.clearCookie(response, ACCESS_COOKIE_NAME, '/');
    this.clearCookie(response, REFRESH_COOKIE_NAME, '/api/auth');
  }

  clearAllCookies(response: unknown): void {
    this.clearAuthCookies(response);
    this.clearCookie(response, CSRF_COOKIE_NAME, '/');
  }

  private get baseOptions(): CookieSerializeOptions {
    return {
      secure: this.secure,
      sameSite: 'lax',
      ...(this.domain ? { domain: this.domain } : {}),
    };
  }

  private setCookie(
    response: unknown,
    name: string,
    value: string,
    options: CookieSerializeOptions,
  ): void {
    this.adapterHost.httpAdapter.setCookie(response, name, value, options);
  }

  private clearCookie(response: unknown, name: string, path: string): void {
    this.adapterHost.httpAdapter.clearCookie(response, name, {
      ...this.baseOptions,
      path,
    });
  }
}
