import { Injectable } from '@angular/core';
import { from } from 'rxjs';
import { ApiService } from './api.service';
import type { Paciente } from '../../../shared/models';
export type { Paciente } from '../../../shared/models';
@Injectable({ providedIn: 'root' })
export class PacientesApiService {
  constructor(private api: ApiService) {}
  getPacientes() { return from(this.api.list<Paciente>('pacientes')); }
}