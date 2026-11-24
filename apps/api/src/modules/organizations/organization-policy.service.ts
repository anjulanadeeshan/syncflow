import {
  Injectable,
} from '@nestjs/common';
import type { OrganizationMember } from '../../generated/prisma/client.js';
import { OrganizationAccessService } from '../authorization/organization-access.service.js';
import { ORGANIZATION_PERMISSIONS } from '../authorization/permissions.js';

@Injectable()
export class OrganizationPolicyService {
  constructor(private readonly access: OrganizationAccessService) {}

  async requireMember(
    userId: string,
    organizationId: string,
  ): Promise<OrganizationMember> {
    return this.access.requireMembership(
      userId,
      organizationId,
      ORGANIZATION_PERMISSIONS.READ,
    );
  }

  async requireManager(
    userId: string,
    organizationId: string,
  ): Promise<OrganizationMember> {
    return this.access.requireMembership(
      userId,
      organizationId,
      ORGANIZATION_PERMISSIONS.READ_INVITATIONS,
    );
  }

  async requireOwner(
    userId: string,
    organizationId: string,
  ): Promise<OrganizationMember> {
    return this.access.requireMembership(
      userId,
      organizationId,
      ORGANIZATION_PERMISSIONS.UPDATE_SETTINGS,
    );
  }
}
