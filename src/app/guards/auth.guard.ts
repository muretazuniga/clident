import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/api.service';
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService), router = inject(Router);
  try { await auth.refresh(); return true; } catch { return router.parseUrl('/login'); }
};
export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService), router = inject(Router);
  try { const u = await auth.refresh(); return u.role === 'ADMINISTRADOR' || router.parseUrl('/home'); } catch { return router.parseUrl('/login'); }
};