# Brevo invitation email setup

SyncFlow can create invitation links without contacting an email provider. When
email delivery is selected, the API uses either local SMTP/Mailpit or Brevo's
transactional email API. The raw invitation token is returned only to the
authorized inviter and is stored in PostgreSQL only as a hash.

## 1. Prepare Brevo

1. Create or sign in to a Brevo account.
2. Register and verify the sender email or sending domain that SyncFlow will use.
3. Open **Settings → SMTP & API → API keys & MCP**.
4. Generate an API key for SyncFlow and copy it once into a password manager.

Brevo's transactional email endpoint is `POST
https://api.brevo.com/v3/smtp/email`; the API key is sent in the server-side
`api-key` header. See the [official Brevo transactional email guide](https://developers.brevo.com/docs/send-a-transactional-email).

## 2. Configure the API

Edit the untracked `apps/api/.env` file:

```env
MAIL_PROVIDER=brevo
BREVO_API_KEY=xkeysib-your-private-api-key
MAIL_FROM_EMAIL=verified-sender@example.com
MAIL_FROM_NAME=SyncFlow
WEB_URL=http://localhost:3000
```

`MAIL_FROM_EMAIL` must be a sender verified in Brevo. In production, `WEB_URL`
must be the public HTTPS URL of the web application so invitation links do not
point to localhost.

Never put `BREVO_API_KEY` in `apps/web/.env.local`, a `NEXT_PUBLIC_` variable,
source control, screenshots, browser code, or Supabase client configuration.

Restart the API after changing the environment:

```powershell
npm run dev
```

## 3. Test delivery

1. Open an organization's settings page.
2. Select **Invite member**.
3. Choose **Send invitation email**.
4. Create the invitation.
5. Confirm the UI reports **Invitation email sent**.
6. Check the recipient inbox and Brevo's transactional email logs.

If Brevo rejects the request, SyncFlow keeps the invitation active and displays
the copyable link as a fallback. The API logs only the invitation identifier;
it does not log the recipient, API key, or raw token.

## Local Mailpit mode

To switch back to Mailpit, use:

```env
MAIL_PROVIDER=smtp
SMTP_HOST=localhost
SMTP_PORT=1025
MAIL_FROM=SyncFlow <no-reply@syncflow.local>
```

Start Mailpit with `npm run mail:up`, then open `http://localhost:8025`.
Link-only invitations do not contact Mailpit or Brevo.
