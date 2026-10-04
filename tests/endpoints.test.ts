import { describe, it, expect, beforeEach } from 'vitest';
import { createInMemoryD1 } from '../src/lib/db/d1-memory';
import fs from 'node:fs';
import path from 'node:path';

// We import the endpoint handlers
import { POST as handleMagicLink } from '../src/pages/api/auth/magic-link';
import { GET as handleVerify } from '../src/pages/api/auth/verify';
import { GET as handleMe } from '../src/pages/api/auth/me';
import { POST as handleLogout } from '../src/pages/api/auth/logout';
import type { APIContext } from 'astro';

describe('Astro Auth API Endpoints', () => {
  let db: ReturnType<typeof createInMemoryD1>;
  const secret = 'super-secret-key-for-endpoints-testing-32-chars';
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
            RESEND_API_KEY: '', // triggers fake service or in-memory
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

  it('POST /api/auth/magic-link sends link and returns 200', async () => {
    const ctx = createMockContext(
      `${origin}/api/auth/magic-link`,
      'POST',
      { email: 'estudiante.nuevo@ejemplo.com', nombre: 'Estudiante Nuevo' }
    );

    const res = await handleMagicLink(ctx);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toBeDefined();

    // Verify student in database
    const student = await db
      .prepare('SELECT * FROM estudiantes WHERE email = ?')
      .bind('estudiante.nuevo@ejemplo.com')
      .first<{ nombre: string }>();

    expect(student?.nombre).toBe('Estudiante Nuevo');
  });

  it('POST /api/auth/magic-link returns 400 for invalid email', async () => {
    const ctx = createMockContext(
      `${origin}/api/auth/magic-link`,
      'POST',
      { email: 'invalido' }
    );

    const res = await handleMagicLink(ctx);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
  });

  it('GET /api/auth/verify with valid token sets cookie and redirects or returns JSON', async () => {
    // First generate a token
    const ctxLink = createMockContext(
      `${origin}/api/auth/magic-link`,
      'POST',
      { email: 'maria@ejemplo.com', nombre: 'María' }
    );
    await handleMagicLink(ctxLink);

    // Create a valid token manually using crypto
    const { signToken } = await import('../src/lib/auth/crypto');
    const student = await db.prepare('SELECT id, email FROM estudiantes WHERE email = ?').bind('maria@ejemplo.com').first<{ id: string; email: string }>();
    const validToken = await signToken({ email: student!.email, studentId: student!.id }, secret, 300);

    // Call verify endpoint
    const ctxVerify = createMockContext(
      `${origin}/api/auth/verify?token=${validToken}`,
      'GET',
      undefined,
      { Accept: 'application/json' }
    );

    const res = await handleVerify(ctxVerify);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.student.email).toBe('maria@ejemplo.com');

    const cookie = res.headers.get('set-cookie');
    expect(cookie).toContain('lms_session=');
  });

  it('GET /api/auth/verify with invalid token returns 401 or error redirect', async () => {
    const ctxVerify = createMockContext(
      `${origin}/api/auth/verify?token=invalid.token`,
      'GET',
      undefined,
      { Accept: 'application/json' }
    );

    const res = await handleVerify(ctxVerify);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it('GET /api/auth/me identifies authenticated student from cookie', async () => {
    const { createSessionToken } = await import('../src/lib/auth/crypto');
    const student = {
      id: 'est-123',
      email: 'rosa@ejemplo.com',
      nombre: 'Rosa',
      rol: 'estudiante' as const,
      nivel_acceso: 'ruta_abierta' as const,
    };
    const sessionToken = await createSessionToken(student, secret);

    const ctxMe = createMockContext(
      `${origin}/api/auth/me`,
      'GET',
      undefined,
      { cookie: `lms_session=${sessionToken}` }
    );

    const res = await handleMe(ctxMe);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.authenticated).toBe(true);
    expect(data.student.email).toBe('rosa@ejemplo.com');
  });

  it('POST /api/auth/logout clears session cookie', async () => {
    const ctxLogout = createMockContext(
      `${origin}/api/auth/logout`,
      'POST',
      undefined,
      { Accept: 'application/json' }
    );

    const res = await handleLogout(ctxLogout);
    expect(res.status).toBe(200);
    const cookie = res.headers.get('set-cookie');
    expect(cookie).toContain('lms_session=;');
    expect(cookie).toContain('Max-Age=0');
  });
});
