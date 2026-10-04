import { describe, it, expect, beforeEach } from 'vitest';
import { createInMemoryD1 } from '../src/lib/db/d1-memory';
import { findOrCreateStudent } from '../src/lib/db/estudiantes';
import {
  markComplete,
  unmarkComplete,
  getProgressByStudent,
  isCapsuleCompleted,
} from '../src/lib/db/progreso';
import fs from 'node:fs';
import path from 'node:path';

describe('Progreso Repository (D1)', () => {
  let db: ReturnType<typeof createInMemoryD1>;
  let studentId: string;

  beforeEach(async () => {
    db = createInMemoryD1();
    const schema = fs.readFileSync(path.resolve(__dirname, '../db/schema.sql'), 'utf-8');
    db.exec(schema);

    const student = await findOrCreateStudent(db, {
      email: 'alumno.test@lddigital.co',
      nombre: 'Alumno Test',
    });
    studentId = student.id;
  });

  it('marks a microcapsule as complete and returns record', async () => {
    const record = await markComplete(db, studentId, 'ciberseguridad-whatsapp-01');

    expect(record).toBeDefined();
    expect(record.estudiante_id).toBe(studentId);
    expect(record.microcapsula_slug).toBe('ciberseguridad-whatsapp-01');
    expect(record.completado_en).toBeDefined();

    const isDone = await isCapsuleCompleted(db, studentId, 'ciberseguridad-whatsapp-01');
    expect(isDone).toBe(true);
  });

  it('is idempotent: calling markComplete twice updates timestamp without throwing error', async () => {
    await markComplete(db, studentId, 'capsula-repetida');
    const second = await markComplete(db, studentId, 'capsula-repetida');

    expect(second.microcapsula_slug).toBe('capsula-repetida');

    const progress = await getProgressByStudent(db, studentId);
    const duplicates = progress.filter((p) => p.microcapsula_slug === 'capsula-repetida');
    expect(duplicates.length).toBe(1);
  });

  it('unmarks a completed microcapsule', async () => {
    await markComplete(db, studentId, 'capsula-a-desmarcar');
    expect(await isCapsuleCompleted(db, studentId, 'capsula-a-desmarcar')).toBe(true);

    const unmarkResult = await unmarkComplete(db, studentId, 'capsula-a-desmarcar');
    expect(unmarkResult).toBe(true);

    expect(await isCapsuleCompleted(db, studentId, 'capsula-a-desmarcar')).toBe(false);
  });

  it('unmarkComplete on non-existent record returns false without throwing', async () => {
    const result = await unmarkComplete(db, studentId, 'nunca-completada');
    expect(result).toBe(false);
  });

  it('getProgressByStudent returns all completed capsules for student', async () => {
    await markComplete(db, studentId, 'capsula-1');
    await markComplete(db, studentId, 'capsula-2');

    const progress = await getProgressByStudent(db, studentId);
    expect(progress.length).toBe(2);
    const slugs = progress.map((p) => p.microcapsula_slug);
    expect(slugs).toContain('capsula-1');
    expect(slugs).toContain('capsula-2');
  });

  it('isCapsuleCompleted returns false for non-completed capsules', async () => {
    const isDone = await isCapsuleCompleted(db, studentId, 'capsula-inexistente');
    expect(isDone).toBe(false);
  });
});
