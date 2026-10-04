import type { D1Database, Consulta } from './types';

export interface CreateConsultaInput {
  estudianteId: string;
  microcapsulaSlug: string;
  mensaje: string;
  id?: string;
}

/**
 * Crea y almacena una consulta formativa de un estudiante para el tutor.
 */
export async function createConsulta(
  db: D1Database,
  input: CreateConsultaInput
): Promise<Consulta> {
  const id = input.id || crypto.randomUUID();
  const estudianteId = input.estudianteId.trim();
  const microcapsulaSlug = input.microcapsulaSlug.trim();
  const mensaje = input.mensaje.trim();
  const estado = 'pendiente';
  const creadoEn = new Date().toISOString();

  await db
    .prepare(`
      INSERT INTO consultas (id, estudiante_id, microcapsula_slug, mensaje, estado, creado_en)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .bind(id, estudianteId, microcapsulaSlug, mensaje, estado, creadoEn)
    .run();

  const record: Consulta = {
    id,
    estudiante_id: estudianteId,
    microcapsula_slug: microcapsulaSlug,
    mensaje,
    estado,
    creado_en: creadoEn,
  };

  return record;
}

/**
 * Obtiene todas las consultas realizadas por un estudiante, ordenadas cronológicamente.
 */
export async function getConsultasByEstudiante(
  db: D1Database,
  estudianteId: string
): Promise<Consulta[]> {
  const result = await db
    .prepare(`
      SELECT id, estudiante_id, microcapsula_slug, mensaje, estado, creado_en
      FROM consultas
      WHERE estudiante_id = ?
      ORDER BY creado_en ASC
    `)
    .bind(estudianteId)
    .all<Consulta>();

  return result.results || [];
}

/**
 * Obtiene una consulta por su identificador único.
 */
export async function getConsultaById(
  db: D1Database,
  id: string
): Promise<Consulta | null> {
  const record = await db
    .prepare(`
      SELECT id, estudiante_id, microcapsula_slug, mensaje, estado, creado_en
      FROM consultas
      WHERE id = ?
      LIMIT 1
    `)
    .bind(id)
    .first<Consulta>();

  return record ?? null;
}
