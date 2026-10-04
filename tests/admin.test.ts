import { describe, it, expect, beforeEach } from 'vitest';
import { createInMemoryD1 } from '../src/lib/db/d1-memory';
import { findOrCreateStudent, getAllStudents } from '../src/lib/db/estudiantes';
import { createConsulta, getAllConsultas, updateConsultaEstado } from '../src/lib/db/consultas';
import { GET as handleAdminOverview } from '../src/pages/api/admin/overview';
import { POST as handleLiveSessionUpdate } from '../src/pages/api/admin/live-session';
import { POST as handleConsultaStatusUpdate } from '../src/pages/api/admin/consultas/status';
import { updateConfiguredLiveSession, getConfiguredLiveSession } from '../src/lib/courses/live-session';
import type { D1Database } from '../src/lib/db/types';

describe('Admin Panel API & Services', () => {
  let db: D1Database;

  beforeEach(() => {
    db = createInMemoryD1();
    db.exec(`
      CREATE TABLE IF NOT EXISTS estudiantes (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        nombre TEXT NOT NULL,
        rol TEXT NOT NULL DEFAULT 'estudiante',
        nivel_acceso TEXT NOT NULL DEFAULT 'ruta_abierta',
        creado_en TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS consultas (
        id TEXT PRIMARY KEY,
        estudiante_id TEXT NOT NULL,
        microcapsula_slug TEXT NOT NULL,
        mensaje TEXT NOT NULL,
        estado TEXT NOT NULL DEFAULT 'pendiente',
        creado_en TEXT NOT NULL
      );
    `);
  });

  it('retrieves all students and allows administrative queries', async () => {
    await findOrCreateStudent(db, { email: 'student1@test.com', nombre: 'Student One', nivel_acceso: 'ruta_abierta' });
    await findOrCreateStudent(db, { email: 'student2@test.com', nombre: 'Student Two', nivel_acceso: 'inscripcion_completa' });

    const all = await getAllStudents(db);
    expect(all.length).toBe(2);
    expect(all.some(s => s.email === 'student1@test.com')).toBe(true);
    expect(all.some(s => s.email === 'student2@test.com')).toBe(true);
  });

  it('retrieves all consultas and updates consulta status', async () => {
    const student = await findOrCreateStudent(db, { email: 'senior@test.com', nombre: 'Senior Test' });
    const consulta = await createConsulta(db, {
      estudianteId: student.id,
      microcapsulaSlug: 'que-es-whatsapp',
      mensaje: '¿Cómo adjunto fotos en un mensaje?',
    });

    const all = await getAllConsultas(db);
    expect(all.length).toBe(1);
    expect(all[0].mensaje).toBe('¿Cómo adjunto fotos en un mensaje?');
    expect(all[0].estado).toBe('pendiente');

    await updateConsultaEstado(db, consulta.id, 'respondida');
    const updatedAll = await getAllConsultas(db);
    expect(updatedAll[0].estado).toBe('respondida');
  });

  it('updates live session in memory dynamically', () => {
    const original = getConfiguredLiveSession();
    expect(original.title).toBeDefined();

    updateConfiguredLiveSession({
      title: 'Taller Especial: Bancos Móviles y Pagos Seguros',
      durationMinutes: 90,
      meetUrl: 'https://meet.google.com/test-admin-url',
    });

    const updated = getConfiguredLiveSession();
    expect(updated.title).toBe('Taller Especial: Bancos Móviles y Pagos Seguros');
    expect(updated.durationMinutes).toBe(90);
    expect(updated.meetUrl).toBe('https://meet.google.com/test-admin-url');
  });

  it('rejects unauthorized access to /api/admin/overview', async () => {
    const context: any = {
      request: new Request('http://localhost:4321/api/admin/overview', {
        headers: {},
      }),
      locals: { runtime: { env: { DB: db, ADMIN_KEY: 'secret-admin' } } },
      url: new URL('http://localhost:4321/api/admin/overview'),
    };

    const res = await handleAdminOverview(context);
    expect(res.status).toBe(401);
  });

  it('allows authorized access to /api/admin/overview with x-admin-key', async () => {
    const context: any = {
      request: new Request('http://localhost:4321/api/admin/overview', {
        headers: { 'x-admin-key': 'secret-admin' },
      }),
      locals: { runtime: { env: { DB: db, ADMIN_KEY: 'secret-admin' } } },
      url: new URL('http://localhost:4321/api/admin/overview'),
    };

    const res = await handleAdminOverview(context);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.diagnostics).toBeDefined();
    expect(data.stats).toBeDefined();
    expect(Array.isArray(data.students)).toBe(true);
    expect(Array.isArray(data.consultas)).toBe(true);
  });

  it('updates live session via POST /api/admin/live-session with admin key', async () => {
    const context: any = {
      request: new Request('http://localhost:4321/api/admin/live-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': 'secret-admin',
        },
        body: JSON.stringify({
          title: 'Clase de Repaso de Seguridad',
          durationMinutes: 75,
        }),
      }),
      locals: { runtime: { env: { ADMIN_KEY: 'secret-admin' } } },
    };

    const res = await handleLiveSessionUpdate(context);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.session.title).toBe('Clase de Repaso de Seguridad');
    expect(data.session.durationMinutes).toBe(75);
  });

  it('updates student doubt status via POST /api/admin/consultas/status', async () => {
    const student = await findOrCreateStudent(db, { email: 'duda@test.com', nombre: 'Duda User' });
    const consulta = await createConsulta(db, {
      estudianteId: student.id,
      microcapsulaSlug: 'seguridad-passwords',
      mensaje: '¿Dónde anoto mis claves?',
    });

    const context: any = {
      request: new Request('http://localhost:4321/api/admin/consultas/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': 'secret-admin',
        },
        body: JSON.stringify({
          consultaId: consulta.id,
          estado: 'respondida',
        }),
      }),
      locals: { runtime: { env: { DB: db, ADMIN_KEY: 'secret-admin' } } },
    };

    const res = await handleConsultaStatusUpdate(context);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.estado).toBe('respondida');
  });
});
