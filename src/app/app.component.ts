import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import { home, people, calendar, person, medical } from 'ionicons/icons';

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
    { title: 'Mis datos', url: '/mis-datos', icon: 'person' },
  ];

  constructor(public router: Router) {
    addIcons({ home, people, calendar, person, medical });
  }
}
