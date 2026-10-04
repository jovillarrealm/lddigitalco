import { describe, it, expect, beforeEach } from 'vitest';
import { createInMemoryD1 } from '../src/lib/db/d1-memory';
import fs from 'node:fs';
import path from 'node:path';

describe('In-Memory D1 Adapter', () => {
  let db: ReturnType<typeof createInMemoryD1>;

  beforeEach(() => {
    db = createInMemoryD1();
    const schemaPath = path.resolve(__dirname, '../db/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
  });

  it('supports exec, prepare, bind, run, first and all', async () => {
    const insertStmt = db
      .prepare('INSERT INTO estudiantes (id, email, nombre, rol, nivel_acceso, creado_en) VALUES (?, ?, ?, ?, ?, ?)')
      .bind('est-1', 'maria@ejemplo.com', 'María Gómez', 'estudiante', 'ruta_abierta', '2026-10-04T12:00:00Z');

    const result = await insertStmt.run();
    expect(result.success).toBe(true);
    expect(result.meta.changes).toBe(1);

    const first = await db
      .prepare('SELECT * FROM estudiantes WHERE email = ?')
      .bind('maria@ejemplo.com')
      .first<{ id: string; email: string; nombre: string }>();

    expect(first).not.toBeNull();
    expect(first?.id).toBe('est-1');
    expect(first?.nombre).toBe('María Gómez');

    const all = await db
      .prepare('SELECT * FROM estudiantes')
      .all<{ id: string }>();

    expect(all.success).toBe(true);
    expect(all.results.length).toBe(1);
    expect(all.results[0].id).toBe('est-1');
  });

  it('first returns single column value if column name is provided', async () => {
    await db
      .prepare('INSERT INTO estudiantes (id, email, nombre, rol, nivel_acceso, creado_en) VALUES (?, ?, ?, ?, ?, ?)')
      .bind('est-2', 'juan@ejemplo.com', 'Juan Pérez', 'estudiante', 'ruta_abierta', '2026-10-04T12:00:00Z')
      .run();

    const nombre = await db
      .prepare('SELECT nombre FROM estudiantes WHERE id = ?')
      .bind('est-2')
      .first<string>('nombre');

    expect(nombre).toBe('Juan Pérez');
  });

  it('first returns null if no record found', async () => {
    const nonExistent = await db
      .prepare('SELECT * FROM estudiantes WHERE email = ?')
      .bind('inexistente@ejemplo.com')
      .first();

    expect(nonExistent).toBeNull();
  });
});
