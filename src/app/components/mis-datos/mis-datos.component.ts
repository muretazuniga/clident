import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import {
  trigger,
  transition,
  style,
  animate
} from '@angular/animations';

import { DBTaskService } from '../../services/dbtask.service';

@Component({
  selector: 'app-mis-datos',
  templateUrl: './mis-datos.component.html',
  styleUrls: ['./mis-datos.component.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule
  ],
  animations: [
    trigger('zoomFade', [

      transition(':enter', [
        style({
          opacity: 0,
          transform: 'scale(0.95)'
        }),

        animate(
          '200ms ease-out',
          style({
            opacity: 1,
            transform: 'scale(1)'
          })
        ),
      ]),

      transition(':leave', [
        animate(
          '150ms ease-in',
          style({
            opacity: 0,
            transform: 'scale(0.95)'
          })
        ),
      ]),

    ]),
  ],
})
export class MisDatosComponent implements OnInit {

  fotoBase64: string | null = null;

  constructor(
    private db: DBTaskService
  ) {}


  // CARGAR FOTO GUARDADA
  async ngOnInit(): Promise<void> {

    try {

      this.fotoBase64 =
        await this.db.obtenerFotoPerfil();

    } catch (error) {

      console.error(
        'Error recuperando foto:',
        error
      );

    }

  }


  // SELECCIONAR FOTO DESDE GALERÍA
  async seleccionarFoto(
    event: Event
  ): Promise<void> {

    const input =
      event.target as HTMLInputElement;

    if (
      !input.files ||
      input.files.length === 0
    ) {
      return;
    }

    const archivo =
      input.files[0];


    // Validar que sea imagen
    if (!archivo.type.startsWith('image/')) {

      console.error(
        'El archivo seleccionado no es una imagen.'
      );

      return;
    }


    const reader =
      new FileReader();


    reader.onload =
      async () => {

        const resultado =
          reader.result as string;

        this.fotoBase64 =
          resultado;

        await this.db.guardarFotoPerfil(
          resultado
        );

        console.log(
          'Foto de perfil guardada correctamente'
        );

      };


    reader.onerror =
      () => {

        console.error(
          'Error leyendo la imagen.'
        );

      };


    reader.readAsDataURL(
      archivo
    );

  }


  // ELIMINAR FOTO
  async limpiarFoto(): Promise<void> {

    this.fotoBase64 = null;

    await this.db.eliminarFotoPerfil();

  }

}