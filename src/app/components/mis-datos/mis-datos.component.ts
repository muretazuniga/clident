import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ApiService, AuthService } from '../../services/api.service';
import { UiService } from '../../services/ui.service';
import { LegacyStorageService } from '../../services/legacy-storage.service';
@Component({ selector: 'app-mis-datos', templateUrl: './mis-datos.component.html', styleUrls: ['./mis-datos.component.scss'], standalone: true, imports: [IonicModule, CommonModule, FormsModule] })
export class MisDatosComponent {
  fotoBase64: string | null = null; currentPassword = ''; newPassword = ''; confirmation = '';
  constructor(private api: ApiService, public auth: AuthService, public ui: UiService, private legacy: LegacyStorageService) {}
  async recoverPhoto() {
    if (!await this.ui.confirm('¿Recuperar la foto de la instalación anterior para tu cuenta actual? Confirma que esa foto te pertenece.')) return;
    await this.ui.run(async () => { const image = await this.legacy.readProfilePhoto(); if (!image) throw new Error('No hay una foto en el almacenamiento anterior.'); await this.api.request('me', 'PATCH', { image }); this.fotoBase64 = image; await this.auth.refresh(); }, 'Foto recuperada.');
  }
  async ionViewWillEnter() { await this.ui.run(async () => { const u = await this.auth.refresh(); this.fotoBase64 = u.image; }); }
  async seleccionarFoto(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    await this.ui.run(async () => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 500000) throw new Error('Selecciona una imagen PNG, JPEG o WebP de hasta 500 KB.');
      const image = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('No se pudo leer la imagen.')); reader.readAsDataURL(file); });
      await this.api.request('me', 'PATCH', { image }); this.fotoBase64 = image; await this.auth.refresh();
    }, 'Foto actualizada.');
  }
  async limpiarFoto() {
    if (!await this.ui.confirm('¿Eliminar tu foto de perfil?')) return;
    await this.ui.run(async () => { await this.api.request('me', 'PATCH', { image: null }); this.fotoBase64 = null; await this.auth.refresh(); }, 'Foto eliminada.');
  }
  async changePassword() {
    await this.ui.run(async () => {
      if (this.newPassword.length < 12 || this.newPassword !== this.confirmation) throw new Error('Usa al menos 12 caracteres y confirma la misma contraseña.');
      await this.api.request('auth/change-password', 'POST', { currentPassword: this.currentPassword, newPassword: this.newPassword, revokeOtherSessions: true });
      this.currentPassword = ''; this.newPassword = ''; this.confirmation = '';
    }, 'Contraseña actualizada. Las otras sesiones fueron cerradas.');
  }
}
