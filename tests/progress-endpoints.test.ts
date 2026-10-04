import { describe, it, expect, beforeEach } from 'vitest';
import { createInMemoryD1 } from '../src/lib/db/d1-memory';
import { findOrCreateStudent } from '../src/lib/db/estudiantes';
import { createSessionToken } from '../src/lib/auth/crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { APIContext } from 'astro';

import { GET as handleGetProgress, POST as handlePostProgress } from '../src/pages/api/progress';

describe('Progress API Endpoints (/api/progress)', () => {
  let db: ReturnType<typeof createInMemoryD1>;
  const secret = 'super-secret-key-for-endpoints-testing-32-chars';
  const origin = 'http://localhost:4321';
  let student: any;
  let sessionCookie: string;

  beforeEach(async () => {
    db = createInMemoryD1();
    const schema = fs.readFileSync(path.resolve(__dirname, '../db/schema.sql'), 'utf-8');
    db.exec(schema);

    student = await findOrCreateStudent(db, {
      email: 'alumno.progreso@ejemplo.com',
      nombre: 'Alumno Progreso',
    });

    const token = await createSessionToken(student, secret);
    sessionCookie = `lms_session=${token}`;
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

  it('GET /api/progress rejects unauthorized request with 401', async () => {
    const ctx = createMockContext(`${origin}/api/progress`, 'GET');
    const res = await handleGetProgress(ctx);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it('GET /api/progress returns 0% when student has no completed capsules', async () => {
    const ctx = createMockContext(
      `${origin}/api/progress?ruta=ciberseguridad-whatsapp`,
      'GET',
      undefined,
      { cookie: sessionCookie }
    );
    const res = await handleGetProgress(ctx);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.ruta).toBe('ciberseguridad-whatsapp');
    expect(data.total).toBe(4);
    expect(data.completadas).toBe(0);
    expect(data.porcentaje).toBe(0);
    expect(data.completadasSlugs).toEqual([]);
  });

  it('POST /api/progress rejects unauthorized request with 401', async () => {
    const ctx = createMockContext(
      `${origin}/api/progress`,
      'POST',
      { microcapsulaSlug: 'configurar-celular-vista' }
    );
    const res = await handlePostProgress(ctx);
    expect(res.status).toBe(401);
  });

  it('POST /api/progress rejects invalid request without slug with 400', async () => {
    const ctx = createMockContext(
      `${origin}/api/progress`,
      'POST',
      {},
      { cookie: sessionCookie }
    );
    const res = await handlePostProgress(ctx);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it('POST /api/progress marks capsule complete and returns updated percentage', async () => {
    const ctx = createMockContext(
      `${origin}/api/progress`,
      'POST',
      { microcapsulaSlug: 'configurar-celular-vista', completado: true },
      { cookie: sessionCookie }
    );
    const res = await handlePostProgress(ctx);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.completado).toBe(true);
    expect(data.progreso.total).toBe(4);
    expect(data.progreso.completadas).toBe(1);
    expect(data.progreso.porcentaje).toBe(25);
    expect(data.progreso.completadasSlugs).toContain('configurar-celular-vista');

    // Subsequent GET returns the updated progress
    const ctxGet = createMockContext(
      `${origin}/api/progress?ruta=ciberseguridad-whatsapp`,
      'GET',
      undefined,
      { cookie: sessionCookie }
    );
    const resGet = await handleGetProgress(ctxGet);
    const dataGet = await resGet.json();
    expect(dataGet.porcentaje).toBe(25);
    expect(dataGet.completadasSlugs).toContain('configurar-celular-vista');
  });

  it('POST /api/progress is idempotent when called multiple times', async () => {
    const ctx1 = createMockContext(
      `${origin}/api/progress`,
      'POST',
      { microcapsulaSlug: 'notas-voz-fotos-whatsapp', completado: true },
      { cookie: sessionCookie }
    );
    await handlePostProgress(ctx1);

    const ctx2 = createMockContext(
      `${origin}/api/progress`,
      'POST',
      { microcapsulaSlug: 'notas-voz-fotos-whatsapp', completado: true },
      { cookie: sessionCookie }
    );
    const res2 = await handlePostProgress(ctx2);
    expect(res2.status).toBe(200);

    const data2 = await res2.json();
    expect(data2.progreso.completadas).toBe(1);
  });

  it('POST /api/progress with completado=false unmarks capsule and decrements progress', async () => {
    // First mark it complete
    const ctxMark = createMockContext(
      `${origin}/api/progress`,
      'POST',
      { microcapsulaSlug: 'identificar-estafas-whatsapp', completado: true },
      { cookie: sessionCookie }
    );
    await handlePostProgress(ctxMark);

    // Then unmark
    const ctxUnmark = createMockContext(
      `${origin}/api/progress`,
      'POST',
      { microcapsulaSlug: 'identificar-estafas-whatsapp', completado: false },
      { cookie: sessionCookie }
    );
    const resUnmark = await handlePostProgress(ctxUnmark);
    expect(resUnmark.status).toBe(200);

    const dataUnmark = await resUnmark.json();
    expect(dataUnmark.success).toBe(true);
    expect(dataUnmark.completado).toBe(false);
    expect(dataUnmark.progreso.completadas).toBe(0);
    expect(dataUnmark.progreso.porcentaje).toBe(0);
    expect(dataUnmark.progreso.completadasSlugs).not.toContain('identificar-estafas-whatsapp');
  });
});
