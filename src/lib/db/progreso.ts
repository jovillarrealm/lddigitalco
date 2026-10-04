import type { D1Database, Progreso } from './types';

/**
 * Marca una microcápsula como completada de forma idempotente para un estudiante.
 * Si ya estaba marcada, actualiza el timestamp `completado_en`.
 */
export async function markComplete(
  db: D1Database,
  estudianteId: string,
  microcapsulaSlug: string
): Promise<Progreso> {
  const completadoEn = new Date().toISOString();

  await db
    .prepare(`
      INSERT INTO progreso (estudiante_id, microcapsula_slug, completado_en)
      VALUES (?, ?, ?)
      ON CONFLICT(estudiante_id, microcapsula_slug)
      DO UPDATE SET completado_en = excluded.completado_en
    `)
    .bind(estudianteId, microcapsulaSlug, completadoEn)
    .run();

  const record = await db
    .prepare(`
      SELECT id, estudiante_id, microcapsula_slug, completado_en
      FROM progreso
      WHERE estudiante_id = ? AND microcapsula_slug = ?
    `)
    .bind(estudianteId, microcapsulaSlug)
    .first<Progreso>();

  if (!record) {
    throw new Error('Error al registrar el progreso formativo.');
  }

  return record;
}

/**
 * Desmarca una microcápsula previamente completada.
 * Retorna true si se eliminó un registro, false si no existía.
 */
export async function unmarkComplete(
  db: D1Database,
  estudianteId: string,
  microcapsulaSlug: string
): Promise<boolean> {
  const result = await db
    .prepare(`
      DELETE FROM progreso
      WHERE estudiante_id = ? AND microcapsula_slug = ?
    `)
    .bind(estudianteId, microcapsulaSlug)
    .run();

  return (result.meta?.changes ?? 0) > 0;
}

/**
 * Obtiene todos los registros de microcápsulas completadas por un estudiante.
 */
export async function getProgressByStudent(
  db: D1Database,
  estudianteId: string
): Promise<Progreso[]> {
  const result = await db
    .prepare(`
      SELECT id, estudiante_id, microcapsula_slug, completado_en
      FROM progreso
      WHERE estudiante_id = ?
      ORDER BY completado_en ASC
    `)
    .bind(estudianteId)
    .all<Progreso>();

  return result.results || [];
}

/**
 * Verifica si una microcápsula específica ha sido completada por el estudiante.
 */
export async function isCapsuleCompleted(
  db: D1Database,
  estudianteId: string,
  microcapsulaSlug: string
): Promise<boolean> {
  const record = await db
    .prepare(`
      SELECT id FROM progreso
      WHERE estudiante_id = ? AND microcapsula_slug = ?
      LIMIT 1
    `)
    .bind(estudianteId, microcapsulaSlug)
    .first<{ id: number }>();

  return record !== null;
}
