import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, IonicModule } from '@ionic/angular';

import { DBTaskService } from '../../services/dbtask.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {

  esRegistro: boolean = false;
  user_name: string = '';
  password: string = '';

  constructor(
    private db: DBTaskService,
    private router: Router,
    private alertController: AlertController
  ) {}

  async onSubmit(): Promise<void> {

    const user = String(this.user_name ?? '').trim();
    const pass = String(this.password ?? '').trim();

    // Validar usuario
    if (!user || user.length > 8) {
      await this.showAlert(
        'Validación',
        'El usuario es obligatorio y debe tener máximo 8 caracteres.'
      );
      return;
    }

    // Validar contraseña
    if (!pass || !/^\d+$/.test(pass)) {
      await this.showAlert(
        'Validación',
        'La contraseña debe contener solo números.'
      );
      return;
    }

    try {

      // =========================
      // REGISTRO
      // =========================
      if (this.esRegistro) {
        await this.db.guardarSesion(user);
        await this.router.navigateByUrl('/home');
        return;
      }

      // =========================
      // LOGIN
      // =========================
      if (user !== 'admin' || pass !== '1234') {
        await this.showAlert(
          'Error',
          'Usuario o contraseña incorrectos.'
        );
        return;
      }

      await this.db.guardarSesion(user);
      await this.router.navigateByUrl('/home');

    } catch (error) {
      console.error('Error en login:', error);

      await this.showAlert(
        'Error',
        'Ocurrió un problema al iniciar sesión.'
      );
    }
  }

  cambiarModo(): void {
    this.esRegistro = !this.esRegistro;
    this.user_name = '';
    this.password = '';
  }

  private async showAlert(
    header: string,
    message: string
  ): Promise<void> {

    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK'],
    });

    await alert.present();
  }
}