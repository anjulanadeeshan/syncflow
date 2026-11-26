import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import type { OrganizationRoleValue } from './organization.types.js';

type MailProvider = 'smtp' | 'brevo' | 'test';

export type TestInvitationDelivery = {
  email: string;
  organizationName: string;
  role: OrganizationRoleValue;
  invitationUrl: string;
};

@Injectable()
export class InvitationMailerService {
  private readonly provider: MailProvider;
  private readonly transporter: Transporter | null;
  private readonly from: string;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly brevoApiKey: string | undefined;
  private readonly webUrl: string;
  private readonly testDeliveries: TestInvitationDelivery[] = [];

  constructor(configService: ConfigService) {
    const isTest = configService.getOrThrow<string>('NODE_ENV') === 'test';
    this.provider = isTest
      ? 'test'
      : configService.getOrThrow<'smtp' | 'brevo'>('MAIL_PROVIDER');
    this.from = configService.getOrThrow<string>('MAIL_FROM');
    this.fromEmail = configService.getOrThrow<string>('MAIL_FROM_EMAIL');
    this.fromName = configService.getOrThrow<string>('MAIL_FROM_NAME');
    this.brevoApiKey = configService.get<string>('BREVO_API_KEY');
    this.webUrl = configService
      .getOrThrow<string>('WEB_URL')
      .replace(/\/$/, '');
    this.transporter =
      this.provider === 'smtp'
        ? nodemailer.createTransport({
          host: configService.getOrThrow<string>('SMTP_HOST'),
          port: configService.getOrThrow<number>('SMTP_PORT'),
          secure: false,
          })
        : null;
  }

  createInvitationUrl(token: string): string {
    return `${this.webUrl}/invitations/accept#token=${encodeURIComponent(token)}`;
  }

  async sendInvitation(input: {
    email: string;
    organizationName: string;
    inviterName: string;
    role: OrganizationRoleValue;
    invitationUrl: string;
  }): Promise<void> {
    if (this.provider === 'test') {
      this.testDeliveries.push({
        email: input.email,
        organizationName: input.organizationName,
        role: input.role,
        invitationUrl: input.invitationUrl,
      });
      return;
    }

    const subject = `Join ${input.organizationName} on SyncFlow`;
    const text = [
      `${input.inviterName} invited you to join ${input.organizationName} as ${input.role.toLowerCase()}.`,
      '',
      `Open this secure link to accept or reject the invitation: ${input.invitationUrl}`,
      '',
      'This invitation is single-use and expires automatically.',
    ].join('\n');

    if (this.provider === 'brevo') {
      await this.sendWithBrevo({
        email: input.email,
        subject,
        htmlContent: this.createHtmlMessage(input),
      });
      return;
    }

    await this.transporter?.sendMail({
      from: this.from,
      to: input.email,
      subject,
      text,
    });
  }

  private async sendWithBrevo(input: {
    email: string;
    subject: string;
    htmlContent: string;
  }): Promise<void> {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': this.brevoApiKey ?? '',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { email: this.fromEmail, name: this.fromName },
        to: [{ email: input.email }],
        subject: input.subject,
        htmlContent: input.htmlContent,
      }),
    });

    if (!response.ok) {
      throw new Error(`Brevo invitation delivery failed with HTTP ${response.status}.`);
    }
  }

  private createHtmlMessage(input: {
    organizationName: string;
    inviterName: string;
    role: OrganizationRoleValue;
    invitationUrl: string;
  }): string {
    const organizationName = this.escapeHtml(input.organizationName);
    const inviterName = this.escapeHtml(input.inviterName);
    const role = this.escapeHtml(input.role.toLowerCase());
    const invitationUrl = this.escapeHtml(input.invitationUrl);
    return [
      `<p>${inviterName} invited you to join <strong>${organizationName}</strong> as ${role}.</p>`,
      `<p><a href="${invitationUrl}">Open the secure SyncFlow invitation</a></p>`,
      '<p>This invitation is single-use and expires automatically.</p>',
    ].join('');
  }

  private escapeHtml(value: string): string {
    return value.replace(
      /[&<>"']/g,
      (character) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[character] ?? character,
    );
  }

  getTestDeliveries(): readonly TestInvitationDelivery[] {
    return this.testDeliveries;
  }

  clearTestDeliveries(): void {
    this.testDeliveries.length = 0;
  }
}
