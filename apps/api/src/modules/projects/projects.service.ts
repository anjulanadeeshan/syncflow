import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import {
  ORGANIZATION_PERMISSIONS,
  PROJECT_PERMISSIONS,
  type ProjectPermission,
} from '../authorization/permissions.js';
import { PermissionService } from '../authorization/permission.service.js';
import { ProjectAccessPolicyService } from '../authorization/project-access-policy.service.js';
import type { AddProjectMemberDto } from './dto/add-project-member.dto.js';
import type { CreateProjectDto } from './dto/create-project.dto.js';
import type { ProjectPaginationDto } from './dto/project-pagination.dto.js';
import type { UpdateProjectMemberRoleDto } from './dto/update-project-member-role.dto.js';
import type { UpdateProjectDto } from './dto/update-project.dto.js';
import { DEFAULT_WORKFLOW_COLUMNS } from './project.types.js';

const projectDetailsInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  memberships: {
    include: {
      organizationMembership: {
        select: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
    orderBy: { joinedAt: 'asc' as const },
  },
  workflowColumns: {
    where: { archivedAt: null },
    orderBy: { rank: 'asc' as const },
  },
  _count: { select: { memberships: true, tasks: true } },
} satisfies Prisma.ProjectInclude;

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionService,
    private readonly projectPolicy: ProjectAccessPolicyService,
  ) {}

  async create(
    actorId: string,
    organizationId: string,
    input: CreateProjectDto,
  ) {
    try {
      const project = await this.prisma.$transaction(
        async (transaction) => {
          const organizationMembership =
            await transaction.organizationMember.findUnique({
              where: {
                organizationId_userId: { organizationId, userId: actorId },
              },
            });
          if (!organizationMembership) this.throwOrganizationNotFound();
          this.permissions.requireOrganizationPermission(
            organizationMembership.role,
            ORGANIZATION_PERMISSIONS.CREATE_PROJECTS,
          );

          const created = await transaction.project.create({
            data: {
              organizationId,
              name: input.name,
              key: input.key,
              description: input.description || null,
              createdById: actorId,
            },
          });
          await transaction.projectMember.create({
            data: {
              projectId: created.id,
              organizationId,
              userId: actorId,
              role: 'PROJECT_MANAGER',
            },
          });
          await transaction.workflowColumn.createMany({
            data: DEFAULT_WORKFLOW_COLUMNS.map((column) => ({
              projectId: created.id,
              organizationId,
              ...column,
            })),
          });
          return this.findProjectDetails(
            transaction,
            organizationId,
            created.id,
          );
        },
        { isolationLevel: 'Serializable' },
      );
      return { project: this.toProjectDetails(project, actorId) };
    } catch (error) {
      if (this.isPrismaError(error, 'P2002')) this.throwProjectKeyTaken();
      if (this.isPrismaError(error, 'P2034')) this.throwProjectConflict();
      throw error;
    }
  }

  async list(
    userId: string,
    organizationId: string,
    pagination: ProjectPaginationDto,
  ) {
    const where: Prisma.ProjectMemberWhereInput = {
      userId,
      organizationId,
      project: { archivedAt: null },
    };
    const skip = (pagination.page - 1) * pagination.limit;
    const [memberships, total] = await this.prisma.$transaction([
      this.prisma.projectMember.findMany({
        where,
        include: {
          project: {
            include: {
              _count: { select: { memberships: true, tasks: true } },
            },
          },
        },
        orderBy: [
          { project: { updatedAt: 'desc' } },
          { projectId: 'asc' },
        ],
        skip,
        take: pagination.limit,
      }),
      this.prisma.projectMember.count({ where }),
    ]);

    return {
      projects: memberships.map((membership) => ({
        ...membership.project,
        role: membership.role,
        memberCount: membership.project._count.memberships,
        taskCount: membership.project._count.tasks,
        _count: undefined,
      })),
      total,
      page: pagination.page,
      limit: pagination.limit,
    };
  }

  async get(userId: string, organizationId: string, projectId: string) {
    const membership = await this.prisma.projectMember.findFirst({
      where: { userId, organizationId, projectId },
      include: { project: { include: projectDetailsInclude } },
    });
    if (!membership) this.throwProjectNotFound();
    return {
      project: this.toProjectDetails(membership.project, userId),
    };
  }

  async update(
    actorId: string,
    organizationId: string,
    projectId: string,
    input: UpdateProjectDto,
  ) {
    if (
      input.name === undefined &&
      input.key === undefined &&
      input.description === undefined
    ) {
      throw new BadRequestException({
        code: 'PROJECT_UPDATE_EMPTY',
        message: 'Provide at least one project field to update.',
      });
    }

    try {
      const project = await this.prisma.$transaction(async (transaction) => {
        await this.requireProjectForMutation(
          transaction,
          actorId,
          organizationId,
          projectId,
          PROJECT_PERMISSIONS.UPDATE,
        );
        await transaction.project.update({
          where: { id_organizationId: { id: projectId, organizationId } },
          data: {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.key !== undefined ? { key: input.key } : {}),
            ...(input.description !== undefined
              ? { description: input.description || null }
              : {}),
          },
        });
        return this.findProjectDetails(transaction, organizationId, projectId);
      });
      return { project: this.toProjectDetails(project, actorId) };
    } catch (error) {
      if (this.isPrismaError(error, 'P2002')) this.throwProjectKeyTaken();
      throw error;
    }
  }

  async archive(
    actorId: string,
    organizationId: string,
    projectId: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await this.requireProjectForMutation(
        transaction,
        actorId,
        organizationId,
        projectId,
        PROJECT_PERMISSIONS.ARCHIVE,
      );
      const archived = await transaction.project.updateMany({
        where: { id: projectId, organizationId, archivedAt: null },
        data: { archivedAt: new Date() },
      });
      if (archived.count !== 1) {
        throw new ConflictException({
          code: 'PROJECT_ALREADY_ARCHIVED',
          message: 'This project is already archived.',
        });
      }
    });
  }

  async listMembers(organizationId: string, projectId: string) {
    const memberships = await this.prisma.projectMember.findMany({
      where: { organizationId, projectId },
      include: {
        organizationMembership: {
          select: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
      take: 200,
    });
    return {
      members: memberships.map((membership) => ({
        user: membership.organizationMembership.user,
        role: membership.role,
        joinedAt: membership.joinedAt,
      })),
    };
  }

  async addMember(
    actorId: string,
    organizationId: string,
    projectId: string,
    input: AddProjectMemberDto,
  ) {
    try {
      const membership = await this.prisma.$transaction(
        async (transaction) => {
          await this.requireProjectForMutation(
            transaction,
            actorId,
            organizationId,
            projectId,
            PROJECT_PERMISSIONS.MANAGE_MEMBERS,
          );
          const organizationMembership =
            await transaction.organizationMember.findUnique({
              where: {
                organizationId_userId: {
                  organizationId,
                  userId: input.userId,
                },
              },
            });
          if (!organizationMembership) {
            throw new BadRequestException({
              code: 'PROJECT_MEMBER_NOT_ORGANIZATION_MEMBER',
              message: 'Only organization members can be added to a project.',
            });
          }
          return transaction.projectMember.create({
            data: {
              projectId,
              organizationId,
              userId: input.userId,
              role: input.role,
            },
          });
        },
        { isolationLevel: 'Serializable' },
      );
      return { membership };
    } catch (error) {
      if (this.isPrismaError(error, 'P2002')) {
        throw new ConflictException({
          code: 'PROJECT_MEMBER_EXISTS',
          message: 'This user is already a project member.',
        });
      }
      if (this.isPrismaError(error, 'P2034')) this.throwProjectConflict();
      throw error;
    }
  }

  async updateMemberRole(
    actorId: string,
    organizationId: string,
    projectId: string,
    targetUserId: string,
    input: UpdateProjectMemberRoleDto,
  ) {
    try {
      const membership = await this.prisma.$transaction(
        async (transaction) => {
          await this.requireProjectForMutation(
            transaction,
            actorId,
            organizationId,
            projectId,
            PROJECT_PERMISSIONS.MANAGE_MEMBERS,
          );
          const target = await transaction.projectMember.findFirst({
            where: {
              projectId,
              organizationId,
              userId: targetUserId,
            },
          });
          if (!target) this.throwProjectMemberNotFound();
          if (target.role === 'PROJECT_MANAGER' && input.role !== 'PROJECT_MANAGER') {
            await this.ensureAnotherManager(
              transaction,
              projectId,
              targetUserId,
            );
          }
          return transaction.projectMember.update({
            where: {
              projectId_userId: { projectId, userId: targetUserId },
            },
            data: { role: input.role },
          });
        },
        { isolationLevel: 'Serializable' },
      );
      return { membership };
    } catch (error) {
      if (this.isPrismaError(error, 'P2034')) this.throwProjectConflict();
      throw error;
    }
  }

  async removeMember(
    actorId: string,
    organizationId: string,
    projectId: string,
    targetUserId: string,
  ): Promise<void> {
    try {
      await this.prisma.$transaction(
        async (transaction) => {
          await this.requireProjectForMutation(
            transaction,
            actorId,
            organizationId,
            projectId,
            PROJECT_PERMISSIONS.MANAGE_MEMBERS,
          );
          const target = await transaction.projectMember.findFirst({
            where: {
              projectId,
              organizationId,
              userId: targetUserId,
            },
          });
          if (!target) this.throwProjectMemberNotFound();
          if (target.role === 'PROJECT_MANAGER') {
            await this.ensureAnotherManager(
              transaction,
              projectId,
              targetUserId,
            );
          }
          await transaction.projectMember.delete({
            where: {
              projectId_userId: { projectId, userId: targetUserId },
            },
          });
        },
        { isolationLevel: 'Serializable' },
      );
    } catch (error) {
      if (this.isPrismaError(error, 'P2034')) this.throwProjectConflict();
      throw error;
    }
  }

  private async requireProjectForMutation(
    transaction: Prisma.TransactionClient,
    userId: string,
    organizationId: string,
    projectId: string,
    permission: ProjectPermission,
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

  private async ensureAnotherManager(
    transaction: Prisma.TransactionClient,
    projectId: string,
    excludedUserId: string,
  ): Promise<void> {
    const anotherManager = await transaction.projectMember.count({
      where: {
        projectId,
        role: 'PROJECT_MANAGER',
        userId: { not: excludedUserId },
      },
    });
    if (anotherManager === 0) {
      throw new ConflictException({
        code: 'PROJECT_LAST_MANAGER',
        message: 'A project must retain at least one project manager.',
      });
    }
  }

  private async findProjectDetails(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    projectId: string,
  ) {
    const project = await transaction.project.findFirst({
      where: { id: projectId, organizationId },
      include: projectDetailsInclude,
    });
    if (!project) this.throwProjectNotFound();
    return project;
  }

  private toProjectDetails<
    T extends {
      memberships: Array<{
        userId: string;
        role: 'PROJECT_MANAGER' | 'MEMBER';
        joinedAt: Date;
        organizationMembership: { user: unknown };
      }>;
      _count: { memberships: number; tasks: number };
    },
  >(project: T, currentUserId: string) {
    const currentMembership = project.memberships.find(
      (membership) => membership.userId === currentUserId,
    );
    if (!currentMembership) this.throwProjectNotFound();
    return {
      ...project,
      role: currentMembership.role,
      memberCount: project._count.memberships,
      taskCount: project._count.tasks,
      memberships: project.memberships.map((membership) => ({
        user: membership.organizationMembership.user,
        role: membership.role,
        joinedAt: membership.joinedAt,
      })),
      _count: undefined,
    };
  }

  private isPrismaError(error: unknown, code: string): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === code
    );
  }

  private throwOrganizationNotFound(): never {
    throw new NotFoundException({
      code: 'ORGANIZATION_NOT_FOUND',
      message: 'Organization not found.',
    });
  }

  private throwProjectNotFound(): never {
    throw new NotFoundException({
      code: 'PROJECT_NOT_FOUND',
      message: 'Project not found.',
    });
  }

  private throwProjectMemberNotFound(): never {
    throw new NotFoundException({
      code: 'PROJECT_MEMBER_NOT_FOUND',
      message: 'Project member not found.',
    });
  }

  private throwProjectKeyTaken(): never {
    throw new ConflictException({
      code: 'PROJECT_KEY_TAKEN',
      message: 'This project key is already in use in the organization.',
    });
  }

  private throwProjectConflict(): never {
    throw new ConflictException({
      code: 'PROJECT_CONCURRENT_UPDATE',
      message: 'Project state changed concurrently. Please retry.',
    });
  }
}
