
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from './auth';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()]
    });

    service = TestBed.inject(AuthService);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should remove the token when logging out', () => {
    localStorage.setItem('token', 'fake-jwt-token');

    service.logout();

    expect(localStorage.getItem('token')).toBeNull();
  });

  it('should remove the user when logging out', () => {
    localStorage.setItem('user', JSON.stringify({
      id: '123',
      nom: 'Koussay',
      email: 'client@test.com'
    }));

    service.logout();

    expect(localStorage.getItem('user')).toBeNull();
  });

  it('should return false after logging out', () => {
    localStorage.setItem('token', 'fake-jwt-token');
    localStorage.setItem('user', JSON.stringify({
      id: '123',
      nom: 'Koussay',
      email: 'client@test.com'
    }));

    service.logout();

    expect(service.isLoggedIn()).toBe(false);
  });
});
