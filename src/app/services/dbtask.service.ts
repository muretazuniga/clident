import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';

@Injectable({
  providedIn: 'root'
})
export class DBTaskService {

  private readonly ACTIVE_USER_KEY = 'ACTIVE_USER';
  private readonly PACIENTES_CACHE_KEY = 'PACIENTES_CACHE';
  private readonly FOTO_PERFIL_KEY = 'FOTO_PERFIL';
  private readonly PROFESIONALES_KEY = 'PROFESIONALES';
  private readonly CITAS_KEY = 'CITAS';
  private readonly ATENCIONES_KEY = 'ATENCIONES';

  private _storage!: Storage;
  private storageReady: Promise<void>;

  constructor(private storage: Storage) {
    this.storageReady = this.init();
  }

  private async init(): Promise<void> {
    this._storage = await this.storage.create();
  }


  // =========================
  // SESIÓN
  // =========================

  async guardarSesion(username: string): Promise<void> {
    await this.storageReady;
    await this._storage.set(this.ACTIVE_USER_KEY, username);
  }

  async existeSesionActiva(): Promise<boolean> {
    await this.storageReady;

    const user =
      await this._storage.get(this.ACTIVE_USER_KEY);

    return !!user;
  }

  async cerrarSesion(): Promise<void> {
    await this.storageReady;

    await this._storage.remove(
      this.ACTIVE_USER_KEY
    );
  }


  // =========================
  // PACIENTES
  // =========================

  async guardarPacientesCache(
    pacientes: any[]
  ): Promise<void> {

    await this.storageReady;

    await this._storage.set(
      this.PACIENTES_CACHE_KEY,
      pacientes
    );
  }

  async obtenerPacientesCache():
    Promise<any[] | null> {

    await this.storageReady;

    return await this._storage.get(
      this.PACIENTES_CACHE_KEY
    );
  }


  // =========================
  // FOTO DE PERFIL
  // =========================

  async guardarFotoPerfil(
    foto: string
  ): Promise<void> {

    await this.storageReady;

    await this._storage.set(
      this.FOTO_PERFIL_KEY,
      foto
    );
  }

  async obtenerFotoPerfil():
    Promise<string | null> {

    await this.storageReady;

    const foto =
      await this._storage.get(
        this.FOTO_PERFIL_KEY
      );

    return foto ?? null;
  }

  async eliminarFotoPerfil():
    Promise<void> {

    await this.storageReady;

    await this._storage.remove(
      this.FOTO_PERFIL_KEY
    );
  }


  // =========================
  // PROFESIONALES
  // =========================

  async guardarProfesionales(
    profesionales: any[]
  ): Promise<void> {

    await this.storageReady;

    await this._storage.set(
      this.PROFESIONALES_KEY,
      profesionales
    );
  }

  async obtenerProfesionales():
    Promise<any[] | null> {

    await this.storageReady;

    return await this._storage.get(
      this.PROFESIONALES_KEY
    );
  }


  // =========================
  // CITAS
  // =========================

  async guardarCitas(
    citas: any[]
  ): Promise<void> {

    await this.storageReady;

    await this._storage.set(
      this.CITAS_KEY,
      citas
    );
  }

  async obtenerCitas():
    Promise<any[] | null> {

    await this.storageReady;

    return await this._storage.get(
      this.CITAS_KEY
    );
  }


  // =========================
  // ATENCIONES
  // =========================

  async guardarAtenciones(
    atenciones: any[]
  ): Promise<void> {

    await this.storageReady;

    await this._storage.set(
      this.ATENCIONES_KEY,
      atenciones
    );
  }

  async obtenerAtenciones():
    Promise<any[] | null> {

    await this.storageReady;

    return await this._storage.get(
      this.ATENCIONES_KEY
    );
  }

}