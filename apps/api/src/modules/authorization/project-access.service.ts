import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import type { ProjectPermission } from './permissions.js';
import { ProjectAccessPolicyService } from './project-access-policy.service.js';

@Injectable()
export class ProjectAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: ProjectAccessPolicyService,
  ) {}

  async requireMembership(
    userId: string,
    organizationId: string,
    projectId: string,
    permission: ProjectPermission,
  ) {
    const membership = await this.prisma.projectMember.findFirst({
      where: { userId, organizationId, projectId },
      include: {
        project: true,
        organizationMembership: { select: { role: true } },
      },
    });
    if (!membership) this.throwProjectNotFound();

    this.policy.require(
      {
        organizationRole: membership.organizationMembership.role,
        projectRole: membership.role,
      },
      permission,
    );
    return membership;
  }

  private throwProjectNotFound(): never {
    throw new NotFoundException({
      code: 'PROJECT_NOT_FOUND',
      message: 'Project not found.',
    });
  }
}
