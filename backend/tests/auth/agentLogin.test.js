const request = require('supertest');
const app = require('../../src/app');
const agentAuthService = require('../../src/services/agentAuthService');

jest.mock('../../src/services/agentAuthService', () => ({
  loginAgent: jest.fn(),
}));

describe('Authentification Agent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('connects an agent with valid credentials', async () => {
    agentAuthService.loginAgent.mockResolvedValue({
      agent: {
        _id: 'agent123',
        name: 'Agent Test',
        email: 'agent@test.com',
      },
      token: 'fake-agent-token',
    });

    const agent = request.agent(app);

    const res = await agent
      .post('/api/agent/login')
      .send({
        email: 'agent@test.com',
        password: 'password123',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBe('fake-agent-token');
    expect(res.body.user.email).toBe('agent@test.com');

    const dashboard = await agent.get('/agent/dashboard');

    expect(dashboard.statusCode).toBe(200);
    expect(dashboard.text).toContain('Agent Test');
  });

  test('returns 400 when credentials are missing', async () => {
    const res = await request(app)
      .post('/api/agent/login')
      .send({
        email: 'agent@test.com',
      });

    expect(res.statusCode).toBe(400);
    expect(agentAuthService.loginAgent).not.toHaveBeenCalled();
  });

  test('returns 401 when credentials are invalid', async () => {
    agentAuthService.loginAgent.mockRejectedValue(
      new Error('Email ou mot de passe incorrect')
    );

    const res = await request(app)
      .post('/api/agent/login')
      .send({
        email: 'agent@test.com',
        password: 'wrong-password',
      });

    expect(res.statusCode).toBe(401);
  });

  test('refuses access to dashboard without authentication', async () => {
    const res = await request(app).get('/agent/dashboard');

    expect(res.statusCode).toBe(401);
  });

  test('logs out the agent and destroys the session', async () => {
    agentAuthService.loginAgent.mockResolvedValue({
      agent: {
        _id: 'agent123',
        name: 'Agent Test',
        email: 'agent@test.com',
      },
      token: 'fake-agent-token',
    });

    const agent = request.agent(app);

    await agent
      .post('/api/agent/login')
      .send({
        email: 'agent@test.com',
        password: 'password123',
      });

    const logout = await agent.post('/api/agent/logout');

    expect(logout.statusCode).toBe(200);
    expect(logout.body.message).toBe('Déconnexion réussie');

    const dashboard = await agent.get('/agent/dashboard');

    expect(dashboard.statusCode).toBe(401);
  });
});
