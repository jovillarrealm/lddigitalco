// LDDIGITALCO — Seam de Persistencia para Sesión en Vivo
// Cumple con codebase-design: dos adaptadores justifican el seam (D1 en producción, Memoria en tests/dev)

import type { D1Database } from '../db/types';
import { DEFAULT_LIVE_SESSION, type LiveSession } from './live-session';

export interface LiveSessionRepository {
  get(): Promise<LiveSession>;
  save(session: LiveSession): Promise<void>;
}

const CONFIG_KEY = 'live_session';

/**
 * Adaptador D1: Persiste el estado de la Sesión en Vivo de forma duradera
 * en Cloudflare Edge D1 para sobrevivir cold starts y compartir estado entre isolates.
 */
export class D1LiveSessionRepository implements LiveSessionRepository {
  constructor(private db: D1Database) {}

  async get(): Promise<LiveSession> {
    try {
      const row = await this.db
        .prepare('SELECT valor FROM configuracion WHERE clave = ?')
        .bind(CONFIG_KEY)
        .first<{ valor: string }>();

      if (!row || !row.valor) {
        return { ...DEFAULT_LIVE_SESSION };
      }

      const parsed = JSON.parse(row.valor);
      return {
        ...DEFAULT_LIVE_SESSION,
        ...parsed,
      };
    } catch {
      return { ...DEFAULT_LIVE_SESSION };
    }
  }

  async save(session: LiveSession): Promise<void> {
    const json = JSON.stringify(session);
    const now = new Date().toISOString();

    await this.db
      .prepare(`
        INSERT INTO configuracion (clave, valor, actualizado_en)
        VALUES (?, ?, ?)
        ON CONFLICT(clave) DO UPDATE SET
          valor = excluded.valor,
          actualizado_en = excluded.actualizado_en
      `)
      .bind(CONFIG_KEY, json, now)
      .run();
  }
}

/**
 * Adaptador en Memoria: Para pruebas unitarias rápidas y aislamiento de estado
 */
export class MemoryLiveSessionRepository implements LiveSessionRepository {
  private currentSession: LiveSession;

  constructor(initialSession: LiveSession = DEFAULT_LIVE_SESSION) {
    this.currentSession = { ...initialSession };
  }

  async get(): Promise<LiveSession> {
    return { ...this.currentSession };
  }

  async save(session: LiveSession): Promise<void> {
    this.currentSession = { ...session };
  }
}
