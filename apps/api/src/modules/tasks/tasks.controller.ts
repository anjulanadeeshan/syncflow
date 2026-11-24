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
import { ProjectPermissionGuard } from '../authorization/project-permission.guard.js';
import { PROJECT_PERMISSIONS } from '../authorization/permissions.js';
import { RequireProjectPermission } from '../authorization/require-project-permission.decorator.js';
import { CreateSubtaskDto } from './dto/create-subtask.dto.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { TaskPaginationDto } from './dto/task-pagination.dto.js';
import { TaskVersionDto } from './dto/task-version.dto.js';
import { UpdateSubtaskDto } from './dto/update-subtask.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { TasksService } from './tasks.service.js';

@Controller('organizations/:organizationId/projects/:projectId')
@UseGuards(SessionAuthGuard, ProjectPermissionGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get('task-members')
  @RequireProjectPermission(PROJECT_PERMISSIONS.READ)
  listAssignableMembers(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.tasks.listAssignableMembers(organizationId, projectId);
  }

  @Get('tasks')
  @RequireProjectPermission(PROJECT_PERMISSIONS.READ)
  list(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() pagination: TaskPaginationDto,
  ) {
    return this.tasks.list(organizationId, projectId, pagination);
  }

  @Post('tasks')
  @RequireProjectPermission(PROJECT_PERMISSIONS.MANAGE_TASKS)
  create(
    @CurrentUser() user: PublicUser,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() input: CreateTaskDto,
  ) {
    return this.tasks.create(user.id, organizationId, projectId, input);
  }

  @Get('tasks/:taskId')
  @RequireProjectPermission(PROJECT_PERMISSIONS.READ)
  get(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.tasks.get(organizationId, projectId, taskId);
  }

  @Patch('tasks/:taskId')
  @RequireProjectPermission(PROJECT_PERMISSIONS.MANAGE_TASKS)
  update(
    @CurrentUser() user: PublicUser,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() input: UpdateTaskDto,
  ) {
    return this.tasks.update(
      user.id,
      organizationId,
      projectId,
      taskId,
      input,
    );
  }

  @Delete('tasks/:taskId')
  @RequireProjectPermission(PROJECT_PERMISSIONS.MANAGE_TASKS)
  @HttpCode(HttpStatus.NO_CONTENT)
  archive(
    @CurrentUser() user: PublicUser,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Query() version: TaskVersionDto,
  ) {
    return this.tasks.archive(
      user.id,
      organizationId,
      projectId,
      taskId,
      version.version,
    );
  }

  @Post('tasks/:taskId/subtasks')
  @RequireProjectPermission(PROJECT_PERMISSIONS.MANAGE_TASKS)
  createSubtask(
    @CurrentUser() user: PublicUser,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() input: CreateSubtaskDto,
  ) {
    return this.tasks.createSubtask(
      user.id,
      organizationId,
      projectId,
      taskId,
      input,
    );
  }

  @Patch('tasks/:taskId/subtasks/:subtaskId')
  @RequireProjectPermission(PROJECT_PERMISSIONS.MANAGE_TASKS)
  updateSubtask(
    @CurrentUser() user: PublicUser,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('subtaskId', ParseUUIDPipe) subtaskId: string,
    @Body() input: UpdateSubtaskDto,
  ) {
    return this.tasks.updateSubtask(
      user.id,
      organizationId,
      projectId,
      taskId,
      subtaskId,
      input,
    );
  }

  @Delete('tasks/:taskId/subtasks/:subtaskId')
  @RequireProjectPermission(PROJECT_PERMISSIONS.MANAGE_TASKS)
  deleteSubtask(
    @CurrentUser() user: PublicUser,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('subtaskId', ParseUUIDPipe) subtaskId: string,
    @Query() version: TaskVersionDto,
  ) {
    return this.tasks.deleteSubtask(
      user.id,
      organizationId,
      projectId,
      taskId,
      subtaskId,
      version.version,
    );
  }
}
