import { Injectable, NotFoundException } from '@nestjs/common';
import type { OrganizationMember } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import type { OrganizationPermission } from './permissions.js';
import { PermissionService } from './permission.service.js';

@Injectable()
export class OrganizationAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionService,
  ) {}

  async requireMembership(
    userId: string,
    organizationId: string,
    permission: OrganizationPermission,
  ): Promise<OrganizationMember> {
    const membership = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    if (!membership) {
      throw new NotFoundException({
        code: 'ORGANIZATION_NOT_FOUND',
        message: 'Organization not found.',
      });
    }
    this.permissions.requireOrganizationPermission(membership.role, permission);
    return membership;
  }
}
