import { describe, it, expect, beforeEach } from 'vitest';
import { createInMemoryD1 } from '../src/lib/db/d1-memory';
import { findOrCreateStudent } from '../src/lib/db/estudiantes';
import {
  ProgresoFormativo,
  ProgresoAccesoDenegadoError,
  ProgresoRutaNoEncontradaError,
  ProgresoValidacionError,
} from '../src/lib/courses/progreso-formativo';
import fs from 'node:fs';
import path from 'node:path';

describe('ProgresoFormativo Deep Module', () => {
  let db: ReturnType<typeof createInMemoryD1>;
  let progreso: ProgresoFormativo;
  let fullStudent: any;
  let openStudent: any;

  beforeEach(async () => {
    db = createInMemoryD1();
    const schema = fs.readFileSync(path.resolve(__dirname, '../db/schema.sql'), 'utf-8');
    db.exec(schema);

    progreso = new ProgresoFormativo(db);

    fullStudent = await findOrCreateStudent(db, {
      email: 'rosa.completa@ejemplo.com',
      nombre: 'Rosa Completa',
      nivel_acceso: 'inscripcion_completa',
    });

    openStudent = await findOrCreateStudent(db, {
      email: 'carlos.abierto@ejemplo.com',
      nombre: 'Carlos Abierto',
      nivel_acceso: 'ruta_abierta',
    });
  });

  it('allows open track student to view open route and records progress', async () => {
    const summary = await progreso.consultarProgreso(openStudent, 'ciberseguridad-whatsapp');
    expect(summary.total).toBe(4);
    expect(summary.completadas).toBe(0);
    expect(summary.porcentaje).toBe(0);

    const update = await progreso.registrarCompletitud(openStudent, {
      microcapsulaSlug: 'configurar-celular-vista',
    });

    expect(update.completado).toBe(true);
    expect(update.progreso.completadas).toBe(1);
    expect(update.progreso.porcentaje).toBe(25);

    const updatedSummary = await progreso.consultarProgreso(openStudent, 'ciberseguridad-whatsapp');
    expect(updatedSummary.completadas).toBe(1);
    expect(updatedSummary.porcentaje).toBe(25);
    expect(updatedSummary.completadasSlugs).toContain('configurar-celular-vista');
  });

  it('blocks open track student from restricted route throwing ProgresoAccesoDenegadoError', async () => {
    await expect(
      progreso.consultarProgreso(openStudent, 'banca-movil-segura')
    ).rejects.toThrow(ProgresoAccesoDenegadoError);

    await expect(
      progreso.registrarCompletitud(openStudent, {
        microcapsulaSlug: 'ingreso-seguro-clave-dinamica',
        rutaSlug: 'banca-movil-segura',
      })
    ).rejects.toThrow(ProgresoAccesoDenegadoError);
  });

  it('allows inscripcion_completa student full access to restricted route', async () => {
    const summary = await progreso.consultarProgreso(fullStudent, 'banca-movil-segura');
    expect(summary.total).toBe(3);
    expect(summary.completadas).toBe(0);

    const update = await progreso.registrarCompletitud(fullStudent, {
      microcapsulaSlug: 'ingreso-seguro-clave-dinamica',
      rutaSlug: 'banca-movil-segura',
    });
    expect(update.completado).toBe(true);
    expect(update.progreso.completadas).toBe(1);
  });

  it('throws ProgresoRutaNoEncontradaError for nonexistent route', async () => {
    await expect(
      progreso.consultarProgreso(fullStudent, 'ruta-fantasma-no-existe')
    ).rejects.toThrow(ProgresoRutaNoEncontradaError);
  });

  it('validates microcapsulaSlug input throwing ProgresoValidacionError', async () => {
    await expect(
      progreso.registrarCompletitud(fullStudent, { microcapsulaSlug: '' })
    ).rejects.toThrow(ProgresoValidacionError);
  });

  it('unmarks capsule when completado is false', async () => {
    await progreso.registrarCompletitud(fullStudent, {
      microcapsulaSlug: 'configurar-celular-vista',
      completado: true,
    });

    const unmark = await progreso.registrarCompletitud(fullStudent, {
      microcapsulaSlug: 'configurar-celular-vista',
      completado: false,
    });

    expect(unmark.completado).toBe(false);
    expect(unmark.progreso.completadas).toBe(0);
    expect(unmark.progreso.porcentaje).toBe(0);
  });
});
