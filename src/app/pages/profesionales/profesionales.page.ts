import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { DBTaskService } from '../../services/dbtask.service';

interface Profesional {
  id: number;
  nombre: string;
  apellido: string;
  especialidad: string;
}

@Component({
  selector: 'app-profesionales',
  templateUrl: './profesionales.page.html',
  styleUrls: ['./profesionales.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    FormsModule
  ]
})
export class ProfesionalesPage implements OnInit {

  nombre = '';
  apellido = '';
  especialidad = '';

  idEditando: number | null = null;

  profesionales: Profesional[] = [];

  constructor(private db: DBTaskService) {}

  async ngOnInit(): Promise<void> {
    await this.cargarProfesionales();
  }

  private async cargarProfesionales(): Promise<void> {

    const guardados = await this.db.obtenerProfesionales();

    if (guardados && guardados.length > 0) {
      this.profesionales = guardados;
      return;
    }

    this.profesionales = [
      {
        id: 1,
        nombre: 'Camila',
        apellido: 'Rojas',
        especialidad: 'Odontología General'
      },
      {
        id: 2,
        nombre: 'Sebastián',
        apellido: 'Muñoz',
        especialidad: 'Ortodoncia'
      },
      {
        id: 3,
        nombre: 'Valentina',
        apellido: 'Torres',
        especialidad: 'Endodoncia'
      }
    ];

    await this.db.guardarProfesionales(this.profesionales);
  }

  async agregarProfesional(): Promise<void> {

    if (
      !this.nombre.trim() ||
      !this.apellido.trim() ||
      !this.especialidad
    ) {
      return;
    }

    if (this.idEditando !== null) {

      const profesional = this.profesionales.find(
        p => p.id === this.idEditando
      );

      if (profesional) {
        profesional.nombre = this.nombre.trim();
        profesional.apellido = this.apellido.trim();
        profesional.especialidad = this.especialidad;
      }

      this.idEditando = null;

    } else {

      const nuevoProfesional: Profesional = {
        id: Date.now(),
        nombre: this.nombre.trim(),
        apellido: this.apellido.trim(),
        especialidad: this.especialidad
      };

      this.profesionales.push(nuevoProfesional);
    }

    await this.db.guardarProfesionales(this.profesionales);

    this.nombre = '';
    this.apellido = '';
    this.especialidad = '';
  }

  editarProfesional(profesional: Profesional): void {

    this.idEditando = profesional.id;

    this.nombre = profesional.nombre;
    this.apellido = profesional.apellido;
    this.especialidad = profesional.especialidad;

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  async eliminarProfesional(id: number): Promise<void> {

    this.profesionales = this.profesionales.filter(
      profesional => profesional.id !== id
    );

    await this.db.guardarProfesionales(this.profesionales);
  }
}