import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import { UiService } from '../../services/ui.service';
import type { Atencion } from '../../../../shared/models';
@Component({ selector: 'app-atenciones', standalone: true, imports: [CommonModule, FormsModule, IonicModule], templateUrl: './atenciones.page.html' })
export class AtencionesPage {
  records: Atencion[] = []; editing: Atencion | null = null; diagnostico = ''; tratamiento = ''; observaciones = ''; loaded = false;
  constructor(private api: ApiService, public ui: UiService) {}
  async ionViewWillEnter() { await this.ui.run(async () => { await this.reload(); this.loaded = true; }); }
  private async reload() { this.records = await this.api.list<Atencion>('atenciones'); }
  edit(a: Atencion) { this.editing = a; this.diagnostico = a.diagnostico; this.tratamiento = a.tratamiento; this.observaciones = a.observaciones; }
  async save() { await this.ui.run(async () => { if (!this.editing) return; await this.api.update('atenciones', this.editing.id, { citaId: this.editing.citaId, diagnostico: this.diagnostico, tratamiento: this.tratamiento, observaciones: this.observaciones }, this.editing.updatedAt); this.editing = null; await this.reload(); }, 'Atención actualizada.'); }
}
