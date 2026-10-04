import type { D1Database, Estudiante } from './types';

export interface CreateStudentInput {
  email: string;
  nombre?: string;
  rol?: 'estudiante' | 'tutor' | 'admin';
  nivel_acceso?: 'ruta_abierta' | 'inscripcion_completa';
}

export async function getStudentByEmail(
  db: D1Database,
  email: string
): Promise<Estudiante | null> {
  const normalizedEmail = email.trim().toLowerCase();
  return db
    .prepare('SELECT id, email, nombre, rol, nivel_acceso, creado_en FROM estudiantes WHERE email = ?')
    .bind(normalizedEmail)
    .first<Estudiante>();
}

export async function getStudentById(
  db: D1Database,
  id: string
): Promise<Estudiante | null> {
  return db
    .prepare('SELECT id, email, nombre, rol, nivel_acceso, creado_en FROM estudiantes WHERE id = ?')
    .bind(id)
    .first<Estudiante>();
}

export async function findOrCreateStudent(
  db: D1Database,
  input: CreateStudentInput
): Promise<Estudiante> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = await getStudentByEmail(db, normalizedEmail);
  if (existing) {
    return existing;
  }

  const id = crypto.randomUUID();
  const nombre = input.nombre?.trim() || normalizedEmail.split('@')[0];
  const rol = input.rol || 'estudiante';
  const nivelAcceso = input.nivel_acceso || 'ruta_abierta';
  const creadoEn = new Date().toISOString();

  await db
    .prepare(
      'INSERT INTO estudiantes (id, email, nombre, rol, nivel_acceso, creado_en) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .bind(id, normalizedEmail, nombre, rol, nivelAcceso, creadoEn)
    .run();

  return {
    id,
    email: normalizedEmail,
    nombre,
    rol,
    nivel_acceso: nivelAcceso,
    creado_en: creadoEn,
  };
}

export async function upgradeStudentAccess(
  db: D1Database,
  email: string,
  nivelAcceso: 'ruta_abierta' | 'inscripcion_completa'
): Promise<Estudiante | null> {
  const normalizedEmail = email.trim().toLowerCase();
  await db
    .prepare('UPDATE estudiantes SET nivel_acceso = ? WHERE email = ?')
    .bind(nivelAcceso, normalizedEmail)
    .run();
  return getStudentByEmail(db, normalizedEmail);
}

export async function getAllStudents(
  db: D1Database,
  limit = 100
): Promise<Estudiante[]> {
  const result = await db
    .prepare('SELECT id, email, nombre, rol, nivel_acceso, creado_en FROM estudiantes ORDER BY creado_en DESC LIMIT ?')
    .bind(limit)
    .all<Estudiante>();
  return result.results || [];
}


