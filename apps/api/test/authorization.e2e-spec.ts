import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';

describe('Role-based authorization and tenant isolation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app, app.get(ConfigService));
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
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

  async function createOrganization(
    actor: Awaited<ReturnType<typeof register>>,
    name: string,
    slug: string,
  ) {
    const response = await actor.agent
      .post('/api/organizations')
      .set('X-CSRF-Token', actor.csrfToken)
      .send({ name, slug })
      .expect(201);
    return response.body as { id: string };
  }

  it('enforces owner, admin, and member permissions on direct API calls', async () => {
    const owner = await register('owner-authz@example.com', 'Owner');
    const admin = await register('admin-authz@example.com', 'Admin');
    const member = await register('member-authz@example.com', 'Member');
    const organization = await createOrganization(
      owner,
      'Authorization Team',
      'authorization-team',
    );
    await prisma.organizationMember.createMany({
      data: [
        { organizationId: organization.id, userId: admin.user.id, role: 'ADMIN' },
        { organizationId: organization.id, userId: member.user.id, role: 'MEMBER' },
      ],
    });

    await owner.agent
      .patch(`/api/organizations/${organization.id}`)
      .set('X-CSRF-Token', owner.csrfToken)
      .send({ name: 'Owner Updated Team' })
      .expect(200);
    await admin.agent
      .patch(`/api/organizations/${organization.id}`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ name: 'Admin Escalation' })
      .expect(403);
    await member.agent
      .post(`/api/organizations/${organization.id}/invitations`)
      .set('X-CSRF-Token', member.csrfToken)
      .send({ email: 'new-member@example.com', role: 'MEMBER' })
      .expect(403);
    await admin.agent
      .patch(
        `/api/organizations/${organization.id}/members/${member.user.id}`,
      )
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ role: 'ADMIN' })
      .expect(403);
    await admin.agent
      .post(`/api/organizations/${organization.id}/invitations`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ email: 'another-admin@example.com', role: 'ADMIN' })
      .expect(403);

    const persisted = await prisma.organization.findUniqueOrThrow({
      where: { id: organization.id },
    });
    expect(persisted.name).toBe('Owner Updated Team');
  });

  it('returns 401 or a non-disclosing 404 for unauthenticated and cross-tenant access', async () => {
    const owner = await register('tenant-owner@example.com', 'Tenant Owner');
    const outsider = await register('tenant-outsider@example.com', 'Outsider');
    const organization = await createOrganization(
      owner,
      'Private Authorization Team',
      'private-authorization-team',
    );

    await request(app.getHttpServer())
      .get(`/api/organizations/${organization.id}`)
      .expect(401);
    const crossTenantRead = await outsider.agent
      .get(`/api/organizations/${organization.id}`)
      .expect(404);
    expect(crossTenantRead.body.code).toBe('ORGANIZATION_NOT_FOUND');
    const crossTenantWrite = await outsider.agent
      .patch(`/api/organizations/${organization.id}`)
      .set('X-CSRF-Token', outsider.csrfToken)
      .send({ name: 'Leaked Tenant' })
      .expect(404);
    expect(crossTenantWrite.body.code).toBe('ORGANIZATION_NOT_FOUND');
  });

  it('revokes access immediately and keeps roles scoped per organization', async () => {
    const firstOwner = await register('first-owner@example.com', 'First Owner');
    const secondOwner = await register('second-owner@example.com', 'Second Owner');
    const multiOrgUser = await register('multi-org@example.com', 'Multi Organization');
    const firstOrganization = await createOrganization(
      firstOwner,
      'First Scoped Team',
      'first-scoped-team',
    );
    const secondOrganization = await createOrganization(
      secondOwner,
      'Second Scoped Team',
      'second-scoped-team',
    );
    await prisma.organizationMember.createMany({
      data: [
        {
          organizationId: firstOrganization.id,
          userId: multiOrgUser.user.id,
          role: 'ADMIN',
        },
        {
          organizationId: secondOrganization.id,
          userId: multiOrgUser.user.id,
          role: 'MEMBER',
        },
      ],
    });

    const organizations = await multiOrgUser.agent
      .get('/api/organizations')
      .expect(200);
    expect(organizations.body.organizations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: firstOrganization.id, role: 'ADMIN' }),
        expect.objectContaining({ id: secondOrganization.id, role: 'MEMBER' }),
      ]),
    );
    await multiOrgUser.agent
      .get(`/api/organizations/${firstOrganization.id}/invitations`)
      .expect(200);
    await multiOrgUser.agent
      .get(`/api/organizations/${secondOrganization.id}/invitations`)
      .expect(403);

    await firstOwner.agent
      .delete(
        `/api/organizations/${firstOrganization.id}/members/${multiOrgUser.user.id}`,
      )
      .set('X-CSRF-Token', firstOwner.csrfToken)
      .expect(204);
    await multiOrgUser.agent
      .get(`/api/organizations/${firstOrganization.id}`)
      .expect(404);
    await multiOrgUser.agent
      .get(`/api/organizations/${secondOrganization.id}`)
      .expect(200);
  });
});
