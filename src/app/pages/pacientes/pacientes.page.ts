import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import {
  PacientesApiService,
  Paciente
} from '../../services/pacientes-api.service';

import { DBTaskService } from '../../services/dbtask.service';


interface Atencion {
  id: number;
  citaId: number;

  pacienteId: number;
  paciente: string;

  profesionalId: number;
  profesional: string;

  fecha: string;

  diagnostico: string;
  tratamiento: string;
  observaciones: string;
}


@Component({
  selector: 'app-pacientes',
  templateUrl: './pacientes.page.html',
  styleUrls: ['./pacientes.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    FormsModule
  ],
})
export class PacientesPage {

  pacientes: Paciente[] = [];

  nombre = '';
  rut = '';
  fechaNacimiento = '';
  email = '';
  telefono = '';

  idEditando: number | null = null;


  // HISTORIAL

  pacienteHistorial: Paciente | null = null;

  atenciones: Atencion[] = [];

  atencionesPaciente: Atencion[] = [];


  constructor(
    private api: PacientesApiService,
    private db: DBTaskService
  ) {}


  async ionViewWillEnter(): Promise<void> {

    await this.cargarPacientes();

    await this.cargarAtenciones();

  }


  // =========================
  // CARGAR PACIENTES
  // =========================

  async cargarPacientes(): Promise<void> {

    const guardados =
      await this.db.obtenerPacientesCache();

    if (
      guardados &&
      guardados.length > 0
    ) {

      this.pacientes =
        guardados;

      return;
    }


    this.api.getPacientes().subscribe({

      next: async (data) => {

        this.pacientes =
          data;

        await this.db.guardarPacientesCache(
          this.pacientes
        );

      }

    });

  }


  // =========================
  // CARGAR ATENCIONES
  // =========================

  async cargarAtenciones(): Promise<void> {

    const guardadas =
      await this.db.obtenerAtenciones();

    if (guardadas) {

      this.atenciones =
        guardadas;

    } else {

      this.atenciones = [];

    }

  }


  // =========================
  // GUARDAR PACIENTE
  // =========================

  async guardarPaciente(): Promise<void> {

    if (
      !this.nombre.trim() ||
      !this.rut.trim() ||
      !this.fechaNacimiento ||
      !this.email.trim() ||
      !this.telefono.trim()
    ) {
      return;
    }


    if (this.idEditando !== null) {

      const paciente =
        this.pacientes.find(
          p => p.id === this.idEditando
        );


      if (paciente) {

        paciente.name =
          this.nombre.trim();

        paciente.rut =
          this.rut.trim();

        paciente.fechaNacimiento =
          this.fechaNacimiento;

        paciente.email =
          this.email.trim();

        paciente.phone =
          this.telefono.trim();

      }


      this.idEditando = null;

    } else {

      const nuevoPaciente: Paciente = {

        id: Date.now(),

        name:
          this.nombre.trim(),

        rut:
          this.rut.trim(),

        fechaNacimiento:
          this.fechaNacimiento,

        email:
          this.email.trim(),

        phone:
          this.telefono.trim()

      };


      this.pacientes.push(
        nuevoPaciente
      );

    }


    await this.db.guardarPacientesCache(
      this.pacientes
    );


    this.limpiarFormulario();

  }


  // =========================
  // EDITAR PACIENTE
  // =========================

  editarPaciente(
    paciente: Paciente
  ): void {

    this.idEditando =
      paciente.id;

    this.nombre =
      paciente.name;

    this.rut =
      paciente.rut;

    this.fechaNacimiento =
      paciente.fechaNacimiento;

    this.email =
      paciente.email;

    this.telefono =
      paciente.phone;


    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

  }


  // =========================
  // ELIMINAR PACIENTE
  // =========================

  async eliminarPaciente(
    id: number
  ): Promise<void> {

    this.pacientes =
      this.pacientes.filter(
        paciente =>
          paciente.id !== id
      );


    await this.db.guardarPacientesCache(
      this.pacientes
    );


    if (
      this.idEditando === id
    ) {

      this.cancelarEdicion();

    }


    if (
      this.pacienteHistorial?.id === id
    ) {

      this.cerrarHistorial();

    }

  }


  // =========================
  // CANCELAR EDICIÓN
  // =========================

  cancelarEdicion(): void {

    this.idEditando = null;

    this.limpiarFormulario();

  }


  private limpiarFormulario(): void {

    this.nombre = '';

    this.rut = '';

    this.fechaNacimiento = '';

    this.email = '';

    this.telefono = '';

  }


  // =========================
  // VER HISTORIAL
  // =========================

  async verHistorial(
    paciente: Paciente
  ): Promise<void> {

    await this.cargarAtenciones();

    this.pacienteHistorial =
      paciente;


    this.atencionesPaciente =
      this.atenciones
        .filter(
          atencion =>
            atencion.pacienteId === paciente.id
        )
        .sort(
          (a, b) =>
            b.fecha.localeCompare(a.fecha)
        );


    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

  }


  // =========================
  // CERRAR HISTORIAL
  // =========================

  cerrarHistorial(): void {

    this.pacienteHistorial =
      null;

    this.atencionesPaciente = [];

  }

}