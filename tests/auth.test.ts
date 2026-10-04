import { describe, it, expect, beforeEach } from 'vitest';
import { createInMemoryD1 } from '../src/lib/db/d1-memory';
import { FakeEmailService } from '../src/lib/email/fake-email-service';
import { AuthService } from '../src/lib/auth/service';
import fs from 'node:fs';
import path from 'node:path';

describe('Authentication Flow (Ticket #3 - Magic Link)', () => {
  let db: ReturnType<typeof createInMemoryD1>;
  let emailService: FakeEmailService;
  let authService: AuthService;
  const testSecret = 'test-secret-key-32-characters-long!';
  const baseUrl = 'http://localhost:4321';

  beforeEach(() => {
    db = createInMemoryD1();
    const schema = fs.readFileSync(path.resolve(__dirname, '../db/schema.sql'), 'utf-8');
    db.exec(schema);

    emailService = new FakeEmailService();
    authService = new AuthService({
      db,
      emailService,
      secret: testSecret,
      appUrl: baseUrl,
    });
  });

  it('1. Student requests magic link -> fake email received with valid token', async () => {
    const result = await authService.requestMagicLink({
      email: 'rosa.martinez@ejemplo.com',
      nombre: 'Rosa Martínez',
    });

    expect(result.success).toBe(true);
    expect(emailService.outbox.length).toBe(1);

    const sentEmail = emailService.outbox[0];
    expect(sentEmail.to).toBe('rosa.martinez@ejemplo.com');
    expect(sentEmail.subject).toContain('enlace de acceso');

    // Extract token from link in html
    const tokenMatch = sentEmail.html.match(/token=([a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)/);
    expect(tokenMatch).not.toBeNull();
    const token = tokenMatch![1];
    expect(token).toBeDefined();

    // Verify student was created in database
    const student = await db
      .prepare('SELECT * FROM estudiantes WHERE email = ?')
      .bind('rosa.martinez@ejemplo.com')
      .first<{ id: string; email: string; nombre: string; rol: string; nivel_acceso: string }>();

    expect(student).not.toBeNull();
    expect(student?.nombre).toBe('Rosa Martínez');
    expect(student?.rol).toBe('estudiante');
    expect(student?.nivel_acceso).toBe('ruta_abierta');
  });

  it('2. Verify endpoint with valid token -> sets session cookie and returns student info', async () => {
    // First request link
    await authService.requestMagicLink({
      email: 'carlos@ejemplo.com',
      nombre: 'Carlos',
    });

    const token = emailService.outbox[0].html.match(/token=([a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)/)![1];

    // Verify token
    const verifyResult = await authService.verifyMagicLink(token);
    expect(verifyResult.success).toBe(true);
    expect(verifyResult.student).toBeDefined();
    expect(verifyResult.student?.email).toBe('carlos@ejemplo.com');
    expect(verifyResult.sessionToken).toBeDefined();
    expect(verifyResult.cookieHeader).toContain('lms_session=');
    expect(verifyResult.cookieHeader).toContain('HttpOnly');
    expect(verifyResult.cookieHeader).toContain('Path=/');
  });

  it('3. Verify endpoint with expired or tampered token -> rejects with error', async () => {
    // Tampered token
    const tamperedResult = await authService.verifyMagicLink('tampered.token123');
    expect(tamperedResult.success).toBe(false);
    expect(tamperedResult.error).toBeDefined();
    expect(tamperedResult.student).toBeUndefined();

    // Expired token
    const expiredToken = await authService.createTokenForTesting({
      email: 'expired@ejemplo.com',
      studentId: 'id-expired',
      expiresInSeconds: -10,
    });

    const expiredResult = await authService.verifyMagicLink(expiredToken);
    expect(expiredResult.success).toBe(false);
    expect(expiredResult.error).toMatch(/expirado|inválido/i);
  });

  it('4. Authenticated requests using session cookie correctly identify the student', async () => {
    // Request link & verify
    await authService.requestMagicLink({
      email: 'ana@ejemplo.com',
      nombre: 'Ana Gómez',
    });
    const token = emailService.outbox[0].html.match(/token=([a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)/)![1];
    const { sessionToken } = await authService.verifyMagicLink(token);

    // Create a mock Request with Cookie header
    const mockRequest = new Request('http://localhost:4321/api/auth/me', {
      headers: {
        cookie: `lms_session=${sessionToken}; other_cookie=xyz`,
      },
    });

    const session = await authService.getSessionFromRequest(mockRequest);
    expect(session).not.toBeNull();
    expect(session?.email).toBe('ana@ejemplo.com');
    expect(session?.nombre).toBe('Ana Gómez');
    expect(session?.rol).toBe('estudiante');
  });

  it('5. Unauthenticated request returns null session', async () => {
    const mockRequest = new Request('http://localhost:4321/api/auth/me');
    const session = await authService.getSessionFromRequest(mockRequest);
    expect(session).toBeNull();
  });

  it('6. Logout clears session cookie', async () => {
    const logoutHeaders = authService.createLogoutHeaders();
    expect(logoutHeaders.get('Set-Cookie')).toContain('lms_session=;');
    expect(logoutHeaders.get('Set-Cookie')).toContain('Max-Age=0');
  });
});
