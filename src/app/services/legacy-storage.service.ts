import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
@Injectable({ providedIn: 'root' })
export class LegacyStorageService {
  constructor(private storage: Storage) {}
  async readProfilePhoto(): Promise<string | null> { const store = await this.storage.create(); return await store.get('FOTO_PERFIL') ?? null; }
  async readBackup() {
    const store = await this.storage.create();
    return { pacientes: await store.get('PACIENTES_CACHE') ?? [], profesionales: await store.get('PROFESIONALES') ?? [], citas: await store.get('CITAS') ?? [], atenciones: await store.get('ATENCIONES') ?? [] };
  }
  download(data: unknown) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `clident-${new Date().toISOString().slice(0, 10)}.backup.json`; link.click(); URL.revokeObjectURL(url);
  }
}
