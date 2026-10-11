import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, provideRouter, UrlTree } from '@angular/router';
import { AuthService } from '../services/api.service';
import { authGuard, adminGuard } from './auth.guard';
describe('Protección de rutas', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));
  it('envía sesiones rechazadas al login', async () => {
    spyOn(TestBed.inject(AuthService), 'refresh').and.rejectWith(new Error('401'));
    const result = await TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/login');
  });
  it('no permite a profesionales abrir administración', async () => {
    spyOn(TestBed.inject(AuthService), 'refresh').and.resolveTo({ id: 'test', name: 'Prueba', email: 'test@example.test', role: 'PROFESIONAL', active: true, image: null, emailVerified: false });
    const result = await TestBed.runInInjectionContext(() => adminGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/home');
  });
});
