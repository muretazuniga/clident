import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ApiService, AuthService } from '../../services/api.service';
import { UiService } from '../../services/ui.service';
import type { Paciente, Atencion } from '../../../../shared/models';
@Component({ selector: 'app-pacientes', templateUrl: './pacientes.page.html', styleUrls: ['./pacientes.page.scss'], standalone: true, imports: [IonicModule, CommonModule, FormsModule] })
export class PacientesPage {
  pacientes: Paciente[] = []; nombre = ''; rut = ''; fechaNacimiento = ''; email = ''; telefono = '';
  idEditando: number | null = null; pacienteHistorial: Paciente | null = null; atencionesPaciente: Atencion[] = []; loaded = false;
  constructor(private api: ApiService, public auth: AuthService, public ui: UiService) {}
  async ionViewWillEnter() { await this.ui.run(async () => { await this.reload(); this.loaded = true; }); }
  private async reload() { this.pacientes = await this.api.list<Paciente>('pacientes'); }
  async guardarPaciente() {
    await this.ui.run(async () => {
      const data = { name: this.nombre, rut: this.rut, fechaNacimiento: this.fechaNacimiento, email: this.email, phone: this.telefono };
      const current = this.pacientes.find(p => p.id === this.idEditando);
      if (current) await this.api.update('pacientes', current.id, data, current.updatedAt);
      else await this.api.create('pacientes', data);
      this.cancelarEdicion(); await this.reload();
    }, 'Paciente guardado.');
  }
  editarPaciente(p: Paciente) { this.idEditando = p.id; this.nombre = p.name; this.rut = p.rut; this.fechaNacimiento = p.fechaNacimiento; this.email = p.email; this.telefono = p.phone; }
  async eliminarPaciente(id: number) {
    const p = this.pacientes.find(p => p.id === id);
    if (!p || !await this.ui.confirm('¿Eliminar este paciente? Los pacientes con citas o historial no se pueden eliminar.')) return;
    await this.ui.run(async () => { await this.api.delete('pacientes', id, p.updatedAt); this.cancelarEdicion(); this.cerrarHistorial(); await this.reload(); }, 'Paciente eliminado.');
  }
  cancelarEdicion() { this.idEditando = null; this.nombre = ''; this.rut = ''; this.fechaNacimiento = ''; this.email = ''; this.telefono = ''; }
  async verHistorial(p: Paciente) { await this.ui.run(async () => { this.atencionesPaciente = await this.api.request<Atencion[]>(`pacientes/${p.id}/historial`); this.pacienteHistorial = p; }); }
  cerrarHistorial() { this.pacienteHistorial = null; this.atencionesPaciente = []; }
}