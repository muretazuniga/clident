import { Component, effect } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import { home, people, calendar, person, medical, shieldCheckmark, documentText } from 'ionicons/icons';
import { ApiService, AuthService } from './services/api.service';
import { UiService } from './services/ui.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule],
})
export class AppComponent {
  public appPages = [
    { title: 'Inicio', url: '/home', icon: 'home' },
    { title: 'Pacientes', url: '/pacientes', icon: 'people' },
    { title: 'Profesionales', url: '/profesionales', icon: 'medical' },
    { title: 'Citas', url: '/citas', icon: 'calendar' },
    { title: 'Atenciones', url: '/atenciones', icon: 'document-text' },
    { title: 'Mi perfil', url: '/mis-datos', icon: 'person' },
  ];

  constructor(public router: Router, public auth: AuthService, public ui: UiService, api: ApiService) {
    addIcons({ home, people, calendar, person, medical, shieldCheckmark, documentText });
    effect(() => { if (api.expired() && router.url !== '/login' && router.url !== '/') { auth.user.set(null); location.replace('/login?expired=1'); } });
  }
}
