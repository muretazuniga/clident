import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { DBTaskService } from '../services/dbtask.service';

export const authGuard: CanActivateFn = async () => {
  const db = inject(DBTaskService);
  const router = inject(Router);

  const activa = await db.existeSesionActiva();

  if (!activa) {
    router.navigate(['/login']);
    return false;
  }

  return true;
};