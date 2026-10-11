import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import { UiService } from '../../services/ui.service';
import { LegacyStorageService } from '../../services/legacy-storage.service';
import type { Usuario, Role, AuditEntry } from '../../../../shared/models';
@Component({ selector: 'app-admin', standalone: true, imports: [CommonModule, FormsModule, IonicModule], templateUrl: './admin.page.html' })
export class AdminPage {
  users: Usuario[] = []; name = ''; email = ''; password = ''; role: Role = 'PROFESIONAL'; active = true; editing: string | null = null;
  matrix: Record<string, string[]> = {}; backup: unknown; backupSaved = false; loaded = false;
  audit: AuditEntry[] = [];
  readonly actionLabels: Record<string, string> = { POST: 'Creación', PATCH: 'Actualización', DELETE: 'Eliminación', bootstrap: 'Inicialización', create: 'Creación', 'update-and-revoke': 'Cambio de cuenta y revocación', import: 'Importación' };
  readonly resourceLabels: Record<string, string> = { users: 'Usuarios', pacientes: 'Pacientes', profesionales: 'Profesionales', citas: 'Citas', atenciones: 'Atenciones', legacy: 'Importación local', legacy_imports: 'Importación local' };
  readonly permissionLabels: Record<string, string> = { 'users.manage': 'Gestionar usuarios y roles', 'professionals.manage': 'Gestionar profesionales', 'patients.create': 'Crear pacientes', 'patients.read.all': 'Consultar todos los pacientes', 'patients.update.all': 'Actualizar todos los pacientes', 'patients.delete': 'Eliminar pacientes sin relaciones clínicas', 'appointments.all': 'Gestionar toda la agenda', 'encounters.all': 'Gestionar todas las atenciones', 'legacy.import': 'Importar datos locales', 'audit.read': 'Consultar auditoría', 'patients.read.assigned': 'Consultar pacientes asignados', 'patients.update.assigned': 'Actualizar pacientes asignados', 'appointments.own': 'Gestionar su propia agenda', 'encounters.own': 'Gestionar sus propias atenciones' };
  constructor(private api: ApiService, public ui: UiService, private legacy: LegacyStorageService) {}
  async ionViewWillEnter() { await this.ui.run(async () => { await this.reload(); this.matrix = await this.api.request<Record<string, string[]>>('permissions'); this.loaded = true; }); }
  private async reload() { [this.users, this.audit] = await Promise.all([this.api.request<Usuario[]>('users'), this.api.request<AuditEntry[]>('audit')]); }
  edit(u: Usuario) { this.editing = u.id; this.name = u.name; this.email = u.email; this.role = u.role; this.active = u.active; this.password = ''; }
  cancel() { this.editing = null; this.name = ''; this.email = ''; this.password = ''; this.role = 'PROFESIONAL'; this.active = true; }
  async save() {
    if (this.editing && !await this.ui.confirm('¿Guardar los cambios de cuenta? Se cerrarán sus sesiones activas.')) return;
    await this.ui.run(async () => {
      if (this.editing) await this.api.request(`users/${this.editing}`, 'PATCH', { name: this.name, role: this.role, active: this.active });
      else await this.api.request('users', 'POST', { name: this.name, email: this.email, password: this.password, role: this.role });
      this.cancel(); await this.reload();
    }, 'Cuenta guardada.');
  }
  async exportBackup() { await this.ui.run(async () => { this.backup = await this.legacy.readBackup(); this.legacy.download(this.backup); this.backupSaved = false; }, 'Respaldo preparado. Confirma que el archivo se guardó antes de importar.'); }
  async importBackup() {
    if (!this.backup || !this.backupSaved || !await this.ui.confirm('¿Importar el respaldo local a la base de datos? La operación se cancelará si hay datos inválidos o duplicados. Los datos locales se conservarán.')) return;
    await this.ui.run(async () => { await this.api.request('legacy/import', 'POST', { ...(this.backup as object), confirmed: true, backupConfirmed: true }); this.backup = undefined; this.backupSaved = false; await this.reload(); }, 'Importación completada. Vincula las cuentas a los profesionales importados.');
  }
}
