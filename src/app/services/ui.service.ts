import { Injectable, signal } from '@angular/core';
import { AlertController } from '@ionic/angular';
@Injectable({ providedIn: 'root' })
export class UiService {
  readonly pending = signal(0); readonly message = signal(''); readonly error = signal(false);
  constructor(private alerts: AlertController) {}
  async run<T>(operation: () => Promise<T>, success = ''): Promise<T | undefined> {
    if (this.pending()) return undefined;
    this.pending.update(n => n + 1); this.message.set(''); this.error.set(false);
    try { const result = await operation(); if (success) { this.error.set(false); this.message.set(success); } return result; }
    catch (e) { this.error.set(true); this.message.set(e instanceof Error ? e.message : 'No se pudo completar la operación.'); return undefined; }
    finally { this.pending.update(n => n - 1); }
  }
  async confirm(message: string) {
    const alert = await this.alerts.create({ header: 'Confirmar operación', message, buttons: [{ text: 'Cancelar', role: 'cancel' }, { text: 'Confirmar', role: 'confirm' }] });
    await alert.present(); return (await alert.onDidDismiss()).role === 'confirm';
  }
}
