import { TestBed } from '@angular/core/testing';
import { ApiService, AuthService } from './api.service';
describe('ApiService', () => {
  let api: ApiService;
  beforeEach(() => { api = TestBed.inject(ApiService); });
  it('envía cookies y versión, sin caché persistente', async () => {
    const fetch = spyOn(window, 'fetch').and.resolveTo(new Response('{}', { status: 200 }));
    await api.update('pacientes', 1, { name: 'Prueba' }, '2026-10-11T10:00:00.000Z');
    const [, options] = fetch.calls.mostRecent().args;
    expect(options?.credentials).toBe('same-origin'); expect(options?.cache).toBe('no-store');
    expect((options?.headers as Record<string, string>)['If-Unmodified-Since']).toBe('2026-10-11T10:00:00.000Z');
  });
  it('detecta sesión expirada y no oculta el error HTTP', async () => {
    spyOn(window, 'fetch').and.resolveTo(new Response('{"error":"Sesión expirada"}', { status: 401 }));
    await expectAsync(api.request('pacientes')).toBeRejectedWithError('Sesión expirada'); expect(api.expired()).toBeTrue();
  });
  it('informa errores de red', async () => {
    spyOn(window, 'fetch').and.rejectWith(new TypeError('Network'));
    await expectAsync(api.list('pacientes')).toBeRejectedWithError(/No se pudo conectar/);
  });
  it('rechaza HTML devuelto como éxito por un fallback incorrecto', async () => {
    spyOn(window, 'fetch').and.resolveTo(new Response('<html>SPA</html>', { status: 200 }));
    await expectAsync(api.create('pacientes', {})).toBeRejectedWithError(/respuesta no válida/);
  });
  it('mantiene mensajes de validación visibles', async () => {
    spyOn(window, 'fetch').and.resolveTo(new Response('{"fields":[{"message":"RUT no válido"}]}', { status: 400 }));
    await expectAsync(api.create('pacientes', {})).toBeRejectedWithError('RUT no válido');
  });
});
describe('AuthService', () => {
  it('limpia la identidad si el servidor rechaza la sesión', async () => {
    const auth = TestBed.inject(AuthService), api = TestBed.inject(ApiService);
    auth.user.set({ id: 'test', name: 'Prueba', email: 'test@example.test', role: 'PROFESIONAL', active: true, image: null, emailVerified: false });
    spyOn(api, 'request').and.rejectWith(new Error('Sesión expirada'));
    await expectAsync(auth.refresh()).toBeRejected(); expect(auth.user()).toBeNull();
  });
});
