import { AccesoEstudiante } from './acceso-estudiante';
import { getEmailService } from '../email';
import { createInMemoryD1 } from '../db/d1-memory';
import type { D1Database } from '../db/types';
import { env as cfWorkersEnv } from 'cloudflare:workers';

let devDb: D1Database | null = null;

function createStubD1(): D1Database {
  return {
    prepare: () => ({
      bind: () => ({
        first: async () => null,
        run: async () => ({ results: [], success: true, meta: { duration: 0, changes: 0, last_row_id: 0 } }),
        all: async () => ({ results: [], success: true, meta: { duration: 0, changes: 0, last_row_id: 0 } }),
        raw: async () => [],
      } as any),
      first: async () => null,
      run: async () => ({ results: [], success: true, meta: { duration: 0, changes: 0, last_row_id: 0 } }),
      all: async () => ({ results: [], success: true, meta: { duration: 0, changes: 0, last_row_id: 0 } }),
      raw: async () => [],
    } as any),
    dump: async () => new ArrayBuffer(0),
    batch: async () => [],
    exec: async () => ({ count: 0, duration: 0 }),
  };
}

function getDevDb(): D1Database {
  if (!devDb) {
    try {
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
        CREATE TABLE IF NOT EXISTS configuracion (
          clave TEXT PRIMARY KEY,
          valor TEXT NOT NULL,
          actualizado_en TEXT NOT NULL
        );
      `);
    } catch {
      // Fallback seguro en Cloudflare Workers si DB no está vinculado
      devDb = createStubD1();
    }
  }
  return devDb;
}

export interface AuthContextInput {
  request: Request;
  locals?: any;
  url?: URL;
}

export function getEnvFromContext(context?: AuthContextInput): Record<string, any> {
  let localsEnv: Record<string, any> | undefined;
  if (context && context.locals) {
    try {
      localsEnv = (context.locals as any)?.runtime?.env;
    } catch {
      // In @astrojs/cloudflare runtime, Astro.locals.runtime.env throws in Astro v6+
    }
  }

  const baseCf = typeof cfWorkersEnv !== 'undefined' ? cfWorkersEnv : {};
  const baseProc = typeof process !== 'undefined' ? process.env : {};

  return new Proxy({} as Record<string, any>, {
    get(_target, prop: string | symbol) {
      if (typeof prop !== 'string') return undefined;
      if (localsEnv && prop in localsEnv && localsEnv[prop] !== undefined) {
        return localsEnv[prop];
      }
      if (baseCf && prop in baseCf && baseCf[prop] !== undefined) {
        return baseCf[prop];
      }
      if (baseProc && prop in baseProc && baseProc[prop] !== undefined) {
        return baseProc[prop];
      }
      return (baseCf as any)?.[prop] ?? (localsEnv as any)?.[prop] ?? (baseProc as any)?.[prop];
    },
    has(_target, prop: string | symbol) {
      if (typeof prop !== 'string') return false;
      return (
        Boolean(localsEnv && prop in localsEnv) ||
        Boolean(baseCf && prop in baseCf) ||
        Boolean(baseProc && prop in baseProc)
      );
    },
  });
}

export function getDbFromContext(context: AuthContextInput): D1Database {
  const env = getEnvFromContext(context);
  return env.DB || getDevDb();
}

export function getAuthServiceFromContext(context: AuthContextInput): AccesoEstudiante {
  const env = getEnvFromContext(context);
  const db: D1Database = getDbFromContext(context);
  const secret: string = env.AUTH_SECRET || 'lddigitalco-secret-key-32-chars-minimum-dev';
  const emailService = getEmailService(env);
  const appUrl = env.APP_URL || (context.url ? `${context.url.protocol}//${context.url.host}` : 'http://localhost:4321');
  const isProduction = env.NODE_ENV === 'production';

  return new AccesoEstudiante({
    db,
    emailService,
    secret,
    appUrl,
    isProduction,
  });
}

export const getAccesoEstudianteFromContext = getAuthServiceFromContext;

export * from './crypto';
export * from './service';
export * from './acceso-estudiante';
export * from './tier';

