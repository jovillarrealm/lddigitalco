import { describe, it, expect, beforeEach } from 'vitest';
import { createInMemoryD1 } from '../src/lib/db/d1-memory';
import { findOrCreateStudent } from '../src/lib/db/estudiantes';
import {
  createConsulta,
  getConsultasByEstudiante,
  getConsultaById,
} from '../src/lib/db/consultas';
import fs from 'node:fs';
import path from 'node:path';

describe('Consultas Repository', () => {
  let db: ReturnType<typeof createInMemoryD1>;
  let student: any;

  beforeEach(async () => {
    db = createInMemoryD1();
    const schema = fs.readFileSync(path.resolve(__dirname, '../db/schema.sql'), 'utf-8');
    db.exec(schema);

    student = await findOrCreateStudent(db, {
      email: 'estudiante.dudas@ejemplo.com',
      nombre: 'Elena Duda',
    });
  });

  it('creates a new consulta with initial status "pendiente"', async () => {
    const consulta = await createConsulta(db, {
      estudianteId: student.id,
      microcapsulaSlug: 'identificar-estafas-whatsapp',
      mensaje: '¿Cómo distingo si el mensaje sospechoso es de mi banco o una suplantación?',
    });

    expect(consulta.id).toBeDefined();
    expect(consulta.estudiante_id).toBe(student.id);
    expect(consulta.microcapsula_slug).toBe('identificar-estafas-whatsapp');
    expect(consulta.mensaje).toBe('¿Cómo distingo si el mensaje sospechoso es de mi banco o una suplantación?');
    expect(consulta.estado).toBe('pendiente');
    expect(consulta.creado_en).toBeDefined();

    // Verify it is retrievable by ID
    const retrieved = await getConsultaById(db, consulta.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(consulta.id);
    expect(retrieved?.mensaje).toBe(consulta.mensaje);
    expect(retrieved?.estado).toBe('pendiente');
  });

  it('retrieves all consultas for a specific student', async () => {
    await createConsulta(db, {
      estudianteId: student.id,
      microcapsulaSlug: 'configurar-celular-vista',
      mensaje: '¿En qué menú de Android encuentro el tamaño de fuente?',
    });

    await createConsulta(db, {
      estudianteId: student.id,
      microcapsulaSlug: 'notas-voz-fotos-whatsapp',
      mensaje: '¿Por qué cuando deslizo el candado a veces se me cancela el audio?',
    });

    const consultas = await getConsultasByEstudiante(db, student.id);
    expect(consultas.length).toBe(2);
    expect(consultas.map((c) => c.microcapsula_slug)).toEqual([
      'configurar-celular-vista',
      'notas-voz-fotos-whatsapp',
    ]);
  });

  it('returns empty array when student has no consultas', async () => {
    const otherStudent = await findOrCreateStudent(db, {
      email: 'otro.alumno@ejemplo.com',
      nombre: 'Otro Alumno',
    });

    const consultas = await getConsultasByEstudiante(db, otherStudent.id);
    expect(consultas).toEqual([]);
  });

  it('returns null when querying nonexistent consulta id', async () => {
    const result = await getConsultaById(db, 'nonexistent-id');
    expect(result).toBeNull();
  });
});
