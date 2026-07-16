import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import path from 'path';
import { env } from '../config/env.js';
import * as schema from './schema.js';

const pool = new Pool({ connectionString: env.DATABASE_URL });

export const db = drizzle(pool, { schema });

export async function checkDbConnection(): Promise<void> {
  const client = await pool.connect();
  await client.query('SELECT 1');
  client.release();
}

/**
 * Corre las migraciones pendientes al arrancar. La carpeta `drizzle` está al
 * lado de `src`/`dist`, así que la resolvemos relativa a este archivo para que
 * funcione tanto en dev (tsx) como en producción (node dist), sin depender del
 * directorio de trabajo.
 */
export async function runMigrations(): Promise<void> {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const migrationsFolder = path.resolve(here, '../../drizzle');
  await migrate(db, { migrationsFolder });
}
