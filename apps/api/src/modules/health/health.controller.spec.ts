import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  it('reports that the API process is healthy', () => {
    const response = new HealthController().check();

    expect(response).toEqual({
      service: 'syncflow-api',
      status: 'ok',
      timestamp: expect.any(String),
    });
    expect(Number.isNaN(Date.parse(response.timestamp))).toBe(false);
  });
});
