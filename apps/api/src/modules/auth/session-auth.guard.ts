import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { parseCookieHeader } from '../../common/http/parse-cookie-header.js';
import { ACCESS_COOKIE_NAME } from './auth.constants.js';
import { AuthService } from './auth.service.js';
import type { AuthenticatedRequest } from './auth.types.js';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = parseCookieHeader(request.headers.cookie)[ACCESS_COOKIE_NAME];
    const authenticated = token
      ? await this.authService.authenticate(token)
      : null;

    if (!authenticated) {
      throw new UnauthorizedException({
        code: 'AUTH_REQUIRED',
        message: 'Authentication is required.',
      });
    }

    (request as AuthenticatedRequest).auth = authenticated;
    return true;
  }
}
