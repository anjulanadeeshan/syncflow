import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';

describe('Projects (e2e)', () => {
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
    owner: Awaited<ReturnType<typeof register>>,
    name: string,
    slug: string,
  ) {
    const response = await owner.agent
      .post('/api/organizations')
      .set('X-CSRF-Token', owner.csrfToken)
      .send({ name, slug })
      .expect(201);
    return response.body as { id: string };
  }

  function projectPath(organizationId: string, projectId = '') {
    return `/api/organizations/${organizationId}/projects${projectId ? `/${projectId}` : ''}`;
  }

  it('creates a project, manager membership, and default workflow atomically', async () => {
    const owner = await register('project-owner@example.com', 'Project Owner');
    const organization = await createOrganization(
      owner,
      'Project Team',
      'project-team',
    );

    const created = await owner.agent
      .post(projectPath(organization.id))
      .set('X-CSRF-Token', owner.csrfToken)
      .send({
        name: 'Platform Work',
        key: 'plat',
        description: 'Core platform delivery',
      })
      .expect(201);

    expect(created.body.project).toMatchObject({
      organizationId: organization.id,
      name: 'Platform Work',
      key: 'PLAT',
      role: 'PROJECT_MANAGER',
      memberCount: 1,
      taskCount: 0,
    });
    expect(created.body.project.workflowColumns).toEqual([
      expect.objectContaining({ name: 'To do', rank: 1000 }),
      expect.objectContaining({ name: 'In progress', rank: 2000 }),
      expect.objectContaining({ name: 'Done', rank: 3000 }),
    ]);

    const listed = await owner.agent
      .get(projectPath(organization.id))
      .expect(200);
    expect(listed.body).toMatchObject({ total: 1, page: 1, limit: 25 });
    expect(listed.body.projects[0]).toMatchObject({
      id: created.body.project.id,
      role: 'PROJECT_MANAGER',
    });
  });

  it('shows projects only to explicit project members', async () => {
    const owner = await register('visible-owner@example.com', 'Visible Owner');
    const organizationMember = await register(
      'organization-only@example.com',
      'Organization Only',
    );
    const outsider = await register('project-outsider@example.com', 'Outsider');
    const organization = await createOrganization(
      owner,
      'Private Projects',
      'private-projects',
    );
    await prisma.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId: organizationMember.user.id,
        role: 'MEMBER',
      },
    });
    const created = await owner.agent
      .post(projectPath(organization.id))
      .set('X-CSRF-Token', owner.csrfToken)
      .send({ name: 'Secret Project', key: 'SEC' })
      .expect(201);
    const projectId = created.body.project.id as string;

    const memberList = await organizationMember.agent
      .get(projectPath(organization.id))
      .expect(200);
    expect(memberList.body.projects).toHaveLength(0);
    await organizationMember.agent
      .get(projectPath(organization.id, projectId))
      .expect(404);
    await outsider.agent.get(projectPath(organization.id)).expect(404);
  });

  it('manages project membership and protects the last manager', async () => {
    const owner = await register('manager-owner@example.com', 'Manager Owner');
    const member = await register('project-member@example.com', 'Project Member');
    const outsider = await register('member-outsider@example.com', 'Outsider');
    const organization = await createOrganization(
      owner,
      'Membership Projects',
      'membership-projects',
    );
    await prisma.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId: member.user.id,
        role: 'MEMBER',
      },
    });
    const created = await owner.agent
      .post(projectPath(organization.id))
      .set('X-CSRF-Token', owner.csrfToken)
      .send({ name: 'Membership Project', key: 'MEM' })
      .expect(201);
    const projectId = created.body.project.id as string;
    const path = projectPath(organization.id, projectId);

    await owner.agent
      .post(`${path}/members`)
      .set('X-CSRF-Token', owner.csrfToken)
      .send({ userId: outsider.user.id, role: 'MEMBER' })
      .expect(400);
    await owner.agent
      .post(`${path}/members`)
      .set('X-CSRF-Token', owner.csrfToken)
      .send({ userId: member.user.id, role: 'MEMBER' })
      .expect(201);
    await member.agent.get(path).expect(200);
    await member.agent
      .patch(path)
      .set('X-CSRF-Token', member.csrfToken)
      .send({ name: 'Unauthorized rename' })
      .expect(403);

    const lastManager = await owner.agent
      .patch(`${path}/members/${owner.user.id}`)
      .set('X-CSRF-Token', owner.csrfToken)
      .send({ role: 'MEMBER' })
      .expect(409);
    expect(lastManager.body.code).toBe('PROJECT_LAST_MANAGER');

    await owner.agent
      .patch(`${path}/members/${member.user.id}`)
      .set('X-CSRF-Token', owner.csrfToken)
      .send({ role: 'PROJECT_MANAGER' })
      .expect(200);
    await owner.agent
      .patch(`${path}/members/${owner.user.id}`)
      .set('X-CSRF-Token', owner.csrfToken)
      .send({ role: 'MEMBER' })
      .expect(200);
    await member.agent
      .delete(`${path}/members/${member.user.id}`)
      .set('X-CSRF-Token', member.csrfToken)
      .expect(409);
  });

  it('updates and archives a project while preserving read-only history', async () => {
    const owner = await register('archive-owner@example.com', 'Archive Owner');
    const organization = await createOrganization(
      owner,
      'Archive Projects',
      'archive-projects',
    );
    const created = await owner.agent
      .post(projectPath(organization.id))
      .set('X-CSRF-Token', owner.csrfToken)
      .send({ name: 'Original Project', key: 'OLD' })
      .expect(201);
    const projectId = created.body.project.id as string;
    const path = projectPath(organization.id, projectId);

    const updated = await owner.agent
      .patch(path)
      .set('X-CSRF-Token', owner.csrfToken)
      .send({ name: 'Renamed Project', key: 'NEW' })
      .expect(200);
    expect(updated.body.project).toMatchObject({
      name: 'Renamed Project',
      key: 'NEW',
    });

    await owner.agent
      .delete(path)
      .set('X-CSRF-Token', owner.csrfToken)
      .expect(204);
    const listed = await owner.agent
      .get(projectPath(organization.id))
      .expect(200);
    expect(listed.body.projects).toHaveLength(0);
    const details = await owner.agent.get(path).expect(200);
    expect(details.body.project.archivedAt).toBeTruthy();
    const taskMutation = await owner.agent
      .post(`${path}/tasks`)
      .set('X-CSRF-Token', owner.csrfToken)
      .send({ title: 'Cannot create in archived project' })
      .expect(409);
    expect(taskMutation.body.code).toBe('PROJECT_ARCHIVED');
  });
});
