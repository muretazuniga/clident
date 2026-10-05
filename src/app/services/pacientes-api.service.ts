import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface Paciente {
  id: number;
  name: string;
  rut: string;
  fechaNacimiento: string;
  email: string;
  phone: string;
}

@Injectable({
  providedIn: 'root'
})
export class PacientesApiService {

  private pacientes: Paciente[] = [
    {
      id: 1,
      name: 'Camila González',
      rut: '18.345.672-1',
      fechaNacimiento: '1998-04-12',
      email: 'camila.gonzalez@example.com',
      phone: '+56 9 6123 4587'
    },
    {
      id: 2,
      name: 'Diego Martínez',
      rut: '17.456.321-8',
      fechaNacimiento: '1995-09-23',
      email: 'diego.martinez@example.com',
      phone: '+56 9 7345 2198'
    },
    {
      id: 3,
      name: 'Valentina Soto',
      rut: '19.234.567-5',
      fechaNacimiento: '2000-02-15',
      email: 'valentina.soto@example.com',
      phone: '+56 9 8456 3271'
    },
    {
      id: 4,
      name: 'Matías Herrera',
      rut: '16.987.654-3',
      fechaNacimiento: '1993-11-08',
      email: 'matias.herrera@example.com',
      phone: '+56 9 5234 7612'
    },
    {
      id: 5,
      name: 'Fernanda Rojas',
      rut: '20.123.456-7',
      fechaNacimiento: '2001-07-19',
      email: 'fernanda.rojas@example.com',
      phone: '+56 9 6789 1432'
    },
    {
      id: 6,
      name: 'Nicolás Sepúlveda',
      rut: '15.876.543-2',
      fechaNacimiento: '1991-05-30',
      email: 'nicolas.sepulveda@example.com',
      phone: '+56 9 7564 2389'
    },
    {
      id: 7,
      name: 'Daniela Morales',
      rut: '18.765.432-9',
      fechaNacimiento: '1997-12-03',
      email: 'daniela.morales@example.com',
      phone: '+56 9 6345 8721'
    },
    {
      id: 8,
      name: 'Felipe Contreras',
      rut: '17.234.876-4',
      fechaNacimiento: '1994-08-21',
      email: 'felipe.contreras@example.com',
      phone: '+56 9 8123 6745'
    },
    {
      id: 9,
      name: 'Javiera Fuentes',
      rut: '19.876.234-6',
      fechaNacimiento: '1999-06-14',
      email: 'javiera.fuentes@example.com',
      phone: '+56 9 9456 2137'
    },
    {
      id: 10,
      name: 'Tomás Silva',
      rut: '16.543.987-1',
      fechaNacimiento: '1992-01-27',
      email: 'tomas.silva@example.com',
      phone: '+56 9 5876 3492'
    }
  ];

  constructor() {}

  getPacientes(): Observable<Paciente[]> {
    return of(this.pacientes);
  }
}