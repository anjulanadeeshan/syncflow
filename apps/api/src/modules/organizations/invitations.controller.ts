import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import type { PublicUser } from '../auth/auth.types.js';
import { OrganizationsService } from './organizations.service.js';

@Controller('invitations')
@UseGuards(SessionAuthGuard)
export class InvitationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get(':token')
  getInvitation(
    @CurrentUser() user: PublicUser,
    @Param('token') token: string,
  ) {
    return this.organizations.getInvitation(user, token);
  }

  @Post(':token/accept')
  acceptInvitation(
    @CurrentUser() user: PublicUser,
    @Param('token') token: string,
  ) {
    return this.organizations.acceptInvitation(user, token);
  }

  @Post(':token/reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  rejectInvitation(
    @CurrentUser() user: PublicUser,
    @Param('token') token: string,
  ) {
    return this.organizations.rejectInvitation(user, token);
  }
}
