import { describe, it, expect, beforeEach } from 'vitest';
import { createInMemoryD1 } from '../src/lib/db/d1-memory';
import { findOrCreateStudent } from '../src/lib/db/estudiantes';
import { FakeEmailService } from '../src/lib/email/fake-email-service';
import { NotificadorFormativo } from '../src/lib/email/notificador-formativo';
import {
  ConsultaFormativaService,
  ConsultaAccesoDenegadoError,
  ConsultaValidacionError,
  ConsultaNoEncontradaError,
} from '../src/lib/consultas';
import fs from 'node:fs';
import path from 'node:path';

describe('ConsultaFormativaService Deep Module', () => {
  let db: ReturnType<typeof createInMemoryD1>;
  let fakeTransport: FakeEmailService;
  let notificador: NotificadorFormativo;
  let service: ConsultaFormativaService;
  let fullStudent: any;
  let openStudent: any;

  beforeEach(async () => {
    db = createInMemoryD1();
    const schema = fs.readFileSync(path.resolve(__dirname, '../db/schema.sql'), 'utf-8');
    db.exec(schema);

    fakeTransport = new FakeEmailService();
    notificador = new NotificadorFormativo(fakeTransport);
    service = new ConsultaFormativaService(db, notificador, 'tutor.lms@lddigital.co');

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

  it('blocks student with ruta_abierta throwing ConsultaAccesoDenegadoError', async () => {
    await expect(
      service.enviarConsulta({
        student: openStudent,
        microcapsulaSlug: 'identificar-estafas-whatsapp',
        mensaje: '¿Cómo protejo mi cuenta?',
      })
    ).rejects.toThrow(ConsultaAccesoDenegadoError);
  });

  it('validates empty microcapsulaSlug and empty mensaje with ConsultaValidacionError', async () => {
    await expect(
      service.enviarConsulta({
        student: fullStudent,
        microcapsulaSlug: '',
        mensaje: '¿Cómo protejo mi cuenta?',
      })
    ).rejects.toThrow(ConsultaValidacionError);

    await expect(
      service.enviarConsulta({
        student: fullStudent,
        microcapsulaSlug: 'identificar-estafas-whatsapp',
        mensaje: '    ',
      })
    ).rejects.toThrow(ConsultaValidacionError);
  });

  it('persists consulta in D1, dispatches email to tutor and returns friendly confirmation', async () => {
    const result = await service.enviarConsulta({
      student: fullStudent,
      microcapsulaSlug: 'identificar-estafas-whatsapp',
      mensaje: '¿Debo contestar llamadas de números internacionales desconocidos?',
    });

    expect(result.consultaId).toBeDefined();
    expect(result.mensaje).toContain('Tu duda ha sido recibida por tu tutor de LDDIGITALCO');

    // Email dispatched
    expect(fakeTransport.outbox.length).toBe(1);
    const email = fakeTransport.outbox[0];
    expect(email.to).toBe('tutor.lms@lddigital.co');
    expect(email.subject).toContain('Rosa Completa');

    // Database listing
    const studentConsultas = await service.listarPorEstudiante(fullStudent.id);
    expect(studentConsultas.length).toBe(1);
    expect(studentConsultas[0].id).toBe(result.consultaId);
    expect(studentConsultas[0].estado).toBe('pendiente');
  });

  it('cambiarEstado transitions consulta to respondida or rejects invalid state', async () => {
    const created = await service.enviarConsulta({
      student: fullStudent,
      microcapsulaSlug: 'configurar-celular-vista',
      mensaje: '¿Cómo aumento el contraste en la pantalla?',
    });

    const updated = await service.cambiarEstado(created.consultaId, 'respondida');
    expect(updated.estado).toBe('respondida');

    // Reject non-existent consulta
    await expect(service.cambiarEstado('non-existent-id', 'respondida')).rejects.toThrow(
      ConsultaNoEncontradaError
    );

    // Reject invalid status
    await expect(service.cambiarEstado(created.consultaId, 'invalido' as any)).rejects.toThrow(
      ConsultaValidacionError
    );
  });
});
