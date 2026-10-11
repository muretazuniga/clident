import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomePage } from './home.page';
import { provideRouter } from '@angular/router';
import { DBTaskService } from '../services/dbtask.service';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: DBTaskService, useValue: { obtenerFotoPerfil: async () => null } }] });
    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
