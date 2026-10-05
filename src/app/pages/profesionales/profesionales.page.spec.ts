import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfesionalesPage } from './profesionales.page';

describe('ProfesionalesPage', () => {
  let component: ProfesionalesPage;
  let fixture: ComponentFixture<ProfesionalesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ProfesionalesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
