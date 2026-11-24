import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';

describe('Tasks and subtasks (e2e)', () => {
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

  async function createProject(
    organizationId: string,
    creatorId: string,
    key: string,
    extraMembers: Array<{ userId: string; role?: 'PROJECT_MANAGER' | 'MEMBER' }> = [],
  ) {
    return prisma.$transaction(async (transaction) => {
      const project = await transaction.project.create({
        data: {
          organizationId,
          name: `${key} Project`,
          key,
          createdById: creatorId,
        },
      });
      await transaction.projectMember.createMany({
        data: [
          {
            projectId: project.id,
            organizationId,
            userId: creatorId,
            role: 'PROJECT_MANAGER',
          },
          ...extraMembers.map((member) => ({
            projectId: project.id,
            organizationId,
            userId: member.userId,
            role: member.role ?? ('MEMBER' as const),
          })),
        ],
      });
      return project;
    });
  }

  function basePath(organizationId: string, projectId: string) {
    return `/api/organizations/${organizationId}/projects/${projectId}`;
  }

  it('supports task CRUD and valid multi-assignee updates', async () => {
    const owner = await register('task-owner@example.com', 'Task Owner');
    const member = await register('task-member@example.com', 'Task Member');
    const organization = await createOrganization(
      owner,
      'Task CRUD Team',
      'task-crud-team',
    );
    await prisma.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId: member.user.id,
        role: 'MEMBER',
      },
    });
    const project = await createProject(
      organization.id,
      owner.user.id,
      'CRUD',
      [{ userId: member.user.id }],
    );
    const path = basePath(organization.id, project.id);

    const created = await owner.agent
      .post(`${path}/tasks`)
      .set('X-CSRF-Token', owner.csrfToken)
      .send({
        title: 'Implement task API',
        description: 'Initial task description',
        priority: 'HIGH',
        dueDate: '2027-01-10T10:00:00.000Z',
        assigneeIds: [member.user.id],
      })
      .expect(201);
    expect(created.body.task).toMatchObject({
      number: 1,
      title: 'Implement task API',
      priority: 'HIGH',
      status: 'TODO',
      version: 1,
    });
    expect(created.body.task.assignees).toEqual([
      expect.objectContaining({ id: member.user.id }),
    ]);

    await member.agent
      .get(`${path}/tasks/${created.body.task.id}`)
      .expect(200);
    const updated = await member.agent
      .patch(`${path}/tasks/${created.body.task.id}`)
      .set('X-CSRF-Token', member.csrfToken)
      .send({
        version: 1,
        title: 'Implement and verify task API',
        status: 'IN_PROGRESS',
        assigneeIds: [owner.user.id, member.user.id],
      })
      .expect(200);
    expect(updated.body.task).toMatchObject({
      title: 'Implement and verify task API',
      status: 'IN_PROGRESS',
      version: 2,
    });
    expect(updated.body.task.assignees).toHaveLength(2);

    await owner.agent
      .delete(`${path}/tasks/${created.body.task.id}?version=2`)
      .set('X-CSRF-Token', owner.csrfToken)
      .expect(204);
    const listed = await owner.agent.get(`${path}/tasks`).expect(200);
    expect(listed.body.tasks).toHaveLength(0);
    await owner.agent
      .get(`${path}/tasks/${created.body.task.id}`)
      .expect(404);
  });

  it('rejects assignees who are not current project members', async () => {
    const owner = await register('assign-owner@example.com', 'Assign Owner');
    const organizationMember = await register(
      'org-only@example.com',
      'Organization Only',
    );
    const outsider = await register('task-outsider@example.com', 'Outsider');
    const organization = await createOrganization(
      owner,
      'Assignment Team',
      'assignment-team',
    );
    await prisma.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId: organizationMember.user.id,
        role: 'MEMBER',
      },
    });
    const project = await createProject(
      organization.id,
      owner.user.id,
      'ASGN',
    );
    const path = basePath(organization.id, project.id);

    for (const invalidUserId of [
      organizationMember.user.id,
      outsider.user.id,
    ]) {
      const response = await owner.agent
        .post(`${path}/tasks`)
        .set('X-CSRF-Token', owner.csrfToken)
        .send({ title: 'Invalid assignment', assigneeIds: [invalidUserId] })
        .expect(400);
      expect(response.body.code).toBe('TASK_ASSIGNEE_NOT_PROJECT_MEMBER');
    }
  });

  it('creates, completes, edits, and deletes subtasks transactionally', async () => {
    const owner = await register('subtask-owner@example.com', 'Subtask Owner');
    const organization = await createOrganization(
      owner,
      'Subtask Team',
      'subtask-team',
    );
    const project = await createProject(
      organization.id,
      owner.user.id,
      'SUB',
    );
    const path = basePath(organization.id, project.id);
    const createdTask = await owner.agent
      .post(`${path}/tasks`)
      .set('X-CSRF-Token', owner.csrfToken)
      .send({ title: 'Parent task' })
      .expect(201);

    const createdSubtask = await owner.agent
      .post(`${path}/tasks/${createdTask.body.task.id}/subtasks`)
      .set('X-CSRF-Token', owner.csrfToken)
      .send({ title: 'First checklist item', taskVersion: 1 })
      .expect(201);
    expect(createdSubtask.body.task).toMatchObject({ version: 2 });
    expect(createdSubtask.body.task.subtasks[0]).toMatchObject({
      title: 'First checklist item',
      isCompleted: false,
      position: 1,
    });

    const subtaskId = createdSubtask.body.task.subtasks[0].id as string;
    const completed = await owner.agent
      .patch(`${path}/tasks/${createdTask.body.task.id}/subtasks/${subtaskId}`)
      .set('X-CSRF-Token', owner.csrfToken)
      .send({
        title: 'Verified checklist item',
        isCompleted: true,
        taskVersion: 2,
      })
      .expect(200);
    expect(completed.body.task.version).toBe(3);
    expect(completed.body.task.subtasks[0]).toMatchObject({
      title: 'Verified checklist item',
      isCompleted: true,
    });

    const deleted = await owner.agent
      .delete(
        `${path}/tasks/${createdTask.body.task.id}/subtasks/${subtaskId}?version=3`,
      )
      .set('X-CSRF-Token', owner.csrfToken)
      .expect(200);
    expect(deleted.body.task.version).toBe(4);
    expect(deleted.body.task.subtasks).toHaveLength(0);
  });

  it('isolates tasks across projects and organizations', async () => {
    const firstOwner = await register('first-task-owner@example.com', 'First');
    const secondOwner = await register('second-task-owner@example.com', 'Second');
    const outsider = await register('no-task-access@example.com', 'No Access');
    const firstOrganization = await createOrganization(
      firstOwner,
      'First Task Tenant',
      'first-task-tenant',
    );
    const secondOrganization = await createOrganization(
      secondOwner,
      'Second Task Tenant',
      'second-task-tenant',
    );
    const firstProject = await createProject(
      firstOrganization.id,
      firstOwner.user.id,
      'ONE',
    );
    const siblingProject = await createProject(
      firstOrganization.id,
      firstOwner.user.id,
      'TWO',
    );
    const otherProject = await createProject(
      secondOrganization.id,
      secondOwner.user.id,
      'OTH',
    );
    const firstPath = basePath(firstOrganization.id, firstProject.id);
    const created = await firstOwner.agent
      .post(`${firstPath}/tasks`)
      .set('X-CSRF-Token', firstOwner.csrfToken)
      .send({ title: 'Tenant private task' })
      .expect(201);

    await outsider.agent.get(`${firstPath}/tasks`).expect(404);
    await firstOwner.agent
      .get(
        `${basePath(firstOrganization.id, siblingProject.id)}/tasks/${created.body.task.id}`,
      )
      .expect(404);
    await secondOwner.agent
      .get(
        `${basePath(secondOrganization.id, otherProject.id)}/tasks/${created.body.task.id}`,
      )
      .expect(404);
    await secondOwner.agent
      .patch(
        `${basePath(secondOrganization.id, otherProject.id)}/tasks/${created.body.task.id}`,
      )
      .set('X-CSRF-Token', secondOwner.csrfToken)
      .send({ version: 1, title: 'Cross-tenant write' })
      .expect(404);
  });

  it('validates input and returns deterministic pagination', async () => {
    const owner = await register('page-owner@example.com', 'Page Owner');
    const organization = await createOrganization(
      owner,
      'Pagination Team',
      'pagination-team',
    );
    const project = await createProject(
      organization.id,
      owner.user.id,
      'PAGE',
    );
    const path = basePath(organization.id, project.id);

    await owner.agent
      .post(`${path}/tasks`)
      .set('X-CSRF-Token', owner.csrfToken)
      .send({ title: '', priority: 'CRITICAL' })
      .expect(400);
    for (const title of ['Task one', 'Task two', 'Task three']) {
      await owner.agent
        .post(`${path}/tasks`)
        .set('X-CSRF-Token', owner.csrfToken)
        .send({ title })
        .expect(201);
    }

    const firstPage = await owner.agent
      .get(`${path}/tasks?page=1&limit=2`)
      .expect(200);
    const secondPage = await owner.agent
      .get(`${path}/tasks?page=2&limit=2`)
      .expect(200);
    expect(firstPage.body).toMatchObject({ total: 3, page: 1, limit: 2 });
    expect(firstPage.body.tasks).toHaveLength(2);
    expect(secondPage.body.tasks).toHaveLength(1);
    expect(
      new Set([
        ...firstPage.body.tasks.map((task: { id: string }) => task.id),
        ...secondPage.body.tasks.map((task: { id: string }) => task.id),
      ]).size,
    ).toBe(3);
  });
});
