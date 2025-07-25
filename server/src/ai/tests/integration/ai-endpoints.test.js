// Integration test for AI endpoints
import request from 'supertest';
import app from '../../../app';

describe('AI Endpoints', () => {
  it('should return a response for /api/ai/chat', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .send({ query: 'Hello' });
    expect(res.statusCode).toBe(200);
    expect(res.body.response).toBeDefined();
  });
});
