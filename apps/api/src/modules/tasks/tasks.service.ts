import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import {
  PROJECT_PERMISSIONS,
  type ProjectPermission as AuthorizationProjectPermission,
} from '../authorization/permissions.js';
import { ProjectAccessPolicyService } from '../authorization/project-access-policy.service.js';
import type { CreateSubtaskDto } from './dto/create-subtask.dto.js';
import type { CreateTaskDto } from './dto/create-task.dto.js';
import type { TaskPaginationDto } from './dto/task-pagination.dto.js';
import type { UpdateSubtaskDto } from './dto/update-subtask.dto.js';
import type { UpdateTaskDto } from './dto/update-task.dto.js';

const taskInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  assignees: {
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { assignedAt: 'asc' as const },
  },
  subtasks: { orderBy: { position: 'asc' as const } },
} satisfies Prisma.TaskInclude;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectPolicy: ProjectAccessPolicyService,
  ) {}

  async list(
    organizationId: string,
    projectId: string,
    pagination: TaskPaginationDto,
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
      select: {
        id: true,
        organizationId: true,
        name: true,
        key: true,
        description: true,
        archivedAt: true,
      },
    });
    if (!project) this.throwProjectNotFound();

    const where: Prisma.TaskWhereInput = {
      organizationId,
      projectId,
      archivedAt: null,
      ...(pagination.priority ? { priority: pagination.priority } : {}),
      ...(pagination.status ? { status: pagination.status } : {}),
    };
    const skip = (pagination.page - 1) * pagination.limit;
    const [tasks, total] = await this.prisma.$transaction(
      async (transaction) => {
        const pageTasks = await transaction.task.findMany({
          where,
          include: taskInclude,
          orderBy: [{ updatedAt: 'desc' }, { number: 'desc' }],
          skip,
          take: pagination.limit,
        });
        const pageTotal = await transaction.task.count({ where });
        return [pageTasks, pageTotal] as const;
      },
    );

    return {
      project,
      tasks: tasks.map((task) => this.toTaskResponse(task)),
      total,
      page: pagination.page,
      limit: pagination.limit,
    };
  }

  async listAssignableMembers(organizationId: string, projectId: string) {
    const memberships = await this.prisma.projectMember.findMany({
      where: { organizationId, projectId },
      include: {
        organizationMembership: {
          select: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
      take: 200,
    });
    return {
      members: memberships.map((membership) => ({
        user: {
          id: membership.organizationMembership.user.id,
          name: membership.organizationMembership.user.name,
          email: membership.organizationMembership.user.email,
        },
        role: membership.role,
      })),
    };
  }

  async get(organizationId: string, projectId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, organizationId, projectId, archivedAt: null },
      include: taskInclude,
    });
    if (!task) this.throwTaskNotFound();
    return { task: this.toTaskResponse(task) };
  }

  async create(
    actorId: string,
    organizationId: string,
    projectId: string,
    input: CreateTaskDto,
  ) {
    try {
      const task = await this.prisma.$transaction(
        async (transaction) => {
          await this.requireProjectForMutation(
            transaction,
            actorId,
            organizationId,
            projectId,
            PROJECT_PERMISSIONS.MANAGE_TASKS,
          );
          await this.validateAssignees(
            transaction,
            organizationId,
            projectId,
            input.assigneeIds,
          );
          const project = await transaction.project.update({
            where: { id_organizationId: { id: projectId, organizationId } },
            data: { nextTaskNumber: { increment: 1 } },
            select: { nextTaskNumber: true },
          });
          const created = await transaction.task.create({
            data: {
              organizationId,
              projectId,
              number: project.nextTaskNumber - 1,
              title: input.title,
              description: input.description || null,
              priority: input.priority,
              status: input.status,
              createdById: actorId,
              dueDate: input.dueDate ? new Date(input.dueDate) : null,
            },
          });
          if (input.assigneeIds.length > 0) {
            await transaction.taskAssignee.createMany({
              data: input.assigneeIds.map((userId) => ({
                taskId: created.id,
                organizationId,
                projectId,
                userId,
              })),
            });
          }
          return this.findTaskInTransaction(
            transaction,
            organizationId,
            projectId,
            created.id,
          );
        },
        { isolationLevel: 'Serializable' },
      );
      return { task: this.toTaskResponse(task) };
    } catch (error) {
      this.handleTransactionConflict(error);
    }
  }

  async update(
    actorId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
    input: UpdateTaskDto,
  ) {
    if (!Object.keys(input).some((key) => key !== 'version')) {
      throw new BadRequestException({
        code: 'TASK_UPDATE_EMPTY',
        message: 'Provide at least one task field to update.',
      });
    }

    const task = await this.prisma.$transaction(async (transaction) => {
      await this.requireProjectForMutation(
        transaction,
        actorId,
        organizationId,
        projectId,
        PROJECT_PERMISSIONS.MANAGE_TASKS,
      );
      if (input.assigneeIds) {
        await this.validateAssignees(
          transaction,
          organizationId,
          projectId,
          input.assigneeIds,
        );
      }

      const updated = await transaction.task.updateMany({
        where: {
          id: taskId,
          organizationId,
          projectId,
          archivedAt: null,
          version: input.version,
        },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.description !== undefined
            ? { description: input.description || null }
            : {}),
          ...(input.priority !== undefined
            ? { priority: input.priority }
            : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.dueDate !== undefined
            ? { dueDate: input.dueDate ? new Date(input.dueDate) : null }
            : {}),
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        await this.throwTaskConflictOrNotFound(
          transaction,
          organizationId,
          projectId,
          taskId,
        );
      }

      if (input.assigneeIds) {
        await transaction.taskAssignee.deleteMany({ where: { taskId } });
        await transaction.taskAssignee.createMany({
          data: input.assigneeIds.map((userId) => ({
            taskId,
            organizationId,
            projectId,
            userId,
          })),
        });
      }
      return this.findTaskInTransaction(
        transaction,
        organizationId,
        projectId,
        taskId,
      );
    });
    return { task: this.toTaskResponse(task) };
  }

  async archive(
    actorId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
    version: number,
  ): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await this.requireProjectForMutation(
        transaction,
        actorId,
        organizationId,
        projectId,
        PROJECT_PERMISSIONS.MANAGE_TASKS,
      );
      const archived = await transaction.task.updateMany({
        where: {
          id: taskId,
          organizationId,
          projectId,
          archivedAt: null,
          version,
        },
        data: { archivedAt: new Date(), version: { increment: 1 } },
      });
      if (archived.count !== 1) {
        await this.throwTaskConflictOrNotFound(
          transaction,
          organizationId,
          projectId,
          taskId,
        );
      }
    });
  }

  async createSubtask(
    actorId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
    input: CreateSubtaskDto,
  ) {
    try {
      const task = await this.prisma.$transaction(
        async (transaction) => {
          await this.requireProjectForMutation(
            transaction,
            actorId,
            organizationId,
            projectId,
            PROJECT_PERMISSIONS.MANAGE_TASKS,
          );
          await this.bumpTaskVersion(
            transaction,
            organizationId,
            projectId,
            taskId,
            input.taskVersion,
          );
          const last = await transaction.subtask.aggregate({
            where: { organizationId, projectId, taskId },
            _max: { position: true },
          });
          await transaction.subtask.create({
            data: {
              organizationId,
              projectId,
              taskId,
              title: input.title,
              position: (last._max.position ?? 0) + 1,
            },
          });
          return this.findTaskInTransaction(
            transaction,
            organizationId,
            projectId,
            taskId,
          );
        },
        { isolationLevel: 'Serializable' },
      );
      return { task: this.toTaskResponse(task) };
    } catch (error) {
      this.handleTransactionConflict(error);
    }
  }

  async updateSubtask(
    actorId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
    subtaskId: string,
    input: UpdateSubtaskDto,
  ) {
    if (input.title === undefined && input.isCompleted === undefined) {
      throw new BadRequestException({
        code: 'SUBTASK_UPDATE_EMPTY',
        message: 'Provide a title or completion state to update.',
      });
    }
    const task = await this.prisma.$transaction(async (transaction) => {
      await this.requireProjectForMutation(
        transaction,
        actorId,
        organizationId,
        projectId,
        PROJECT_PERMISSIONS.MANAGE_TASKS,
      );
      await this.bumpTaskVersion(
        transaction,
        organizationId,
        projectId,
        taskId,
        input.taskVersion,
      );
      const updated = await transaction.subtask.updateMany({
        where: { id: subtaskId, organizationId, projectId, taskId },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.isCompleted !== undefined
            ? { isCompleted: input.isCompleted }
            : {}),
        },
      });
      if (updated.count !== 1) this.throwSubtaskNotFound();
      return this.findTaskInTransaction(
        transaction,
        organizationId,
        projectId,
        taskId,
      );
    });
    return { task: this.toTaskResponse(task) };
  }

  async deleteSubtask(
    actorId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
    subtaskId: string,
    taskVersion: number,
  ) {
    const task = await this.prisma.$transaction(async (transaction) => {
      await this.requireProjectForMutation(
        transaction,
        actorId,
        organizationId,
        projectId,
        PROJECT_PERMISSIONS.MANAGE_TASKS,
      );
      await this.bumpTaskVersion(
        transaction,
        organizationId,
        projectId,
        taskId,
        taskVersion,
      );
      const deleted = await transaction.subtask.deleteMany({
        where: { id: subtaskId, organizationId, projectId, taskId },
      });
      if (deleted.count !== 1) this.throwSubtaskNotFound();
      return this.findTaskInTransaction(
        transaction,
        organizationId,
        projectId,
        taskId,
      );
    });
    return { task: this.toTaskResponse(task) };
  }

  private async requireProjectForMutation(
    transaction: Prisma.TransactionClient,
    userId: string,
    organizationId: string,
    projectId: string,
    permission: AuthorizationProjectPermission,
  ) {
    const membership = await transaction.projectMember.findFirst({
      where: { userId, organizationId, projectId },
      include: {
        project: true,
        organizationMembership: { select: { role: true } },
      },
    });
    if (!membership) this.throwProjectNotFound();
    this.projectPolicy.require(
      {
        organizationRole: membership.organizationMembership.role,
        projectRole: membership.role,
      },
      permission,
    );
    if (membership.project.archivedAt) {
      throw new ConflictException({
        code: 'PROJECT_ARCHIVED',
        message: 'Archived projects are read-only.',
      });
    }
    return membership;
  }

  private async validateAssignees(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    projectId: string,
    userIds: string[],
  ): Promise<void> {
    if (userIds.length === 0) return;
    const validCount = await transaction.projectMember.count({
      where: { organizationId, projectId, userId: { in: userIds } },
    });
    if (validCount !== userIds.length) {
      throw new BadRequestException({
        code: 'TASK_ASSIGNEE_NOT_PROJECT_MEMBER',
        message: 'Every assignee must be a current member of this project.',
      });
    }
  }

  private async bumpTaskVersion(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    projectId: string,
    taskId: string,
    version: number,
  ): Promise<void> {
    const updated = await transaction.task.updateMany({
      where: {
        id: taskId,
        organizationId,
        projectId,
        archivedAt: null,
        version,
      },
      data: { version: { increment: 1 } },
    });
    if (updated.count !== 1) {
      await this.throwTaskConflictOrNotFound(
        transaction,
        organizationId,
        projectId,
        taskId,
      );
    }
  }

  private async throwTaskConflictOrNotFound(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    projectId: string,
    taskId: string,
  ): Promise<never> {
    const task = await transaction.task.findFirst({
      where: { id: taskId, organizationId, projectId, archivedAt: null },
      select: { id: true },
    });
    if (!task) this.throwTaskNotFound();
    throw new ConflictException({
      code: 'TASK_VERSION_CONFLICT',
      message: 'This task changed since it was loaded. Refresh and try again.',
    });
  }

  private async findTaskInTransaction(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    projectId: string,
    taskId: string,
  ) {
    const task = await transaction.task.findFirst({
      where: { id: taskId, organizationId, projectId, archivedAt: null },
      include: taskInclude,
    });
    if (!task) this.throwTaskNotFound();
    return task;
  }

  private toTaskResponse<
    T extends {
      assignees: Array<{ user: unknown }>;
    },
  >(task: T) {
    return {
      ...task,
      assignees: task.assignees.map((assignment) => assignment.user),
    };
  }

  private handleTransactionConflict(error: unknown): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2034'
    ) {
      throw new ConflictException({
        code: 'TASK_CONCURRENT_UPDATE',
        message: 'Task state changed concurrently. Please retry.',
      });
    }
    throw error;
  }

  private throwProjectNotFound(): never {
    throw new NotFoundException({
      code: 'PROJECT_NOT_FOUND',
      message: 'Project not found.',
    });
  }

  private throwTaskNotFound(): never {
    throw new NotFoundException({
      code: 'TASK_NOT_FOUND',
      message: 'Task not found.',
    });
  }

  private throwSubtaskNotFound(): never {
    throw new NotFoundException({
      code: 'SUBTASK_NOT_FOUND',
      message: 'Subtask not found.',
    });
  }
}
