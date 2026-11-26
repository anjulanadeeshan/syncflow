import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InvitationMailerService } from './invitation-mailer.service.js';

function createBrevoMailer() {
  return new InvitationMailerService(
    new ConfigService({
      NODE_ENV: 'development',
      MAIL_PROVIDER: 'brevo',
      MAIL_FROM: 'SyncFlow <verified@example.com>',
      MAIL_FROM_EMAIL: 'verified@example.com',
      MAIL_FROM_NAME: 'SyncFlow',
      BREVO_API_KEY: 'test-brevo-key',
      WEB_URL: 'https://syncflow.example.com/',
    }),
  );
}

describe('InvitationMailerService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('creates a web invitation URL with the token in the fragment', () => {
    const mailer = createBrevoMailer();
    expect(mailer.createInvitationUrl('token/value')).toBe(
      'https://syncflow.example.com/invitations/accept#token=token%2Fvalue',
    );
  });

  it('sends an escaped invitation through the Brevo transactional API', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ messageId: 'message-id' }), { status: 201 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const mailer = createBrevoMailer();

    await mailer.sendInvitation({
      email: 'member@example.com',
      organizationName: '<Sync & Flow>',
      inviterName: 'Owner',
      role: 'MEMBER',
      invitationUrl: 'https://syncflow.example.com/invitations/accept#token=secret',
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(request?.method).toBe('POST');
    expect(new Headers(request?.headers).get('api-key')).toBe('test-brevo-key');
    if (typeof request?.body !== 'string') {
      throw new Error('Expected a JSON request body.');
    }
    const body = JSON.parse(request.body) as {
      sender: { email: string; name: string };
      to: Array<{ email: string }>;
      htmlContent: string;
    };
    expect(body.sender).toEqual({ email: 'verified@example.com', name: 'SyncFlow' });
    expect(body.to).toEqual([{ email: 'member@example.com' }]);
    expect(body.htmlContent).toContain('&lt;Sync &amp; Flow&gt;');
    expect(body.htmlContent).not.toContain('<Sync & Flow>');
  });
});
