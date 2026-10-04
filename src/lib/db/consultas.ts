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

export interface ConsultaConEstudiante extends Consulta {
  estudiante_nombre?: string;
  estudiante_email?: string;
}

/**
 * Obtiene todas las consultas registradas en el sistema para el panel de administración.
 */
export async function getAllConsultas(
  db: D1Database,
  limit = 100
): Promise<ConsultaConEstudiante[]> {
  const result = await db
    .prepare(`
      SELECT c.id, c.estudiante_id, c.microcapsula_slug, c.mensaje, c.estado, c.creado_en,
             e.nombre as estudiante_nombre, e.email as estudiante_email
      FROM consultas c
      LEFT JOIN estudiantes e ON c.estudiante_id = e.id
      ORDER BY c.creado_en DESC
      LIMIT ?
    `)
    .bind(limit)
    .all<ConsultaConEstudiante>();

  return result.results || [];
}

/**
 * Actualiza el estado formativo de una consulta (pendiente / respondida).
 */
export async function updateConsultaEstado(
  db: D1Database,
  id: string,
  estado: 'pendiente' | 'respondida'
): Promise<boolean> {
  await db
    .prepare(`UPDATE consultas SET estado = ? WHERE id = ?`)
    .bind(estado, id)
    .run();
  return true;
}

