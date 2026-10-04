import { describe, it, expect } from 'vitest';
import {
  signToken,
  verifyToken,
  createMagicLinkToken,
  verifyMagicLinkToken,
  createSessionToken,
  verifySessionToken,
} from '../src/lib/auth/crypto';

describe('Web Crypto Token Service (HMAC-SHA256)', () => {
  const secret = 'super-secret-key-for-test-32-chars-long!';

  describe('signToken and verifyToken', () => {
    it('signs and verifies payload correctly', async () => {
      const payload = { sub: 'est-123', email: 'test@ejemplo.com' };
      const token = await signToken(payload, secret, 300); // 300 seconds

      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(2);

      const verified = await verifyToken<typeof payload>(token, secret);
      expect(verified).not.toBeNull();
      expect(verified?.sub).toBe('est-123');
      expect(verified?.email).toBe('test@ejemplo.com');
      expect(verified?.exp).toBeGreaterThan(Date.now() / 1000);
    });

    it('rejects tampered token', async () => {
      const payload = { sub: 'est-123', email: 'test@ejemplo.com' };
      const token = await signToken(payload, secret, 300);
      const [, sigPart] = token.split('.');

      // Tamper data
      const tamperedData = Buffer.from(JSON.stringify({ sub: 'est-hacker', email: 'hacker@ejemplo.com' })).toString('base64url');
      const tamperedToken = `${tamperedData}.${sigPart}`;

      const verified = await verifyToken(tamperedToken, secret);
      expect(verified).toBeNull();
    });

    it('rejects expired token', async () => {
      const payload = { sub: 'est-123' };
      const expiredToken = await signToken(payload, secret, -10); // Expired 10 seconds ago

      const verified = await verifyToken(expiredToken, secret);
      expect(verified).toBeNull();
    });

    it('rejects token signed with different secret', async () => {
      const payload = { sub: 'est-123' };
      const token = await signToken(payload, 'secret-one-1234567890123456789012', 300);

      const verified = await verifyToken(token, 'secret-two-1234567890123456789012');
      expect(verified).toBeNull();
    });
  });

  describe('Magic Link specific tokens', () => {
    it('creates and verifies magic link token with student details', async () => {
      const token = await createMagicLinkToken(
        { email: 'maria@ejemplo.com', studentId: 'est-1' },
        secret,
        15 * 60 // 15 mins
      );

      const result = await verifyMagicLinkToken(token, secret);
      expect(result).not.toBeNull();
      expect(result?.email).toBe('maria@ejemplo.com');
      expect(result?.studentId).toBe('est-1');
    });
  });

  describe('Session specific tokens', () => {
    it('creates and verifies session token with student model', async () => {
      const student = {
        id: 'est-1',
        email: 'maria@ejemplo.com',
        nombre: 'María Gómez',
        rol: 'estudiante' as const,
        nivel_acceso: 'ruta_abierta' as const,
        creado_en: new Date().toISOString(),
      };

      const token = await createSessionToken(student, secret, 86400 * 30);
      const session = await verifySessionToken(token, secret);

      expect(session).not.toBeNull();
      expect(session?.id).toBe('est-1');
      expect(session?.email).toBe('maria@ejemplo.com');
      expect(session?.nombre).toBe('María Gómez');
      expect(session?.rol).toBe('estudiante');
      expect(session?.nivel_acceso).toBe('ruta_abierta');
    });
  });
});
