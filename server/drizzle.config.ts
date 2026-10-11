import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';
import { basename, resolve } from 'node:path';
import { databaseUrl } from './db/config';
config({ path: resolve(process.cwd(), basename(process.cwd()) === 'server' ? '../.env' : '.env'), quiet: true });
const configuredUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
export default defineConfig({ dialect: 'postgresql', schema: './db/schema.ts', out: '../migrations', dbCredentials: { url: configuredUrl ? databaseUrl(configuredUrl, true) : '' }, strict: true });
