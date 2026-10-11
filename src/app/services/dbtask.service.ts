import { Injectable } from '@angular/core';
import { ApiService, AuthService } from './api.service';
@Injectable({ providedIn: 'root' })
export class DBTaskService {
  constructor(private api: ApiService, private auth: AuthService) {}
  async existeSesionActiva() { try { await this.auth.refresh(); return true; } catch { return false; } }
  cerrarSesion() { return this.auth.logout(); }
  async obtenerFotoPerfil() { return (await this.api.request<{ image: string | null }>('me')).image; }
  guardarFotoPerfil(image: string) { return this.api.request('me', 'PATCH', { image }); }
  eliminarFotoPerfil() { return this.api.request('me', 'PATCH', { image: null }); }
}