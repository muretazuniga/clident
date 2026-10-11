import { Injectable, signal } from '@angular/core';
import type { Entity, Usuario } from '../../../shared/models';
export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
@Injectable({ providedIn: 'root' })
export class ApiService {
  readonly expired = signal(false);
  async request<T>(path: string, method = 'GET', data?: unknown, version?: string): Promise<T> {
    let response: Response;
    try { response = await fetch(`/api/${path}`, { method, credentials: 'same-origin', cache: 'no-store', headers: { ...(data !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(version ? { 'If-Unmodified-Since': version } : {}) }, ...(data !== undefined ? { body: JSON.stringify(data) } : {}) }); }
    catch { throw new ApiError(0, 'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo nuevamente.'); }
    let result;
    try { result = await response.json(); }
    catch {
      if (response.ok) throw new ApiError(502, 'El servidor devolvió una respuesta no válida. Inténtalo nuevamente.');
      result = {};
    }
    if (!response.ok) {
      if (response.status === 401 && !path.startsWith('auth/sign-in')) this.expired.set(true);
      const validation = Array.isArray(result.fields) ? result.fields.map((f: { message: string }) => f.message).join(' ') : '';
      throw new ApiError(response.status, response.status === 429 ? 'Demasiados intentos. Espera unos minutos antes de continuar.' : validation || result.error || 'No se pudo completar la solicitud.');
    }
    return result as T;
  }
  list<T>(entity: Entity) { return this.request<T[]>(entity); }
  create<T>(entity: Entity, data: unknown) { return this.request<T>(entity, 'POST', data); }
  update<T>(entity: Entity, id: number, data: unknown, version: string) { return this.request<T>(`${entity}/${id}`, 'PATCH', data, version); }
  delete(entity: Entity, id: number, version: string) { return this.request(`${entity}/${id}`, 'DELETE', undefined, version); }
}
@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user = signal<Usuario | null>(null);
  constructor(private api: ApiService) {}
  async refresh() { try { const u = await this.api.request<Usuario>('me'); this.user.set(u); this.api.expired.set(false); return u; } catch (e) { this.user.set(null); throw e; } }
  async login(email: string, password: string) { await this.api.request('auth/sign-in/email', 'POST', { email, password, rememberMe: false }); await this.refresh(); }
  async logout() { await this.api.request('auth/sign-out', 'POST', {}); this.user.set(null); this.api.expired.set(false); }
}
