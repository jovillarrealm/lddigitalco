import { describe, it, expect, beforeEach } from 'vitest';
import { FakeEmailService } from '../src/lib/email/fake-email-service';
import { NotificadorFormativo } from '../src/lib/email/notificador-formativo';
import type { Estudiante } from '../src/lib/db/types';

describe('NotificadorFormativo Deep Module', () => {
  let fakeTransport: FakeEmailService;
  let notificador: NotificadorFormativo;

  beforeEach(() => {
    fakeTransport = new FakeEmailService();
    notificador = new NotificadorFormativo(fakeTransport);
  });

  it('renders and dispatches passwordless magic link email with high-contrast token link', async () => {
    const result = await notificador.enviarAccesoSinContrasena({
      email: 'estudiante@ejemplo.com',
      nombre: 'Lucía Méndez',
      verifyUrl: 'http://localhost:4321/api/auth/verify?token=signed-token-123',
    });

    expect(result.id).toBeDefined();
    expect(fakeTransport.outbox.length).toBe(1);

    const email = fakeTransport.outbox[0];
    expect(email.to).toBe('estudiante@ejemplo.com');
    expect(email.subject).toContain('enlace de acceso');
    expect(email.html).toContain('Lucía Méndez');
    expect(email.html).toContain('http://localhost:4321/api/auth/verify?token=signed-token-123');
    expect(email.text).toContain('http://localhost:4321/api/auth/verify?token=signed-token-123');
  });

  it('renders and dispatches tutor consultation alert email with student question details', async () => {
    const student: Estudiante = {
      id: 'student-456',
      email: 'juan.perez@ejemplo.com',
      nombre: 'Juan Pérez',
      rol: 'estudiante',
      nivel_acceso: 'inscripcion_completa',
      creado_en: new Date().toISOString(),
    };

    const result = await notificador.notificarConsultaATutor({
      tutorEmail: 'tutor@lddigital.co',
      student,
      microcapsulaTitulo: 'Prevención de Estafas Telefónicas',
      microcapsulaSlug: 'prevencion-estafas-telefonicas',
      mensaje: '¿Cómo sé si el mensaje de mi banco es legítimo o fraudulento?',
    });

    expect(result.id).toBeDefined();
    expect(fakeTransport.outbox.length).toBe(1);

    const email = fakeTransport.outbox[0];
    expect(email.to).toBe('tutor@lddigital.co');
    expect(email.subject).toContain('Juan Pérez');
    expect(email.subject).toContain('Prevención de Estafas Telefónicas');
    expect(email.html).toContain('Juan Pérez');
    expect(email.html).toContain('juan.perez@ejemplo.com');
    expect(email.html).toContain('prevencion-estafas-telefonicas');
    expect(email.html).toContain('¿Cómo sé si el mensaje de mi banco es legítimo o fraudulento?');
  });
});
