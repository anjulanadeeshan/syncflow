import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';
import { InvitationMailerService } from '../src/modules/organizations/invitation-mailer.service.js';

describe('Organizations and invitations (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mailer: InvitationMailerService;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app, app.get(ConfigService));
    await app.init();
    prisma = app.get(PrismaService);
    mailer = app.get(InvitationMailerService);
  });

  beforeEach(async () => {
    mailer.clearTestDeliveries();
    await prisma.invitation.deleteMany();
    await prisma.organizationMember.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  async function register(email: string, name: string) {
    const agent = request.agent(app.getHttpServer());
    const csrf = await agent.get('/api/auth/csrf').expect(200);
    const csrfToken = csrf.body.csrfToken as string;
    const response = await agent
      .post('/api/auth/register')
      .set('X-CSRF-Token', csrfToken)
      .send({ email, name, password: 'SecurePassword123' })
      .expect(201);
    return {
      agent,
      csrfToken,
      user: response.body.user as { id: string; email: string },
    };
  }

  function tokenFromLastEmail(): string {
    const delivery = mailer.getTestDeliveries().at(-1);
    if (!delivery) throw new Error('Expected an invitation email.');
    const hash = new URL(delivery.invitationUrl).hash;
    return decodeURIComponent(hash.replace(/^#token=/, ''));
  }

  it('creates an organization and owner membership atomically', async () => {
    const owner = await register('owner@example.com', 'Owner');
    const created = await owner.agent
      .post('/api/organizations')
      .set('X-CSRF-Token', owner.csrfToken)
      .send({ name: 'Acme Team', slug: 'acme-team' })
      .expect(201);

    expect(created.body).toMatchObject({
      name: 'Acme Team',
      slug: 'acme-team',
      role: 'OWNER',
      memberCount: 1,
    });
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: created.body.id,
          userId: owner.user.id,
        },
      },
    });
    expect(membership?.role).toBe('OWNER');
  });

  it('joins a second organization by accepting a matching invitation', async () => {
    const owner = await register('owner@example.com', 'Owner');
    const member = await register('member@example.com', 'Member');
    const first = await owner.agent
      .post('/api/organizations')
      .set('X-CSRF-Token', owner.csrfToken)
      .send({ name: 'First Organization', slug: 'first-organization' })
      .expect(201);
    await member.agent
      .post('/api/organizations')
      .set('X-CSRF-Token', member.csrfToken)
      .send({ name: 'Second Organization', slug: 'second-organization' })
      .expect(201);

    await owner.agent
      .post(`/api/organizations/${first.body.id}/invitations`)
      .set('X-CSRF-Token', owner.csrfToken)
      .send({ email: member.user.email, role: 'MEMBER' })
      .expect(201);
    const token = tokenFromLastEmail();
    await member.agent.get(`/api/invitations/${token}`).expect(200);
    await member.agent
      .post(`/api/invitations/${token}/accept`)
      .set('X-CSRF-Token', member.csrfToken)
      .expect(201);

    const organizations = await member.agent
      .get('/api/organizations')
      .expect(200);
    expect(organizations.body.organizations).toHaveLength(2);
    expect(
      organizations.body.organizations.map((item: { id: string }) => item.id),
    ).toContain(first.body.id);
    await member.agent
      .post(`/api/invitations/${token}/accept`)
      .set('X-CSRF-Token', member.csrfToken)
      .expect(409);
    await owner.agent
      .post(`/api/organizations/${first.body.id}/invitations`)
      .set('X-CSRF-Token', owner.csrfToken)
      .send({ email: member.user.email, role: 'MEMBER' })
      .expect(409);
  });

  it('rejects duplicate active invitations and handles expiry, cancellation, and rejection', async () => {
    const owner = await register('owner@example.com', 'Owner');
    const invited = await register('invited@example.com', 'Invited');
    const other = await register('other@example.com', 'Other');
    const third = await register('third@example.com', 'Third');
    const organization = await owner.agent
      .post('/api/organizations')
      .set('X-CSRF-Token', owner.csrfToken)
      .send({ name: 'Invitation Tests', slug: 'invitation-tests' })
      .expect(201);

    const expiredInvite = await owner.agent
      .post(`/api/organizations/${organization.body.id}/invitations`)
      .set('X-CSRF-Token', owner.csrfToken)
      .send({ email: invited.user.email, role: 'MEMBER' })
      .expect(201);
    const expiredToken = tokenFromLastEmail();
    await owner.agent
      .post(`/api/organizations/${organization.body.id}/invitations`)
      .set('X-CSRF-Token', owner.csrfToken)
      .send({ email: invited.user.email, role: 'MEMBER' })
      .expect(409);
    await prisma.invitation.update({
      where: { id: expiredInvite.body.invitation.id },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });
    await invited.agent
      .post(`/api/invitations/${expiredToken}/accept`)
      .set('X-CSRF-Token', invited.csrfToken)
      .expect(410);

    const cancellable = await owner.agent
      .post(`/api/organizations/${organization.body.id}/invitations`)
      .set('X-CSRF-Token', owner.csrfToken)
      .send({ email: other.user.email, role: 'MEMBER' })
      .expect(201);
    const cancelledToken = tokenFromLastEmail();
    await owner.agent
      .delete(
        `/api/organizations/${organization.body.id}/invitations/${cancellable.body.invitation.id}`,
      )
      .set('X-CSRF-Token', owner.csrfToken)
      .expect(204);
    await other.agent
      .post(`/api/invitations/${cancelledToken}/accept`)
      .set('X-CSRF-Token', other.csrfToken)
      .expect(409);

    await owner.agent
      .post(`/api/organizations/${organization.body.id}/invitations`)
      .set('X-CSRF-Token', owner.csrfToken)
      .send({ email: third.user.email, role: 'MEMBER' })
      .expect(201);
    const rejectedToken = tokenFromLastEmail();
    await third.agent
      .post(`/api/invitations/${rejectedToken}/reject`)
      .set('X-CSRF-Token', third.csrfToken)
      .expect(204);
    await third.agent
      .post(`/api/invitations/${rejectedToken}/accept`)
      .set('X-CSRF-Token', third.csrfToken)
      .expect(409);
  });

  it('does not disclose organizations to non-members', async () => {
    const owner = await register('owner@example.com', 'Owner');
    const outsider = await register('outsider@example.com', 'Outsider');
    const organization = await owner.agent
      .post('/api/organizations')
      .set('X-CSRF-Token', owner.csrfToken)
      .send({ name: 'Private Team', slug: 'private-team' })
      .expect(201);

    const details = await outsider.agent
      .get(`/api/organizations/${organization.body.id}`)
      .expect(404);
    expect(details.body.code).toBe('ORGANIZATION_NOT_FOUND');
    await outsider.agent
      .get(`/api/organizations/${organization.body.id}/members`)
      .expect(404);
  });

  it('protects the last owner and supports authorized member removal', async () => {
    const owner = await register('owner@example.com', 'Owner');
    const member = await register('member@example.com', 'Member');
    const organization = await owner.agent
      .post('/api/organizations')
      .set('X-CSRF-Token', owner.csrfToken)
      .send({ name: 'Owner Safety', slug: 'owner-safety' })
      .expect(201);

    await owner.agent
      .delete(
        `/api/organizations/${organization.body.id}/members/${owner.user.id}`,
      )
      .set('X-CSRF-Token', owner.csrfToken)
      .expect(409);
    await owner.agent
      .patch(
        `/api/organizations/${organization.body.id}/members/${owner.user.id}`,
      )
      .set('X-CSRF-Token', owner.csrfToken)
      .send({ role: 'MEMBER' })
      .expect(409);

    await owner.agent
      .post(`/api/organizations/${organization.body.id}/invitations`)
      .set('X-CSRF-Token', owner.csrfToken)
      .send({ email: member.user.email, role: 'MEMBER' })
      .expect(201);
    const token = tokenFromLastEmail();
    await member.agent
      .post(`/api/invitations/${token}/accept`)
      .set('X-CSRF-Token', member.csrfToken)
      .expect(201);
    await owner.agent
      .delete(
        `/api/organizations/${organization.body.id}/members/${member.user.id}`,
      )
      .set('X-CSRF-Token', owner.csrfToken)
      .expect(204);
    await member.agent
      .get(`/api/organizations/${organization.body.id}`)
      .expect(404);
  });
});
