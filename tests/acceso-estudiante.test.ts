import { describe, it, expect, beforeEach } from 'vitest';
import { AccesoEstudiante } from '../src/lib/auth/acceso-estudiante';
import { createInMemoryD1 } from '../src/lib/db/d1-memory';
import { FakeEmailService } from '../src/lib/email/fake-email-service';
import type { D1Database } from '../src/lib/db/types';

describe('Módulo Profundo: AccesoEstudiante', () => {
  let db: D1Database;
  let emailService: FakeEmailService;
  let acceso: AccesoEstudiante;

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
    `);
    emailService = new FakeEmailService();
    acceso = new AccesoEstudiante({
      db,
      emailService,
      secret: 'test-secret-32-chars-long-minimum-jwt',
      appUrl: 'http://localhost:4321',
      isProduction: false,
    });
  });

  it('permite registrarse en la Ruta Abierta y despacha enlace mágico', async () => {
    const request = new Request('http://localhost:4321/api/auth/register-open-track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nuevo.senior@ejemplo.com',
        nombre: 'Carlos Gómez',
      }),
    });

    const result = await acceso.registrarRutaAbierta(request, 'http://localhost:4321');
    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
    expect(result.body.student.nivel_acceso).toBe('ruta_abierta');
    expect(emailService.outbox).toHaveLength(1);
    expect(emailService.outbox[0].to).toBe('nuevo.senior@ejemplo.com');
  });

  it('rechaza actualización de nivel sin credenciales de administrador', async () => {
    const result = await acceso.actualizarNivelEstudiante({
      email: 'usuario@ejemplo.com',
      nivelAcceso: 'inscripcion_completa',
      adminKeyHeader: 'clave-invalida',
      expectedAdminKey: 'secreto-real',
    });

    expect(result.status).toBe(403);
    expect(result.success).toBe(false);
  });

  it('actualiza el nivel de acceso con clave de administración válida', async () => {
    // Primero crear estudiante
    await acceso.requestMagicLink({
      email: 'alumno@ejemplo.com',
      nombre: 'Rosa María',
    });

    const result = await acceso.actualizarNivelEstudiante({
      email: 'alumno@ejemplo.com',
      nivelAcceso: 'inscripcion_completa',
      adminKeyHeader: 'admin-secreto-valido',
      expectedAdminKey: 'admin-secreto-valido',
    });

    expect(result.status).toBe(200);
    expect(result.success).toBe(true);
    expect(result.student?.nivel_acceso).toBe('inscripcion_completa');
  });
});
