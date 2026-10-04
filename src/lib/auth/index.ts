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
    `);
  }
  return devDb;
}

export interface AuthContextInput {
  request: Request;
  locals?: any;
  url?: URL;
}

export function getAuthServiceFromContext(context: AuthContextInput): AuthService {
  const env = context.locals?.runtime?.env || (typeof process !== 'undefined' ? process.env : {});
  const db: D1Database = env.DB || getDevDb();
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
