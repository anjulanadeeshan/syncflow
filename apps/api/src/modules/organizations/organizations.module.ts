import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { InvitationMailerService } from './invitation-mailer.service.js';
import { InvitationTokenService } from './invitation-token.service.js';
import { InvitationsController } from './invitations.controller.js';
import { OrganizationPolicyService } from './organization-policy.service.js';
import { OrganizationsController } from './organizations.controller.js';
import { OrganizationsService } from './organizations.service.js';

@Module({
  imports: [AuthModule],
  controllers: [OrganizationsController, InvitationsController],
  providers: [
    OrganizationsService,
    OrganizationPolicyService,
    InvitationTokenService,
    InvitationMailerService,
  ],
  exports: [InvitationMailerService],
})
export class OrganizationsModule {}
