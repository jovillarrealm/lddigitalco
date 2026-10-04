import { describe, it, expect, beforeEach } from 'vitest';
import { createInMemoryD1 } from '../src/lib/db/d1-memory';
import { findOrCreateStudent } from '../src/lib/db/estudiantes';
import { getConsultaById } from '../src/lib/db/consultas';
import { createSessionToken } from '../src/lib/auth/crypto';
import { FakeEmailService } from '../src/lib/email/fake-email-service';
import fs from 'node:fs';
import path from 'node:path';
import type { APIContext } from 'astro';

import { POST as handlePostConsulta } from '../src/pages/api/consultas';

describe('Consultas API Endpoint (POST /api/consultas)', () => {
  let db: ReturnType<typeof createInMemoryD1>;
  let fakeEmailService: FakeEmailService;
  const secret = 'super-secret-key-for-endpoints-testing-32-chars';
  const origin = 'http://localhost:4321';
  let student: any;
  let sessionCookie: string;

  beforeEach(async () => {
    db = createInMemoryD1();
    const schema = fs.readFileSync(path.resolve(__dirname, '../db/schema.sql'), 'utf-8');
    db.exec(schema);

    student = await findOrCreateStudent(db, {
      email: 'marta.estudiante@ejemplo.com',
      nombre: 'Marta Gómez',
    });

    const token = await createSessionToken(student, secret);
    sessionCookie = `lms_session=${token}`;
    fakeEmailService = new FakeEmailService();
  });

  function createMockContext(
    urlStr: string,
    method: string = 'POST',
    body?: any,
    headers: Record<string, string> = {},
    customEnv: Record<string, any> = {}
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
            EMAIL_SERVICE: fakeEmailService,
            ...customEnv,
          },
        },
      } as any,
      site: undefined,
      generator: 'test',
      clientAddress: '127.0.0.1',
      cookies: {} as any,
    } as unknown as APIContext;
  }

  it('rejects unauthenticated request with 401', async () => {
    const ctx = createMockContext(
      `${origin}/api/consultas`,
      'POST',
      {
        microcapsulaSlug: 'identificar-estafas-whatsapp',
        mensaje: '¿Cómo reporto un número sospechoso en WhatsApp?',
      }
    );
    const res = await handlePostConsulta(ctx);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it('rejects request with invalid or malformed JSON body with 400', async () => {
    const ctx = createMockContext(
      `${origin}/api/consultas`,
      'POST',
      'invalid-not-json{',
      { cookie: sessionCookie, 'content-type': 'application/json' }
    );
    const res = await handlePostConsulta(ctx);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it('rejects request when microcapsulaSlug is missing or empty with 400', async () => {
    const ctx = createMockContext(
      `${origin}/api/consultas`,
      'POST',
      { microcapsulaSlug: '', mensaje: 'Tengo una pregunta de prueba' },
      { cookie: sessionCookie }
    );
    const res = await handlePostConsulta(ctx);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
  });

  it('rejects request when mensaje is missing or empty with 400', async () => {
    const ctx = createMockContext(
      `${origin}/api/consultas`,
      'POST',
      { microcapsulaSlug: 'identificar-estafas-whatsapp', mensaje: '   ' },
      { cookie: sessionCookie }
    );
    const res = await handlePostConsulta(ctx);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
  });

  it('successfully creates consulta in D1, sends tutor alert email, and returns 200', async () => {
    const mensajeDuda = 'No me queda claro qué hacer si el remitente dice ser mi nieto pidiendo dinero con urgencia.';
    const ctx = createMockContext(
      `${origin}/api/consultas`,
      'POST',
      {
        microcapsulaSlug: 'identificar-estafas-whatsapp',
        mensaje: mensajeDuda,
      },
      { cookie: sessionCookie }
    );

    const res = await handlePostConsulta(ctx);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.consultaId).toBeDefined();
    expect(data.mensaje).toContain('Tu duda ha sido recibida por tu tutor de LDDIGITALCO');

    // 1. Verify D1 database record
    const saved = await getConsultaById(db, data.consultaId);
    expect(saved).not.toBeNull();
    expect(saved?.estudiante_id).toBe(student.id);
    expect(saved?.microcapsula_slug).toBe('identificar-estafas-whatsapp');
    expect(saved?.mensaje).toBe(mensajeDuda);
    expect(saved?.estado).toBe('pendiente');

    // 2. Verify tutor alert email dispatched via FakeEmailService
    expect(fakeEmailService.outbox.length).toBe(1);
    const email = fakeEmailService.outbox[0];
    expect(email.to).toBe('tutor@lddigital.co');
    expect(email.subject).toContain('Marta Gómez');
    expect(email.html).toContain('Marta Gómez');
    expect(email.html).toContain('marta.estudiante@ejemplo.com');
    expect(email.html).toContain('identificar-estafas-whatsapp');
    expect(email.html).toContain(mensajeDuda);
  });

  it('uses custom TUTOR_EMAIL from environment if configured', async () => {
    const customTutor = 'profesor.especial@lddigital.co';
    const ctx = createMockContext(
      `${origin}/api/consultas`,
      'POST',
      {
        microcapsulaSlug: 'configurar-celular-vista',
        mensaje: '¿El brillo automático gasta más batería?',
      },
      { cookie: sessionCookie },
      { TUTOR_EMAIL: customTutor }
    );

    const res = await handlePostConsulta(ctx);
    expect(res.status).toBe(200);

    expect(fakeEmailService.outbox.length).toBe(1);
    const email = fakeEmailService.outbox[0];
    expect(email.to).toBe(customTutor);
  });
});
