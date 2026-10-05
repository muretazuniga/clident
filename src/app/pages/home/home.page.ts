import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { DBTaskService } from '../../services/dbtask.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    RouterLink
  ]
})
export class HomePage implements OnInit {

  // Foto que se mostrará en el avatar
  fotoPerfil: string | null = null;

  constructor(
    private db: DBTaskService,
    private router: Router
  ) {}

  // Carga la foto cuando se inicia el Home
  async ngOnInit(): Promise<void> {
    await this.cargarFotoPerfil();
  }

  // La vuelve a cargar cada vez que entras al Home
  async ionViewWillEnter(): Promise<void> {
    await this.cargarFotoPerfil();
  }

  private async cargarFotoPerfil(): Promise<void> {
    this.fotoPerfil = await this.db.obtenerFotoPerfil();
  }

  async cerrarSesion(): Promise<void> {
    await this.db.cerrarSesion();
    await this.router.navigate(['/login']);
  }
}