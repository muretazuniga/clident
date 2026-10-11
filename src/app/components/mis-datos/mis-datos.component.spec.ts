import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { MisDatosComponent } from './mis-datos.component';
import { LegacyStorageService } from '../../services/legacy-storage.service';

describe('MisDatosComponent', () => {
  let component: MisDatosComponent;
  let fixture: ComponentFixture<MisDatosComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [MisDatosComponent],
      providers: [{ provide: LegacyStorageService, useValue: { readProfilePhoto: async () => null } }],
    }).compileComponents();

    fixture = TestBed.createComponent(MisDatosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
