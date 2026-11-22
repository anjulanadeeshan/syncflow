import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';

describe('Health endpoint (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app, app.get(ConfigService));
    await app.init();
  });

  it('GET /api/health', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);

    expect(response.body).toEqual({
      service: 'syncflow-api',
      status: 'ok',
      timestamp: expect.any(String),
    });
  });

  it('allows the configured local frontend origin', async () => {
    await request(app.getHttpServer())
      .get('/api/health')
      .set('Origin', 'http://localhost:3000')
      .expect('access-control-allow-origin', 'http://localhost:3000')
      .expect(200);
  });

  afterEach(async () => {
    await app.close();
  });
});
