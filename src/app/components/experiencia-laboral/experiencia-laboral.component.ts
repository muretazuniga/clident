import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Experiencia {
  empresa: string;
  anioInicio: number | null;
  trabajaActualmente: boolean;
  anioTermino: number | null;
  cargo: string;
}

@Component({
  selector: 'app-experiencia-laboral',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './experiencia-laboral.component.html',
  styleUrls: ['./experiencia-laboral.component.scss'],
})
export class ExperienciaLaboralComponent {
  experiencia: Experiencia = {
    empresa: '',
    anioInicio: null,
    trabajaActualmente: false,
    anioTermino: null,
    cargo: '',
  };

  experienciasGuardadas: Experiencia[] = [];

  agregarExperiencia() {
    // pequeña validación
    if (!this.experiencia.empresa || !this.experiencia.anioInicio || !this.experiencia.cargo) {
      return;
    }
    if (!this.experiencia.trabajaActualmente && !this.experiencia.anioTermino) {
      return;
    }

    this.experienciasGuardadas.push({ ...this.experiencia });
    this.experiencia = {
      empresa: '',
      anioInicio: null,
      trabajaActualmente: false,
      anioTermino: null,
      cargo: '',
    };
  }
}
