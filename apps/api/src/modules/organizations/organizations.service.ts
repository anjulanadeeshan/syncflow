import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import {
  ORGANIZATION_PERMISSIONS,
} from '../authorization/permissions.js';
import { PermissionService } from '../authorization/permission.service.js';
import type { PublicUser } from '../auth/auth.types.js';
import type { CreateOrganizationDto } from './dto/create-organization.dto.js';
import type { InviteMemberDto } from './dto/invite-member.dto.js';
import type { PaginationDto } from './dto/pagination.dto.js';
import type { UpdateMemberRoleDto } from './dto/update-member-role.dto.js';
import type { UpdateOrganizationDto } from './dto/update-organization.dto.js';
import { InvitationMailerService } from './invitation-mailer.service.js';
import { InvitationTokenService } from './invitation-token.service.js';
import { OrganizationPolicyService } from './organization-policy.service.js';
import type {
  OrganizationRoleValue,
  OrganizationSummary,
} from './organization.types.js';

type ResolvedInvitation = {
  id: string;
  organizationId: string;
  email: string;
  role: OrganizationRoleValue;
  tokenHash: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  rejectedAt: Date | null;
  cancelledAt: Date | null;
  expiredAt: Date | null;
  organization: { id: string; name: string; slug: string };
};

@Injectable()
export class OrganizationsService {
  private readonly invitationTtlMilliseconds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: OrganizationPolicyService,
    private readonly permissions: PermissionService,
    private readonly invitationTokens: InvitationTokenService,
    private readonly invitationMailer: InvitationMailerService,
    configService: ConfigService,
  ) {
    this.invitationTtlMilliseconds =
      configService.getOrThrow<number>('INVITATION_TTL_HOURS') * 60 * 60 * 1000;
  }

  async create(
    userId: string,
    input: CreateOrganizationDto,
  ): Promise<OrganizationSummary> {
    const slug = input.slug ?? this.slugify(input.name);
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const organization = await transaction.organization.create({
          data: { name: input.name, slug },
        });
        await transaction.organizationMember.create({
          data: { organizationId: organization.id, userId, role: 'OWNER' },
        });
        return {
          ...organization,
          role: 'OWNER' as const,
          memberCount: 1,
        };
      });
    } catch (error) {
      if (this.isPrismaError(error, 'P2002')) {
        throw new ConflictException({
          code: 'ORGANIZATION_SLUG_TAKEN',
          message: 'This organization slug is already in use.',
        });
      }
      throw error;
    }
  }

  async list(
    userId: string,
  ): Promise<{ organizations: OrganizationSummary[] }> {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: {
          include: { _count: { select: { memberships: true } } },
        },
      },
      orderBy: { joinedAt: 'desc' },
      take: 100,
    });

    return {
      organizations: memberships.map(({ organization, role }) => ({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        role,
        memberCount: organization._count.memberships,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt,
      })),
    };
  }

  async getDetails(userId: string, organizationId: string) {
    const membership = await this.policy.requireMember(userId, organizationId);
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: { select: { memberships: true, invitations: true } },
      },
    });
    if (!organization) this.throwOrganizationNotFound();

    return {
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        role: membership.role,
        memberCount: organization._count.memberships,
        invitationCount: organization._count.invitations,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt,
      },
    };
  }

  async update(
    userId: string,
    organizationId: string,
    input: UpdateOrganizationDto,
  ) {
    if (!input.name && !input.slug) {
      throw new BadRequestException({
        code: 'ORGANIZATION_UPDATE_EMPTY',
        message: 'Provide a name or slug to update.',
      });
    }
    try {
      const organization = await this.prisma.$transaction(
        async (transaction) => {
          const actor = await transaction.organizationMember.findUnique({
            where: { organizationId_userId: { organizationId, userId } },
          });
          if (!actor) this.throwOrganizationNotFound();
          this.permissions.requireOrganizationPermission(
            actor.role,
            ORGANIZATION_PERMISSIONS.UPDATE_SETTINGS,
          );
          return transaction.organization.update({
            where: { id: organizationId },
            data: {
              ...(input.name ? { name: input.name } : {}),
              ...(input.slug ? { slug: input.slug } : {}),
            },
          });
        },
      );
      return { organization };
    } catch (error) {
      if (this.isPrismaError(error, 'P2002')) {
        throw new ConflictException({
          code: 'ORGANIZATION_SLUG_TAKEN',
          message: 'This organization slug is already in use.',
        });
      }
      throw error;
    }
  }

  async listMembers(
    userId: string,
    organizationId: string,
    pagination: PaginationDto,
  ) {
    await this.policy.requireMember(userId, organizationId);
    const skip = (pagination.page - 1) * pagination.limit;
    const [memberships, total] = await this.prisma.$transaction([
      this.prisma.organizationMember.findMany({
        where: { organizationId },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
        skip,
        take: pagination.limit,
      }),
      this.prisma.organizationMember.count({ where: { organizationId } }),
    ]);

    return {
      members: memberships.map((membership) => ({
        user: membership.user,
        role: membership.role,
        joinedAt: membership.joinedAt,
      })),
      total,
      page: pagination.page,
      limit: pagination.limit,
    };
  }

  async updateMemberRole(
    actorId: string,
    organizationId: string,
    targetUserId: string,
    input: UpdateMemberRoleDto,
  ) {
    try {
      const membership = await this.prisma.$transaction(
        async (transaction) => {
          const actor = await transaction.organizationMember.findUnique({
            where: {
              organizationId_userId: { organizationId, userId: actorId },
            },
          });
          if (!actor) this.throwOrganizationNotFound();
          this.permissions.requireOrganizationPermission(
            actor.role,
            ORGANIZATION_PERMISSIONS.ASSIGN_ROLES,
          );
          const target = await transaction.organizationMember.findUnique({
            where: {
              organizationId_userId: { organizationId, userId: targetUserId },
            },
          });
          if (!target) this.throwMemberNotFound();
          if (target.role === 'OWNER' && input.role !== 'OWNER') {
            const ownerCount = await transaction.organizationMember.count({
              where: { organizationId, role: 'OWNER' },
            });
            if (ownerCount <= 1) this.throwLastOwner();
          }
          return transaction.organizationMember.update({
            where: {
              organizationId_userId: { organizationId, userId: targetUserId },
            },
            data: { role: input.role },
          });
        },
        { isolationLevel: 'Serializable' },
      );
      return { membership };
    } catch (error) {
      if (this.isPrismaError(error, 'P2034')) this.throwConcurrentMembership();
      throw error;
    }
  }

  async removeMember(
    actorId: string,
    organizationId: string,
    targetUserId: string,
  ): Promise<void> {
    try {
      await this.prisma.$transaction(
        async (transaction) => {
          const actor = await transaction.organizationMember.findUnique({
            where: {
              organizationId_userId: { organizationId, userId: actorId },
            },
          });
          if (!actor) this.throwOrganizationNotFound();
          this.permissions.requireOrganizationPermission(
            actor.role,
            ORGANIZATION_PERMISSIONS.REMOVE_MEMBERS,
          );
          const target = await transaction.organizationMember.findUnique({
            where: {
              organizationId_userId: { organizationId, userId: targetUserId },
            },
          });
          if (!target) this.throwMemberNotFound();
          if (
            !this.permissions.canRemoveOrganizationRole(
              actor.role,
              target.role,
            )
          ) {
            throw new ForbiddenException({
              code: 'ORGANIZATION_PERMISSION_DENIED',
              message: 'Administrators can only remove members.',
            });
          }
          if (target.role === 'OWNER') {
            const ownerCount = await transaction.organizationMember.count({
              where: { organizationId, role: 'OWNER' },
            });
            if (ownerCount <= 1) this.throwLastOwner();
          }
          await transaction.organizationMember.delete({
            where: {
              organizationId_userId: { organizationId, userId: targetUserId },
            },
          });
        },
        { isolationLevel: 'Serializable' },
      );
    } catch (error) {
      if (this.isPrismaError(error, 'P2034')) this.throwConcurrentMembership();
      throw error;
    }
  }

  async createInvitation(
    actor: PublicUser,
    organizationId: string,
    input: InviteMemberDto,
  ) {
    const activeKey = this.getActiveInvitationKey(organizationId, input.email);
    const invitationId = randomUUID();
    const token = this.invitationTokens.create(invitationId);
    let result;
    try {
      result = await this.prisma.$transaction(
        async (transaction) => {
          const actorMembership =
            await transaction.organizationMember.findUnique({
              where: {
                organizationId_userId: {
                  organizationId,
                  userId: actor.id,
                },
              },
            });
          if (!actorMembership) this.throwOrganizationNotFound();
          this.permissions.requireOrganizationPermission(
            actorMembership.role,
            ORGANIZATION_PERMISSIONS.INVITE_MEMBERS,
          );
          if (
            !this.permissions.canAssignOrganizationRole(
              actorMembership.role,
              input.role,
            )
          ) {
            throw new ForbiddenException({
              code: 'INVITATION_ROLE_NOT_ALLOWED',
              message: 'Administrators can only invite organization members.',
            });
          }

          const organization = await transaction.organization.findUnique({
            where: { id: organizationId },
            select: { id: true, name: true },
          });
          if (!organization) this.throwOrganizationNotFound();
          await transaction.invitation.updateMany({
            where: {
              organizationId,
              email: input.email,
              activeKey: { not: null },
              expiresAt: { lte: new Date() },
            },
            data: { activeKey: null, expiredAt: new Date() },
          });
          const existingMembership =
            await transaction.organizationMember.findFirst({
              where: { organizationId, user: { email: input.email } },
            });
          if (existingMembership) {
            throw new ConflictException({
              code: 'ORGANIZATION_MEMBER_EXISTS',
              message: 'This user is already an organization member.',
            });
          }
          const invitation = await transaction.invitation.create({
            data: {
              id: invitationId,
              organizationId,
              email: input.email,
              role: input.role,
              tokenHash: this.invitationTokens.hash(token),
              activeKey,
              invitedById: actor.id,
              expiresAt: new Date(Date.now() + this.invitationTtlMilliseconds),
            },
            include: {
              invitedBy: { select: { id: true, name: true, email: true } },
            },
          });
          return { organization, invitation };
        },
        { isolationLevel: 'Serializable' },
      );
    } catch (error) {
      if (this.isPrismaError(error, 'P2002')) {
        throw new ConflictException({
          code: 'INVITATION_ALREADY_ACTIVE',
          message: 'An active invitation already exists for this email.',
        });
      }
      if (this.isPrismaError(error, 'P2034')) {
        throw new ConflictException({
          code: 'INVITATION_CONFLICT',
          message: 'Invitation state changed concurrently. Please retry.',
        });
      }
      throw error;
    }

    try {
      await this.invitationMailer.sendInvitation({
        email: input.email,
        organizationName: result.organization.name,
        inviterName: actor.name,
        role: input.role,
        token,
      });
    } catch {
      await this.prisma.invitation.updateMany({
        where: { id: result.invitation.id, activeKey },
        data: { activeKey: null, cancelledAt: new Date() },
      });
      throw new ServiceUnavailableException({
        code: 'INVITATION_DELIVERY_FAILED',
        message: 'The invitation email could not be delivered.',
      });
    }

    return { invitation: this.toInvitationResponse(result.invitation) };
  }

  async listInvitations(
    userId: string,
    organizationId: string,
    pagination: PaginationDto,
  ) {
    await this.policy.requireManager(userId, organizationId);
    await this.expireActiveInvitations({ organizationId });
    const skip = (pagination.page - 1) * pagination.limit;
    const [invitations, total] = await this.prisma.$transaction([
      this.prisma.invitation.findMany({
        where: { organizationId },
        include: {
          invitedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pagination.limit,
      }),
      this.prisma.invitation.count({ where: { organizationId } }),
    ]);
    return {
      invitations: invitations.map((invitation) =>
        this.toInvitationResponse(invitation),
      ),
      total,
      page: pagination.page,
      limit: pagination.limit,
    };
  }

  async cancelInvitation(
    actorId: string,
    organizationId: string,
    invitationId: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const actor = await transaction.organizationMember.findUnique({
        where: {
          organizationId_userId: { organizationId, userId: actorId },
        },
      });
      if (!actor) this.throwOrganizationNotFound();
      this.permissions.requireOrganizationPermission(
        actor.role,
        ORGANIZATION_PERMISSIONS.CANCEL_INVITATIONS,
      );
      const invitation = await transaction.invitation.findFirst({
        where: { id: invitationId, organizationId },
      });
      if (!invitation) this.throwInvitationNotFound();
      if (
        !this.permissions.canAssignOrganizationRole(
          actor.role,
          invitation.role,
        )
      ) {
        throw new ForbiddenException({
          code: 'ORGANIZATION_PERMISSION_DENIED',
          message: 'Administrators can only manage member invitations.',
        });
      }
      const updated = await transaction.invitation.updateMany({
        where: { id: invitationId, organizationId, activeKey: { not: null } },
        data: { activeKey: null, cancelledAt: new Date() },
      });
      if (updated.count !== 1) this.throwInvitationNotActive();
    });
  }

  async getInvitation(user: PublicUser, token: string) {
    const invitation = await this.resolveInvitation(user, token);
    return {
      invitation: {
        organization: invitation.organization,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
    };
  }

  async acceptInvitation(user: PublicUser, token: string) {
    const invitation = await this.resolveInvitation(user, token);
    try {
      await this.prisma.$transaction(async (transaction) => {
        const accepted = await transaction.invitation.updateMany({
          where: {
            id: invitation.id,
            activeKey: { not: null },
            acceptedAt: null,
            rejectedAt: null,
            cancelledAt: null,
            expiredAt: null,
            expiresAt: { gt: new Date() },
          },
          data: { activeKey: null, acceptedAt: new Date() },
        });
        if (accepted.count !== 1) this.throwInvitationNotActive();
        await transaction.organizationMember.create({
          data: {
            organizationId: invitation.organizationId,
            userId: user.id,
            role: invitation.role,
          },
        });
      });
    } catch (error) {
      if (this.isPrismaError(error, 'P2002')) {
        throw new ConflictException({
          code: 'ORGANIZATION_MEMBER_EXISTS',
          message: 'You are already a member of this organization.',
        });
      }
      throw error;
    }

    return {
      organization: invitation.organization,
      role: invitation.role,
    };
  }

  async rejectInvitation(user: PublicUser, token: string): Promise<void> {
    const invitation = await this.resolveInvitation(user, token);
    const rejected = await this.prisma.invitation.updateMany({
      where: {
        id: invitation.id,
        activeKey: { not: null },
        expiresAt: { gt: new Date() },
      },
      data: { activeKey: null, rejectedAt: new Date() },
    });
    if (rejected.count !== 1) this.throwInvitationNotActive();
  }

  private async resolveInvitation(
    user: PublicUser,
    token: string,
  ): Promise<ResolvedInvitation> {
    const invitationId = this.invitationTokens.getInvitationId(token);
    if (!invitationId) this.throwInvitationNotFound();
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
      },
    });
    if (
      !invitation ||
      !this.invitationTokens.matches(token, invitation.tokenHash)
    ) {
      this.throwInvitationNotFound();
    }
    if (invitation.email !== user.email) {
      throw new ForbiddenException({
        code: 'INVITATION_EMAIL_MISMATCH',
        message: 'This invitation belongs to a different email address.',
      });
    }
    if (invitation.expiresAt <= new Date() || invitation.expiredAt) {
      await this.prisma.invitation.updateMany({
        where: { id: invitation.id, activeKey: { not: null } },
        data: { activeKey: null, expiredAt: new Date() },
      });
      throw new GoneException({
        code: 'INVITATION_EXPIRED',
        message: 'This invitation has expired.',
      });
    }
    if (
      invitation.acceptedAt ||
      invitation.rejectedAt ||
      invitation.cancelledAt ||
      !invitation.activeKey
    ) {
      this.throwInvitationNotActive();
    }
    return invitation;
  }

  private async expireActiveInvitations(where: {
    organizationId: string;
    email?: string;
  }): Promise<void> {
    await this.prisma.invitation.updateMany({
      where: {
        ...where,
        activeKey: { not: null },
        expiresAt: { lte: new Date() },
      },
      data: { activeKey: null, expiredAt: new Date() },
    });
  }

  private toInvitationResponse(invitation: {
    id: string;
    email: string;
    role: OrganizationRoleValue;
    expiresAt: Date;
    acceptedAt: Date | null;
    rejectedAt: Date | null;
    cancelledAt: Date | null;
    expiredAt: Date | null;
    createdAt: Date;
    invitedBy: { id: string; name: string; email: string };
  }) {
    const status = invitation.acceptedAt
      ? 'ACCEPTED'
      : invitation.rejectedAt
        ? 'REJECTED'
        : invitation.cancelledAt
          ? 'CANCELLED'
          : invitation.expiredAt || invitation.expiresAt <= new Date()
            ? 'EXPIRED'
            : 'PENDING';
    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      invitedBy: invitation.invitedBy,
    };
  }

  private slugify(value: string): string {
    const normalized = value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50)
      .replace(/-$/g, '');
    if (normalized.length >= 3) return normalized;
    return `org-${randomUUID().slice(0, 8)}`;
  }

  private getActiveInvitationKey(
    organizationId: string,
    email: string,
  ): string {
    return `${organizationId}:${email}`;
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

  private throwMemberNotFound(): never {
    throw new NotFoundException({
      code: 'ORGANIZATION_MEMBER_NOT_FOUND',
      message: 'Organization member not found.',
    });
  }

  private throwInvitationNotFound(): never {
    throw new NotFoundException({
      code: 'INVITATION_NOT_FOUND',
      message: 'Invitation not found.',
    });
  }

  private throwInvitationNotActive(): never {
    throw new ConflictException({
      code: 'INVITATION_NOT_ACTIVE',
      message: 'This invitation is no longer active.',
    });
  }

  private throwLastOwner(): never {
    throw new ConflictException({
      code: 'ORGANIZATION_LAST_OWNER',
      message: 'The last organization owner cannot be removed or demoted.',
    });
  }

  private throwConcurrentMembership(): never {
    throw new ConflictException({
      code: 'ORGANIZATION_MEMBERSHIP_CONFLICT',
      message: 'Membership changed concurrently. Please retry.',
    });
  }
}
