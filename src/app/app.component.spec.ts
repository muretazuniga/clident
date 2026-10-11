import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
describe('AppComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));
  it('crea la navegación de la aplicación', () => { const app = TestBed.createComponent(AppComponent).componentInstance; expect(app.appPages.some(p => p.url === '/atenciones')).toBeTrue(); });
});
