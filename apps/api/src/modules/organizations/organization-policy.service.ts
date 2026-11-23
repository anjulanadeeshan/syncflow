import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { OrganizationMember } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';

@Injectable()
export class OrganizationPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async requireMember(
    userId: string,
    organizationId: string,
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
    return membership;
  }

  async requireManager(
    userId: string,
    organizationId: string,
  ): Promise<OrganizationMember> {
    const membership = await this.requireMember(userId, organizationId);
    if (membership.role === 'MEMBER') {
      throw new ForbiddenException({
        code: 'ORGANIZATION_PERMISSION_DENIED',
        message: 'Organization management permission is required.',
      });
    }
    return membership;
  }

  async requireOwner(
    userId: string,
    organizationId: string,
  ): Promise<OrganizationMember> {
    const membership = await this.requireMember(userId, organizationId);
    if (membership.role !== 'OWNER') {
      throw new ForbiddenException({
        code: 'ORGANIZATION_OWNER_REQUIRED',
        message: 'Organization owner permission is required.',
      });
    }
    return membership;
  }
}
