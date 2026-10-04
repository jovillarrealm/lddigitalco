import { describe, it, expect, beforeEach } from 'vitest';
import { FakeEmailService } from '../src/lib/email/fake-email-service';
import { ResendEmailService } from '../src/lib/email/resend-email-service';

describe('Email Service', () => {
  describe('FakeEmailService', () => {
    let emailService: FakeEmailService;

    beforeEach(() => {
      emailService = new FakeEmailService();
    });

    it('records sent emails in outbox', async () => {
      const result = await emailService.send({
        to: 'estudiante@ejemplo.com',
        subject: 'Su enlace de acceso a LDDIGITALCO',
        html: '<p>Haga clic aquí: <a href="https://example.com/api/auth/verify?token=123">Entrar</a></p>',
        text: 'Haga clic aquí: https://example.com/api/auth/verify?token=123',
      });

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
      expect(emailService.outbox.length).toBe(1);
      expect(emailService.outbox[0].to).toBe('estudiante@ejemplo.com');
      expect(emailService.outbox[0].subject).toContain('Su enlace de acceso');
      expect(emailService.outbox[0].html).toContain('token=123');
    });

    it('clears outbox when clear() is called', async () => {
      await emailService.send({
        to: 'test@ejemplo.com',
        subject: 'Prueba',
        html: '<p>Hola</p>',
      });
      expect(emailService.outbox.length).toBe(1);
      emailService.clear();
      expect(emailService.outbox.length).toBe(0);
    });
  });

  describe('ResendEmailService', () => {
    it('returns error if api key is missing or invalid in call', async () => {
      const resendService = new ResendEmailService({ apiKey: '' });
      const result = await resendService.send({
        to: 'test@ejemplo.com',
        subject: 'Prueba',
        html: '<p>Hola</p>',
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
