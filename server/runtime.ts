import { createDatabase } from './db';
import { createAuth } from './auth';
import { createApi } from './api';
let handler: ReturnType<typeof createApi> | undefined;
export function getHandler() {
  if (!handler) { const db = createDatabase(); handler = createApi(db, createAuth(db)); }
  return handler;
}
