import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { DBTaskService } from '../services/dbtask.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    RouterLink
  ],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {

  fotoPerfil: string | null = null;

  constructor(
    private db: DBTaskService,
    private router: Router
  ) {}

  async ngOnInit() {
    this.fotoPerfil = await this.db.obtenerFotoPerfil();
  }

  // Se ejecuta cada vez que vuelves al Home
  async ionViewWillEnter() {
    this.fotoPerfil = await this.db.obtenerFotoPerfil();
  }

  async cerrarSesion() {
    await this.db.cerrarSesion();
    await this.router.navigate(['/login']);
  }
}