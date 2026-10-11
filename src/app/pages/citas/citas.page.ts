import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import { UiService } from '../../services/ui.service';
import type { Profesional, Paciente, Cita, Atencion } from '../../../../shared/models';
@Component({ selector: 'app-citas', templateUrl: './citas.page.html', styleUrls: ['./citas.page.scss'], standalone: true, imports: [IonicModule, CommonModule, FormsModule] })
export class CitasPage {
  profesionales: Profesional[] = []; pacientes: Paciente[] = []; citas: Cita[] = []; atenciones: Atencion[] = [];
  pacienteSeleccionado: Paciente | null = null; profesionalSeleccionado: Profesional | null = null;
  fechaSeleccionada = ''; horaSeleccionada = ''; motivo = ''; idEditando: number | null = null;
  citaAtencion: Cita | null = null; diagnostico = ''; tratamiento = ''; observaciones = ''; loaded = false;
  horas = ['08:30','09:00','09:30','10:00','10:30','11:00','11:30','14:30','15:00','15:30','16:30','17:00'];
  constructor(private api: ApiService, public ui: UiService) {}
  async ionViewWillEnter() { await this.ui.run(async () => { await this.reload(); this.loaded = true; }); }
  private async reload() {
    const [profesionales, pacientes, citas, atenciones] = await Promise.all([this.api.list<Profesional>('profesionales'), this.api.list<Paciente>('pacientes'), this.api.list<Cita>('citas'), this.api.list<Atencion>('atenciones')]);
    this.profesionales = profesionales; this.pacientes = pacientes; this.citas = citas; this.atenciones = atenciones;
  }
  async confirmarCita() {
    await this.ui.run(async () => {
      if (!this.pacienteSeleccionado || !this.profesionalSeleccionado) throw new Error('Selecciona paciente y profesional.');
      const data = { pacienteId: this.pacienteSeleccionado.id, profesionalId: this.profesionalSeleccionado.id, fecha: this.fechaSeleccionada, hora: this.horaSeleccionada, motivo: this.motivo };
      const current = this.citas.find(c => c.id === this.idEditando);
      if (current) await this.api.update('citas', current.id, data, current.updatedAt); else await this.api.create('citas', data);
      this.cancelarEdicion(); await this.reload();
    }, 'Cita guardada.');
  }
  editarCita(c: Cita) { this.idEditando = c.id; this.pacienteSeleccionado = this.pacientes.find(p => p.id === c.pacienteId) ?? null; this.profesionalSeleccionado = this.profesionales.find(p => p.id === c.profesionalId) ?? null; this.fechaSeleccionada = c.fecha; this.horaSeleccionada = c.hora; this.motivo = c.motivo; }
  cancelarEdicion() { this.idEditando = null; this.pacienteSeleccionado = null; this.profesionalSeleccionado = null; this.fechaSeleccionada = ''; this.horaSeleccionada = ''; this.motivo = ''; }
  async eliminarCita(id: number) {
    const c = this.citas.find(c => c.id === id);
    if (!c || !await this.ui.confirm('¿Eliminar esta cita? Las citas con atención registrada se conservan como parte del historial.')) return;
    await this.ui.run(async () => { await this.api.delete('citas', id, c.updatedAt); this.cancelarEdicion(); await this.reload(); }, 'Cita eliminada.');
  }
  abrirAtencion(c: Cita) { this.cancelarAtencion(); this.citaAtencion = c; }
  async guardarAtencion() {
    await this.ui.run(async () => {
      if (!this.citaAtencion) throw new Error('Selecciona una cita.');
      await this.api.create('atenciones', { citaId: this.citaAtencion.id, diagnostico: this.diagnostico, tratamiento: this.tratamiento, observaciones: this.observaciones });
      this.cancelarAtencion(); await this.reload();
    }, 'Atención registrada.');
  }
  cancelarAtencion() { this.citaAtencion = null; this.diagnostico = ''; this.tratamiento = ''; this.observaciones = ''; }
  obtenerAtencion(id: number) { return this.atenciones.find(a => a.citaId === id); }
}