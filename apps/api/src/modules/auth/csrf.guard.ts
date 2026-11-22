import { timingSafeEqual } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { parseCookieHeader } from '../../common/http/parse-cookie-header.js';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from './auth.constants.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

    const cookieToken = parseCookieHeader(request.headers.cookie)[
      CSRF_COOKIE_NAME
    ];
    const header = request.headers[CSRF_HEADER_NAME];
    const headerToken = Array.isArray(header) ? header[0] : header;

    if (
      !cookieToken ||
      !headerToken ||
      !this.matches(cookieToken, headerToken)
    ) {
      throw new ForbiddenException({
        code: 'CSRF_TOKEN_INVALID',
        message: 'A valid CSRF token is required.',
      });
    }

    return true;
  }

  private matches(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return (
      leftBuffer.length === rightBuffer.length &&
      timingSafeEqual(leftBuffer, rightBuffer)
    );
  }
}
