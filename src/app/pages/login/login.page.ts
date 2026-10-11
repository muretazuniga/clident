import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ApiService, AuthService } from '../../services/api.service';
@Component({ selector: 'app-login', standalone: true, imports: [IonicModule, CommonModule, FormsModule], templateUrl: './login.page.html', styleUrls: ['./login.page.scss'] })
export class LoginPage {
  email = ''; password = ''; confirmation = ''; busy = false; message = ''; error = false;
  mode: 'login' | 'recover' | 'reset' = 'login';
  private token: string | null;
  constructor(private auth: AuthService, private api: ApiService, private router: Router, route: ActivatedRoute) { this.token = route.snapshot.queryParamMap.get('token'); if (this.token) this.mode = 'reset'; if (route.snapshot.queryParamMap.has('expired')) this.message = 'Tu sesión expiró. Inicia sesión nuevamente.'; }
  async onSubmit() {
    if (this.busy) return;
    this.busy = true; this.message = ''; this.error = false;
    try {
      if (this.mode === 'login') { await this.auth.login(this.email.trim(), this.password); this.password = ''; await this.router.navigateByUrl('/home'); }
      else if (this.mode === 'recover') { await this.api.request('auth/request-password-reset', 'POST', { email: this.email.trim(), redirectTo: `${location.origin}/login` }); this.message = 'Si la cuenta existe, recibirás un enlace para restablecer la contraseña.'; }
      else { if (this.password.length < 12 || this.password !== this.confirmation) throw new Error('Usa al menos 12 caracteres y confirma la misma contraseña.'); await this.api.request('auth/reset-password', 'POST', { token: this.token, newPassword: this.password }); this.mode = 'login'; this.password = ''; this.confirmation = ''; this.message = 'Contraseña actualizada. Inicia sesión.'; await this.router.navigateByUrl('/login', { replaceUrl: true }); }
    } catch (e) { this.error = true; this.message = this.mode === 'login' ? 'No se pudo iniciar sesión. Comprueba tus credenciales y conexión. Si realizaste varios intentos, espera unos minutos.' : e instanceof Error ? e.message : 'No se pudo completar la solicitud.'; }
    finally { this.busy = false; }
  }
}
