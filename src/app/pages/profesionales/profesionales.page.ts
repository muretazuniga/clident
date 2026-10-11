import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ApiService, AuthService } from '../../services/api.service';
import { UiService } from '../../services/ui.service';
import type { Profesional, Usuario } from '../../../../shared/models';
@Component({ selector: 'app-profesionales', templateUrl: './profesionales.page.html', styleUrls: ['./profesionales.page.scss'], standalone: true, imports: [IonicModule, CommonModule, FormsModule] })
export class ProfesionalesPage {
  nombre = ''; apellido = ''; especialidad = ''; userId: string | null = null; idEditando: number | null = null;
  profesionales: Profesional[] = []; users: Usuario[] = []; loaded = false;
  constructor(private api: ApiService, public auth: AuthService, public ui: UiService) {}
  async ionViewWillEnter() { await this.ui.run(async () => { await this.reload(); this.loaded = true; }); }
  private async reload() {
    this.profesionales = await this.api.list<Profesional>('profesionales');
    if (this.auth.user()?.role === 'ADMINISTRADOR') this.users = (await this.api.request<Usuario[]>('users')).filter(u => u.active && u.role === 'PROFESIONAL');
  }
  async agregarProfesional() {
    await this.ui.run(async () => {
      const data = { nombre: this.nombre, apellido: this.apellido, especialidad: this.especialidad, userId: this.userId };
      const current = this.profesionales.find(p => p.id === this.idEditando);
      if (current) await this.api.update('profesionales', current.id, data, current.updatedAt); else await this.api.create('profesionales', data);
      this.cancelarEdicion(); await this.reload();
    }, 'Profesional guardado.');
  }
  editarProfesional(p: Profesional) { this.idEditando = p.id; this.nombre = p.nombre; this.apellido = p.apellido; this.especialidad = p.especialidad; this.userId = p.userId; }
  cancelarEdicion() { this.idEditando = null; this.nombre = ''; this.apellido = ''; this.especialidad = ''; this.userId = null; }
  async eliminarProfesional(id: number) {
    const p = this.profesionales.find(p => p.id === id);
    if (!p || !await this.ui.confirm('¿Eliminar este profesional? No se permite eliminar profesionales con citas registradas.')) return;
    await this.ui.run(async () => { await this.api.delete('profesionales', id, p.updatedAt); this.cancelarEdicion(); await this.reload(); }, 'Profesional eliminado.');
  }
}