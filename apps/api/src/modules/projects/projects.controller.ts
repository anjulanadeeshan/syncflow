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
import type { PublicUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import { OrganizationPermissionGuard } from '../authorization/organization-permission.guard.js';
import {
  ORGANIZATION_PERMISSIONS,
  PROJECT_PERMISSIONS,
} from '../authorization/permissions.js';
import { ProjectPermissionGuard } from '../authorization/project-permission.guard.js';
import { RequireOrganizationPermission } from '../authorization/require-organization-permission.decorator.js';
import { RequireProjectPermission } from '../authorization/require-project-permission.decorator.js';
import { AddProjectMemberDto } from './dto/add-project-member.dto.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { ProjectPaginationDto } from './dto/project-pagination.dto.js';
import { UpdateProjectMemberRoleDto } from './dto/update-project-member-role.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { ProjectsService } from './projects.service.js';

@Controller('organizations/:organizationId/projects')
@UseGuards(
  SessionAuthGuard,
  OrganizationPermissionGuard,
  ProjectPermissionGuard,
)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Post()
  @RequireOrganizationPermission(ORGANIZATION_PERMISSIONS.CREATE_PROJECTS)
  create(
    @CurrentUser() user: PublicUser,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() input: CreateProjectDto,
  ) {
    return this.projects.create(user.id, organizationId, input);
  }

  @Get()
  @RequireOrganizationPermission(ORGANIZATION_PERMISSIONS.READ)
  list(
    @CurrentUser() user: PublicUser,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() pagination: ProjectPaginationDto,
  ) {
    return this.projects.list(user.id, organizationId, pagination);
  }

  @Get(':projectId')
  @RequireProjectPermission(PROJECT_PERMISSIONS.READ)
  get(
    @CurrentUser() user: PublicUser,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.projects.get(user.id, organizationId, projectId);
  }

  @Patch(':projectId')
  @RequireProjectPermission(PROJECT_PERMISSIONS.UPDATE)
  update(
    @CurrentUser() user: PublicUser,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() input: UpdateProjectDto,
  ) {
    return this.projects.update(user.id, organizationId, projectId, input);
  }

  @Delete(':projectId')
  @RequireProjectPermission(PROJECT_PERMISSIONS.ARCHIVE)
  @HttpCode(HttpStatus.NO_CONTENT)
  archive(
    @CurrentUser() user: PublicUser,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.projects.archive(user.id, organizationId, projectId);
  }

  @Get(':projectId/members')
  @RequireProjectPermission(PROJECT_PERMISSIONS.READ)
  listMembers(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.projects.listMembers(organizationId, projectId);
  }

  @Post(':projectId/members')
  @RequireProjectPermission(PROJECT_PERMISSIONS.MANAGE_MEMBERS)
  addMember(
    @CurrentUser() user: PublicUser,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() input: AddProjectMemberDto,
  ) {
    return this.projects.addMember(
      user.id,
      organizationId,
      projectId,
      input,
    );
  }

  @Patch(':projectId/members/:memberUserId')
  @RequireProjectPermission(PROJECT_PERMISSIONS.MANAGE_MEMBERS)
  updateMemberRole(
    @CurrentUser() user: PublicUser,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('memberUserId', ParseUUIDPipe) memberUserId: string,
    @Body() input: UpdateProjectMemberRoleDto,
  ) {
    return this.projects.updateMemberRole(
      user.id,
      organizationId,
      projectId,
      memberUserId,
      input,
    );
  }

  @Delete(':projectId/members/:memberUserId')
  @RequireProjectPermission(PROJECT_PERMISSIONS.MANAGE_MEMBERS)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @CurrentUser() user: PublicUser,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('memberUserId', ParseUUIDPipe) memberUserId: string,
  ) {
    return this.projects.removeMember(
      user.id,
      organizationId,
      projectId,
      memberUserId,
    );
  }
}
