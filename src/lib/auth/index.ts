import { AuthService } from './service';
import { getEmailService } from '../email';
import { createInMemoryD1 } from '../db/d1-memory';
import type { D1Database } from '../db/types';

let devDb: D1Database | null = null;

function getDevDb(): D1Database {
  if (!devDb) {
    devDb = createInMemoryD1();
    // Default schema creation for development
    devDb.exec(`
      CREATE TABLE IF NOT EXISTS estudiantes (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        nombre TEXT NOT NULL,
        rol TEXT NOT NULL DEFAULT 'estudiante',
        nivel_acceso TEXT NOT NULL DEFAULT 'ruta_abierta',
        creado_en TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_estudiantes_email ON estudiantes(email);

      CREATE TABLE IF NOT EXISTS progreso (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        estudiante_id TEXT NOT NULL,
        microcapsula_slug TEXT NOT NULL,
        completado_en TEXT NOT NULL,
        FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE,
        UNIQUE (estudiante_id, microcapsula_slug)
      );
      CREATE INDEX IF NOT EXISTS idx_progreso_estudiante ON progreso(estudiante_id);
      CREATE INDEX IF NOT EXISTS idx_progreso_slug ON progreso(microcapsula_slug);

      CREATE TABLE IF NOT EXISTS consultas (
        id TEXT PRIMARY KEY,
        estudiante_id TEXT NOT NULL,
        microcapsula_slug TEXT NOT NULL,
        mensaje TEXT NOT NULL,
        estado TEXT NOT NULL DEFAULT 'pendiente',
        creado_en TEXT NOT NULL,
        FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_consultas_estudiante ON consultas(estudiante_id);
      CREATE INDEX IF NOT EXISTS idx_consultas_slug ON consultas(microcapsula_slug);
    `);
  }
  return devDb;
}

export interface AuthContextInput {
  request: Request;
  locals?: any;
  url?: URL;
}

export function getEnvFromContext(context: AuthContextInput): Record<string, any> {
  return (context.locals as any)?.runtime?.env || (typeof process !== 'undefined' ? process.env : {});
}

export function getDbFromContext(context: AuthContextInput): D1Database {
  const env = getEnvFromContext(context);
  return env.DB || getDevDb();
}

export function getAuthServiceFromContext(context: AuthContextInput): AuthService {
  const env = getEnvFromContext(context);
  const db: D1Database = getDbFromContext(context);
  const secret: string = env.AUTH_SECRET || 'lddigitalco-secret-key-32-chars-minimum-dev';
  const emailService = getEmailService(env);
  const appUrl = env.APP_URL || (context.url ? `${context.url.protocol}//${context.url.host}` : 'http://localhost:4321');
  const isProduction = env.NODE_ENV === 'production';

  return new AuthService({
    db,
    emailService,
    secret,
    appUrl,
    isProduction,
  });
}


export * from './crypto';
export * from './service';
