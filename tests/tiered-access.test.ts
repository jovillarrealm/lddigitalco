import { describe, it, expect, beforeEach } from 'vitest';
import { createInMemoryD1 } from '../src/lib/db/d1-memory';
import { findOrCreateStudent, upgradeStudentAccess, getStudentByEmail } from '../src/lib/db/estudiantes';
import { createSessionToken } from '../src/lib/auth/crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { APIContext } from 'astro';

import { POST as handleRegisterOpenTrack } from '../src/pages/api/auth/register-open-track';
import { POST as handleUpgradeStudent } from '../src/pages/api/students/upgrade';
import { GET as handleGetProgress, POST as handlePostProgress } from '../src/pages/api/progress';

describe('Tiered Access Control (Issue #6: Ruta Abierta vs. Inscripción Completa)', () => {
  let db: ReturnType<typeof createInMemoryD1>;
  const secret = 'super-secret-key-for-tiered-access-testing-32-chars';
  const origin = 'http://localhost:4321';

  beforeEach(() => {
    db = createInMemoryD1();
    const schema = fs.readFileSync(path.resolve(__dirname, '../db/schema.sql'), 'utf-8');
    db.exec(schema);
  });

  function createMockContext(
    urlStr: string,
    method: string = 'GET',
    body?: any,
    headers: Record<string, string> = {}
  ): APIContext {
    const url = new URL(urlStr);
    const reqHeaders = new Headers(headers);
    let reqBody: string | undefined = undefined;

    if (body) {
      if (typeof body === 'string') {
        reqBody = body;
      } else {
        reqHeaders.set('content-type', 'application/json');
        reqBody = JSON.stringify(body);
      }
    }

    const request = new Request(urlStr, {
      method,
      headers: reqHeaders,
      body: reqBody,
    });

    return {
      request,
      url,
      params: {},
      props: {},
      redirect: (path: string, status: number = 302) => {
        return new Response(null, {
          status,
          headers: { Location: path },
        });
      },
      locals: {
        runtime: {
          env: {
            DB: db,
            AUTH_SECRET: secret,
            RESEND_API_KEY: '',
            APP_URL: origin,
          },
        },
      } as any,
      site: undefined,
      generator: 'test',
      clientAddress: '127.0.0.1',
      cookies: {} as any,
    } as unknown as APIContext;
  }

  describe('Part 1: Auto-registro a la Ruta Abierta (/api/auth/register-open-track)', () => {
    it('registers senior student with nivel_acceso: ruta_abierta and sends welcome magic link', async () => {
      const ctx = createMockContext(
        `${origin}/api/auth/register-open-track`,
        'POST',
        {
          email: 'abuela.maria@ejemplo.com',
          nombre: 'María Gómez',
        }
      );

      const res = await handleRegisterOpenTrack(ctx);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe(
        '¡Bienvenido a la Ruta Abierta! Te enviamos tu enlace de acceso a tu correo. Revisa tu bandeja de entrada para ingresar sin contraseña.'
      );

      // Verify student in database
      const student = await getStudentByEmail(db, 'abuela.maria@ejemplo.com');
      expect(student).not.toBeNull();
      expect(student?.nombre).toBe('María Gómez');
      expect(student?.nivel_acceso).toBe('ruta_abierta');
      expect(student?.rol).toBe('estudiante');
    });

    it('rejects registration with invalid email with 400', async () => {
      const ctx = createMockContext(
        `${origin}/api/auth/register-open-track`,
        'POST',
        { email: 'correo-invalido-sin-arroba' }
      );

      const res = await handleRegisterOpenTrack(ctx);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  describe('Part 2: Control de Acceso Escalonado en el LMS (/api/progress)', () => {
    it('allows student with ruta_abierta to access and record progress on ruta_abierta', async () => {
      const student = await findOrCreateStudent(db, {
        email: 'alumno.abierto@ejemplo.com',
        nombre: 'Alumno Abierto',
        nivel_acceso: 'ruta_abierta',
      });

      const token = await createSessionToken(student, secret);
      const sessionCookie = `lms_session=${token}`;

      // GET open route progress
      const ctxGet = createMockContext(
        `${origin}/api/progress?ruta=ciberseguridad-whatsapp`,
        'GET',
        undefined,
        { cookie: sessionCookie }
      );
      const resGet = await handleGetProgress(ctxGet);
      expect(resGet.status).toBe(200);
      const dataGet = await resGet.json();
      expect(dataGet.success).toBe(true);
      expect(dataGet.ruta).toBe('ciberseguridad-whatsapp');

      // POST mark complete on open route
      const ctxPost = createMockContext(
        `${origin}/api/progress`,
        'POST',
        {
          microcapsulaSlug: 'configurar-celular-vista',
          rutaSlug: 'ciberseguridad-whatsapp',
          completado: true,
        },
        { cookie: sessionCookie }
      );
      const resPost = await handlePostProgress(ctxPost);
      expect(resPost.status).toBe(200);
      const dataPost = await resPost.json();
      expect(dataPost.success).toBe(true);
      expect(dataPost.completado).toBe(true);
    });

    it('blocks student with ruta_abierta with 403 Forbidden when requesting restricted route', async () => {
      const student = await findOrCreateStudent(db, {
        email: 'alumno.restringido@ejemplo.com',
        nombre: 'Alumno Restringido',
        nivel_acceso: 'ruta_abierta',
      });

      const token = await createSessionToken(student, secret);
      const sessionCookie = `lms_session=${token}`;

      // GET restricted route progress (banca-movil-segura)
      const ctxGet = createMockContext(
        `${origin}/api/progress?ruta=banca-movil-segura`,
        'GET',
        undefined,
        { cookie: sessionCookie }
      );
      const resGet = await handleGetProgress(ctxGet);
      expect(resGet.status).toBe(403);
      const dataGet = await resGet.json();
      expect(dataGet.error).toBe('requires_inscripcion_completa');
      expect(dataGet.message).toBe('Esta ruta requiere Inscripción Completa.');

      // POST mark complete on restricted route
      const ctxPost = createMockContext(
        `${origin}/api/progress`,
        'POST',
        {
          microcapsulaSlug: 'ingreso-seguro-clave-dinamica',
          rutaSlug: 'banca-movil-segura',
          completado: true,
        },
        { cookie: sessionCookie }
      );
      const resPost = await handlePostProgress(ctxPost);
      expect(resPost.status).toBe(403);
      const dataPost = await resPost.json();
      expect(dataPost.error).toBe('requires_inscripcion_completa');
      expect(dataPost.message).toBe('Esta ruta requiere Inscripción Completa.');
    });

    it('upgrading to inscripcion_completa immediately unlocks restricted routes and allows progress recording', async () => {
      const student = await findOrCreateStudent(db, {
        email: 'alumno.upgrade@ejemplo.com',
        nombre: 'Alumno Upgrade',
        nivel_acceso: 'ruta_abierta',
      });

      const token = await createSessionToken(student, secret);
      const sessionCookie = `lms_session=${token}`;

      // Initially blocked from restricted route
      const ctxInitial = createMockContext(
        `${origin}/api/progress?ruta=banca-movil-segura`,
        'GET',
        undefined,
        { cookie: sessionCookie }
      );
      const resInitial = await handleGetProgress(ctxInitial);
      expect(resInitial.status).toBe(403);

      // Perform upgrade via helper function
      const updated = await upgradeStudentAccess(db, student.email, 'inscripcion_completa');
      expect(updated?.nivel_acceso).toBe('inscripcion_completa');

      // Now immediate GET succeeds with 200
      const ctxUnlockedGet = createMockContext(
        `${origin}/api/progress?ruta=banca-movil-segura`,
        'GET',
        undefined,
        { cookie: sessionCookie }
      );
      const resUnlockedGet = await handleGetProgress(ctxUnlockedGet);
      expect(resUnlockedGet.status).toBe(200);
      const dataUnlockedGet = await resUnlockedGet.json();
      expect(dataUnlockedGet.success).toBe(true);
      expect(dataUnlockedGet.ruta).toBe('banca-movil-segura');

      // Immediate POST succeeds with 200
      const ctxUnlockedPost = createMockContext(
        `${origin}/api/progress`,
        'POST',
        {
          microcapsulaSlug: 'ingreso-seguro-clave-dinamica',
          rutaSlug: 'banca-movil-segura',
          completado: true,
        },
        { cookie: sessionCookie }
      );
      const resUnlockedPost = await handlePostProgress(ctxUnlockedPost);
      expect(resUnlockedPost.status).toBe(200);
      const dataUnlockedPost = await resUnlockedPost.json();
      expect(dataUnlockedPost.success).toBe(true);
      expect(dataUnlockedPost.progreso.completadas).toBe(1);
    });

    it('POST /api/students/upgrade upgrades student access level via HTTP endpoint', async () => {
      await findOrCreateStudent(db, {
        email: 'alumno.endpoint@ejemplo.com',
        nombre: 'Alumno Endpoint',
        nivel_acceso: 'ruta_abierta',
      });

      const ctx = createMockContext(
        `${origin}/api/students/upgrade`,
        'POST',
        {
          email: 'alumno.endpoint@ejemplo.com',
          nivelAcceso: 'inscripcion_completa',
        }
      );

      const res = await handleUpgradeStudent(ctx);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.student.nivel_acceso).toBe('inscripcion_completa');

      // Verify in DB
      const inDb = await getStudentByEmail(db, 'alumno.endpoint@ejemplo.com');
      expect(inDb?.nivel_acceso).toBe('inscripcion_completa');
    });
  });
});
