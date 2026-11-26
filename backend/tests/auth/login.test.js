const request = require('supertest');

jest.mock('../../src/services/authService', () => ({
    loginUser: jest.fn(),
    registerUser: jest.fn(),
}));

const authService = require('../../src/services/authService');
const app = require('../../src/app');

describe('US-03 - Connexion client', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('retourne 200 avec un token si les identifiants sont corrects', async () => {
        authService.loginUser.mockResolvedValue({
            user: {
                _id: '123',
                name: 'Koussay',
                email: 'client@test.com',
            },
            token: 'fake-jwt-token',
        });

        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'client@test.com',
                password: 'password123',
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe('Connexion réussie');
        expect(res.body.token).toBe('fake-jwt-token');
        expect(res.body.user).toEqual({
            id: '123',
            nom: 'Koussay',
            email: 'client@test.com',
        });
    });

    test('retourne 400 si l email est absent', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                password: 'password123',
            });

        expect(res.statusCode).toBe(400);
        expect(authService.loginUser).not.toHaveBeenCalled();
    });

    test('retourne 400 si le mot de passe est absent', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'client@test.com',
            });

        expect(res.statusCode).toBe(400);
        expect(authService.loginUser).not.toHaveBeenCalled();
    });

    test('retourne 401 si les identifiants sont incorrects', async () => {
        authService.loginUser.mockRejectedValue(
            new Error('Email ou mot de passe incorrect')
        );

        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'client@test.com',
                password: 'wrong-password',
            });

        expect(res.statusCode).toBe(401);
        expect(res.body.message).toBe('Email ou mot de passe incorrect');
    });
});
