import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { DBTaskService } from '../../services/dbtask.service';
import { Paciente } from '../../services/pacientes-api.service';

interface Profesional {
  id: number;
  nombre: string;
  apellido: string;
  especialidad: string;
}

interface Cita {
  id: number;

  pacienteId: number;
  paciente: string;

  profesionalId: number;
  profesional: string;

  especialidad: string;
  fecha: string;
  hora: string;
  motivo: string;
}

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
  selector: 'app-citas',
  templateUrl: './citas.page.html',
  styleUrls: ['./citas.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule
  ],
})
export class CitasPage implements OnInit {

  profesionales: Profesional[] = [];
  pacientes: Paciente[] = [];
  citas: Cita[] = [];
  atenciones: Atencion[] = [];

  pacienteSeleccionado: Paciente | null = null;
  profesionalSeleccionado: Profesional | null = null;

  fechaSeleccionada = '';
  horaSeleccionada = '';
  motivo = '';

  idEditando: number | null = null;


  // DATOS DE ATENCIÓN

  citaAtencion: Cita | null = null;

  diagnostico = '';
  tratamiento = '';
  observaciones = '';


  horas = [
    '08:30',
    '09:00',
    '09:30',
    '10:00',
    '10:30',
    '11:00',
    '11:30',
    '14:30',
    '15:00',
    '15:30',
    '16:30',
    '17:00'
  ];


  constructor(
    private db: DBTaskService
  ) {}


  async ngOnInit(): Promise<void> {

    // PROFESIONALES
    const profesionalesGuardados =
      await this.db.obtenerProfesionales();

    if (profesionalesGuardados) {
      this.profesionales =
        profesionalesGuardados;
    }


    // CITAS
    const citasGuardadas =
      await this.db.obtenerCitas();

    if (citasGuardadas) {
      this.citas =
        citasGuardadas;
    }


    // PACIENTES
    const pacientesGuardados =
      await this.db.obtenerPacientesCache();

    if (pacientesGuardados) {
      this.pacientes =
        pacientesGuardados;
    }


    // ATENCIONES
    const atencionesGuardadas =
      await this.db.obtenerAtenciones();

    if (atencionesGuardadas) {
      this.atenciones =
        atencionesGuardadas;
    }

  }


  // =========================
  // CREAR / EDITAR CITA
  // =========================

  async confirmarCita(): Promise<void> {

    if (
      !this.pacienteSeleccionado ||
      !this.profesionalSeleccionado ||
      !this.fechaSeleccionada ||
      !this.horaSeleccionada ||
      !this.motivo.trim()
    ) {
      return;
    }


    if (this.idEditando !== null) {

      const cita =
        this.citas.find(
          c => c.id === this.idEditando
        );

      if (cita) {

        cita.pacienteId =
          this.pacienteSeleccionado.id;

        cita.paciente =
          this.pacienteSeleccionado.name;

        cita.profesionalId =
          this.profesionalSeleccionado.id;

        cita.profesional =
          this.profesionalSeleccionado.nombre +
          ' ' +
          this.profesionalSeleccionado.apellido;

        cita.especialidad =
          this.profesionalSeleccionado.especialidad;

        cita.fecha =
          this.fechaSeleccionada;

        cita.hora =
          this.horaSeleccionada;

        cita.motivo =
          this.motivo.trim();
      }

      this.idEditando = null;

    } else {

      const nuevaCita: Cita = {

        id: Date.now(),

        pacienteId:
          this.pacienteSeleccionado.id,

        paciente:
          this.pacienteSeleccionado.name,

        profesionalId:
          this.profesionalSeleccionado.id,

        profesional:
          this.profesionalSeleccionado.nombre +
          ' ' +
          this.profesionalSeleccionado.apellido,

        especialidad:
          this.profesionalSeleccionado.especialidad,

        fecha:
          this.fechaSeleccionada,

        hora:
          this.horaSeleccionada,

        motivo:
          this.motivo.trim()
      };

      this.citas.push(
        nuevaCita
      );
    }


    await this.db.guardarCitas(
      this.citas
    );

    this.limpiarFormulario();
  }


  // =========================
  // EDITAR CITA
  // =========================

  editarCita(cita: Cita): void {

    const paciente =
      this.pacientes.find(
        p => p.id === cita.pacienteId
      );

    const profesional =
      this.profesionales.find(
        p => p.id === cita.profesionalId
      );

    if (
      !paciente ||
      !profesional
    ) {
      return;
    }


    this.idEditando =
      cita.id;

    this.pacienteSeleccionado =
      paciente;

    this.profesionalSeleccionado =
      profesional;

    this.fechaSeleccionada =
      cita.fecha;

    this.horaSeleccionada =
      cita.hora;

    this.motivo =
      cita.motivo;


    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

  }


  // =========================
  // ELIMINAR CITA
  // =========================

  async eliminarCita(
    id: number
  ): Promise<void> {

    this.citas =
      this.citas.filter(
        cita => cita.id !== id
      );

    await this.db.guardarCitas(
      this.citas
    );

    if (
      this.idEditando === id
    ) {
      this.cancelarEdicion();
    }

  }


  cancelarEdicion(): void {

    this.idEditando = null;

    this.limpiarFormulario();

  }


  private limpiarFormulario(): void {

    this.pacienteSeleccionado = null;

    this.profesionalSeleccionado = null;

    this.fechaSeleccionada = '';

    this.horaSeleccionada = '';

    this.motivo = '';

  }


  // =========================
  // REGISTRAR ATENCIÓN
  // =========================

  abrirAtencion(
    cita: Cita
  ): void {

    this.citaAtencion =
      cita;

    this.diagnostico = '';

    this.tratamiento = '';

    this.observaciones = '';

  }


  async guardarAtencion():
    Promise<void> {

    if (
      !this.citaAtencion ||
      !this.diagnostico.trim() ||
      !this.tratamiento.trim()
    ) {
      return;
    }


    const nuevaAtencion: Atencion = {

      id: Date.now(),

      citaId:
        this.citaAtencion.id,

      pacienteId:
        this.citaAtencion.pacienteId,

      paciente:
        this.citaAtencion.paciente,

      profesionalId:
        this.citaAtencion.profesionalId,

      profesional:
        this.citaAtencion.profesional,

      fecha:
        this.citaAtencion.fecha,

      diagnostico:
        this.diagnostico.trim(),

      tratamiento:
        this.tratamiento.trim(),

      observaciones:
        this.observaciones.trim()
    };


    this.atenciones.push(
      nuevaAtencion
    );


    await this.db.guardarAtenciones(
      this.atenciones
    );


    this.cancelarAtencion();

  }


  cancelarAtencion(): void {

    this.citaAtencion = null;

    this.diagnostico = '';

    this.tratamiento = '';

    this.observaciones = '';

  }


  // =========================
  // BUSCAR ATENCIÓN DE CITA
  // =========================

  obtenerAtencion(
    citaId: number
  ): Atencion | undefined {

    return this.atenciones.find(
      atencion =>
        atencion.citaId === citaId
    );

  }

}