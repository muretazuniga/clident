import { TestBed } from '@angular/core/testing';
import { CitasPage } from './citas.page';
import { ApiService } from '../../services/api.service';
import { UiService } from '../../services/ui.service';
describe('CitasPage', () => {
  it('crea el componente', () => { expect(TestBed.createComponent(CitasPage).componentInstance).toBeTruthy(); });
  it('muestra validación sin crear una cita incompleta', async () => {
    const component = TestBed.createComponent(CitasPage).componentInstance;
    const api = TestBed.inject(ApiService), ui = TestBed.inject(UiService); const create = spyOn(api, 'create');
    await component.confirmarCita(); expect(create).not.toHaveBeenCalled(); expect(ui.error()).toBeTrue(); expect(ui.message()).toContain('Selecciona');
  });
});
