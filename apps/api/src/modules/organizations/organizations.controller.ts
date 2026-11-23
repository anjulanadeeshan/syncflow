import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import type { PublicUser } from '../auth/auth.types.js';
import { CreateOrganizationDto } from './dto/create-organization.dto.js';
import { InviteMemberDto } from './dto/invite-member.dto.js';
import { PaginationDto } from './dto/pagination.dto.js';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto.js';
import { UpdateOrganizationDto } from './dto/update-organization.dto.js';
import { OrganizationsService } from './organizations.service.js';

@Controller('organizations')
@UseGuards(SessionAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Post()
  create(
    @CurrentUser() user: PublicUser,
    @Body() input: CreateOrganizationDto,
  ) {
    return this.organizations.create(user.id, input);
  }

  @Get()
  list(@CurrentUser() user: PublicUser) {
    return this.organizations.list(user.id);
  }

  @Get(':organizationId')
  getDetails(
    @CurrentUser() user: PublicUser,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.organizations.getDetails(user.id, organizationId);
  }

  @Patch(':organizationId')
  update(
    @CurrentUser() user: PublicUser,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() input: UpdateOrganizationDto,
  ) {
    return this.organizations.update(user.id, organizationId, input);
  }

  @Get(':organizationId/members')
  listMembers(
    @CurrentUser() user: PublicUser,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.organizations.listMembers(user.id, organizationId, pagination);
  }

  @Patch(':organizationId/members/:memberUserId')
  updateMemberRole(
    @CurrentUser() user: PublicUser,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('memberUserId', ParseUUIDPipe) memberUserId: string,
    @Body() input: UpdateMemberRoleDto,
  ) {
    return this.organizations.updateMemberRole(
      user.id,
      organizationId,
      memberUserId,
      input,
    );
  }

  @Delete(':organizationId/members/:memberUserId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @CurrentUser() user: PublicUser,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('memberUserId', ParseUUIDPipe) memberUserId: string,
  ) {
    return this.organizations.removeMember(
      user.id,
      organizationId,
      memberUserId,
    );
  }

  @Post(':organizationId/invitations')
  createInvitation(
    @CurrentUser() user: PublicUser,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() input: InviteMemberDto,
  ) {
    return this.organizations.createInvitation(user, organizationId, input);
  }

  @Get(':organizationId/invitations')
  listInvitations(
    @CurrentUser() user: PublicUser,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.organizations.listInvitations(
      user.id,
      organizationId,
      pagination,
    );
  }

  @Delete(':organizationId/invitations/:invitationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancelInvitation(
    @CurrentUser() user: PublicUser,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
  ) {
    return this.organizations.cancelInvitation(
      user.id,
      organizationId,
      invitationId,
    );
  }
}
