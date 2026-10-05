import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Certificacion {
  nombre: string;
  fechaObtencion: string;
  tieneVencimiento: boolean;
  fechaVencimiento: string | null;
}

@Component({
  selector: 'app-certificaciones',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './certificaciones.component.html',
  styleUrls: ['./certificaciones.component.scss'],
})
export class CertificacionesComponent {
  certificacion: Certificacion = {
    nombre: '',
    fechaObtencion: '',
    tieneVencimiento: false,
    fechaVencimiento: null,
  };

  certificaciones: Certificacion[] = [];

  agregarCertificacion() {
    if (!this.certificacion.nombre || !this.certificacion.fechaObtencion) {
      return;
    }

    this.certificaciones.push({ ...this.certificacion });
    this.certificacion = {
      nombre: '',
      fechaObtencion: '',
      tieneVencimiento: false,
      fechaVencimiento: null,
    };
  }
}
