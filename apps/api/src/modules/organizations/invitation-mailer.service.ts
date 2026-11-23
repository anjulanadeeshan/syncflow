import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import type { OrganizationRoleValue } from './organization.types.js';

export type TestInvitationDelivery = {
  email: string;
  organizationName: string;
  role: OrganizationRoleValue;
  invitationUrl: string;
};

@Injectable()
export class InvitationMailerService {
  private readonly transporter: Transporter | null;
  private readonly from: string;
  private readonly webUrl: string;
  private readonly testDeliveries: TestInvitationDelivery[] = [];

  constructor(configService: ConfigService) {
    const isTest = configService.getOrThrow<string>('NODE_ENV') === 'test';
    this.from = configService.getOrThrow<string>('MAIL_FROM');
    this.webUrl = configService
      .getOrThrow<string>('WEB_URL')
      .replace(/\/$/, '');
    this.transporter = isTest
      ? null
      : nodemailer.createTransport({
          host: configService.getOrThrow<string>('SMTP_HOST'),
          port: configService.getOrThrow<number>('SMTP_PORT'),
          secure: false,
        });
  }

  async sendInvitation(input: {
    email: string;
    organizationName: string;
    inviterName: string;
    role: OrganizationRoleValue;
    token: string;
  }): Promise<void> {
    const invitationUrl = `${this.webUrl}/invitations/accept#token=${encodeURIComponent(input.token)}`;
    if (!this.transporter) {
      this.testDeliveries.push({
        email: input.email,
        organizationName: input.organizationName,
        role: input.role,
        invitationUrl,
      });
      return;
    }

    await this.transporter.sendMail({
      from: this.from,
      to: input.email,
      subject: `Join ${input.organizationName} on SyncFlow`,
      text: [
        `${input.inviterName} invited you to join ${input.organizationName} as ${input.role.toLowerCase()}.`,
        '',
        `Open this secure link to accept or reject the invitation: ${invitationUrl}`,
        '',
        'This invitation is single-use and expires automatically.',
      ].join('\n'),
    });
  }

  getTestDeliveries(): readonly TestInvitationDelivery[] {
    return this.testDeliveries;
  }

  clearTestDeliveries(): void {
    this.testDeliveries.length = 0;
  }
}
