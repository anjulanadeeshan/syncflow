import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request, { type Response } from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';

describe('Authentication (e2e)', () => {
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
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects state changes without a matching CSRF token', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'person@example.com',
        name: 'Test Person',
        password: 'SecurePassword123',
      });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('CSRF_TOKEN_INVALID');
  });

  it('registers, authenticates, rotates the session, and logs out', async () => {
    const agent = request.agent(app.getHttpServer());
    const csrf = await agent.get('/api/auth/csrf').expect(200);
    const csrfToken = csrf.body.csrfToken as string;

    const registration = await agent
      .post('/api/auth/register')
      .set('X-CSRF-Token', csrfToken)
      .send({
        email: 'Person@Example.com',
        name: 'Test Person',
        password: 'SecurePassword123',
      })
      .expect(201);

    expect(registration.body.user).toMatchObject({
      email: 'person@example.com',
      name: 'Test Person',
    });
    expect(registration.body.user).not.toHaveProperty('passwordHash');
    expect(registration.headers['set-cookie'].join(';')).toContain(
      'syncflow_access=',
    );
    expect(registration.headers['set-cookie'].join(';')).toContain('HttpOnly');

    const storedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'person@example.com' },
    });
    expect(storedUser.passwordHash).toMatch(/^\$argon2id\$/);

    const me = await agent.get('/api/auth/me').expect(200);
    expect(me.body.user.email).toBe('person@example.com');
    expect(me.body.user).not.toHaveProperty('passwordHash');

    const refresh = await agent
      .post('/api/auth/refresh')
      .set('X-CSRF-Token', csrfToken)
      .expect(200);
    expect(refresh.body.user.email).toBe('person@example.com');

    await agent
      .post('/api/auth/logout')
      .set('X-CSRF-Token', csrfToken)
      .expect(204);
    await agent.get('/api/auth/me').expect(401);
    expect(
      await prisma.session.count({ where: { revokedAt: { not: null } } }),
    ).toBe(1);

    const nextCsrf = await agent.get('/api/auth/csrf').expect(200);
    const login = await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', nextCsrf.body.csrfToken as string)
      .send({ email: 'person@example.com', password: 'SecurePassword123' })
      .expect(200);
    expect(login.body.user.email).toBe('person@example.com');
    expect(login.body.user).not.toHaveProperty('passwordHash');
    await agent.get('/api/auth/me').expect(200);
  });

  it('validates input and returns generic login failures', async () => {
    const agent = request.agent(app.getHttpServer());
    const csrf = await agent.get('/api/auth/csrf').expect(200);
    const token = csrf.body.csrfToken as string;

    const invalid = await agent
      .post('/api/auth/register')
      .set('X-CSRF-Token', token)
      .send({ email: 'invalid', name: '', password: 'weak' })
      .expect(400);
    expect(invalid.body.code).toBe('VALIDATION_FAILED');
    expect(invalid.body.details.length).toBeGreaterThan(0);

    const login = await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', token)
      .send({ email: 'missing@example.com', password: 'SecurePassword123' })
      .expect(401);
    expect(login.body).toMatchObject({
      code: 'AUTH_INVALID_CREDENTIALS',
      message: 'Invalid email or password.',
    });
  });

  it('rate limits repeated login attempts', async () => {
    const agent = request.agent(app.getHttpServer());
    const csrf = await agent.get('/api/auth/csrf').expect(200);
    const token = csrf.body.csrfToken as string;

    let limitedResponse: Response | undefined;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const response = await agent
        .post('/api/auth/login')
        .set('X-CSRF-Token', token)
        .send({ email: 'rate@example.com', password: 'SecurePassword123' });
      if (response.status === 429) {
        limitedResponse = response;
        break;
      }
      expect(response.status).toBe(401);
    }
    expect(limitedResponse?.body.statusCode).toBe(429);
  });
});
