import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ApiService, AuthService } from '../../services/api.service';
import { UiService } from '../../services/ui.service';
import type { Cita, Dashboard } from '../../../../shared/models';
@Component({ selector: 'app-home', templateUrl: './home.page.html', styleUrls: ['./home.page.scss'], standalone: true, imports: [IonicModule, CommonModule, RouterLink] })
export class HomePage {
  citas: Cita[] = []; counts: { pacientes: number; citas: number; atenciones: number } | null = null;
  constructor(private api: ApiService, public auth: AuthService, public ui: UiService) {}
  async ionViewWillEnter() { await this.ui.run(async () => {
    const dashboard = await this.api.request<Dashboard>('dashboard');
    this.counts = dashboard.counts; this.citas = dashboard.upcoming;
  }); }
  async cerrarSesion() { await this.ui.run(async () => { await this.auth.logout(); location.replace('/login'); }); }
}
