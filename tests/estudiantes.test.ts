import { describe, it, expect, beforeEach } from 'vitest';
import { createInMemoryD1 } from '../src/lib/db/d1-memory';
import {
  findOrCreateStudent,
  getStudentByEmail,
  getStudentById,
} from '../src/lib/db/estudiantes';
import fs from 'node:fs';
import path from 'node:path';

describe('Estudiantes Repository', () => {
  let db: ReturnType<typeof createInMemoryD1>;

  beforeEach(() => {
    db = createInMemoryD1();
    const schema = fs.readFileSync(path.resolve(__dirname, '../db/schema.sql'), 'utf-8');
    db.exec(schema);
  });

  it('creates new student with default ruta_abierta and estudiante role', async () => {
    const student = await findOrCreateStudent(db, {
      email: 'Carlos.Perez@EJEMPLO.com',
      nombre: 'Carlos Pérez',
    });

    expect(student.id).toBeDefined();
    expect(student.email).toBe('carlos.perez@ejemplo.com');
    expect(student.nombre).toBe('Carlos Pérez');
    expect(student.rol).toBe('estudiante');
    expect(student.nivel_acceso).toBe('ruta_abierta');
    expect(student.creado_en).toBeDefined();

    // Verify it was stored in db
    const found = await getStudentByEmail(db, 'carlos.perez@ejemplo.com');
    expect(found).not.toBeNull();
    expect(found?.id).toBe(student.id);
  });

  it('uses email prefix as nombre if nombre is not provided', async () => {
    const student = await findOrCreateStudent(db, {
      email: 'rosa.maria@correo.com',
    });

    expect(student.nombre).toBe('rosa.maria');
  });

  it('returns existing student without creating duplicate when called again', async () => {
    const student1 = await findOrCreateStudent(db, {
      email: 'ana@ejemplo.com',
      nombre: 'Ana López',
    });

    const student2 = await findOrCreateStudent(db, {
      email: 'ANA@ejemplo.com',
      nombre: 'Ana Cambiada',
    });

    expect(student2.id).toBe(student1.id);
    expect(student2.nombre).toBe('Ana López'); // keeps original
  });

  it('finds student by id', async () => {
    const created = await findOrCreateStudent(db, {
      email: 'pedro@ejemplo.com',
      nombre: 'Pedro Pascal',
    });

    const found = await getStudentById(db, created.id);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(created.id);
    expect(found?.email).toBe('pedro@ejemplo.com');
  });

  it('returns null for nonexistent student id or email', async () => {
    expect(await getStudentById(db, 'nonexistent')).toBeNull();
    expect(await getStudentByEmail(db, 'nonexistent@ejemplo.com')).toBeNull();
  });
});
