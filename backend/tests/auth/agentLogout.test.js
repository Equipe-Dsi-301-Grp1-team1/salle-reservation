const request = require('supertest');
const app = require('../../src/app');
const agentAuthService = require('../../src/services/agentAuthService');
jest.mock('../../src/services/agentAuthService', () => ({
  loginAgent: jest.fn(),
}));
describe('Déconnexion Agent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    agentAuthService.loginAgent.mockResolvedValue({
      agent: {
        _id: 'agent123',
        name: 'Agent Test',
        email: 'agent@test.com',
      },
      token: 'fake-agent-token',
    });
  });
  test('déconnecte un agent avec succès', async () => {
    const agent = request.agent(app);
    await agent
      .post('/api/agent/login')
      .send({
        email: 'agent@test.com',
        password: 'password123',
      });
    const res = await agent.post('/api/agent/logout');
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Déconnexion réussie');
  });
  test('refuse l’accès au tableau de bord après la déconnexion', async () => {
    const agent = request.agent(app);
    await agent
      .post('/api/agent/login')
      .send({
        email: 'agent@test.com',
        password: 'password123',
      });
    await agent.post('/api/agent/logout');
    const dashboard = await agent.get('/agent/dashboard');
    expect(dashboard.statusCode).toBe(401);
  });
});
