import { describe, it, expect } from 'vitest';
import {
  WHATSAPP_NICKNAME,
  DEFAULT_WHATSAPP_MESSAGE,
  normalizeWhatsAppNickname,
  getWhatsAppContactUrl,
} from '../src/lib/whatsapp';

describe('Integración WhatsApp LDDIGITALCO', () => {
  it('define el identificador oficial @LucasDigital.coo y mensaje predeterminado', () => {
    expect(WHATSAPP_NICKNAME).toBe('@LucasDigital.coo');
    expect(DEFAULT_WHATSAPP_MESSAGE).toBe('quiero inquirir sobre los cursos.');
  });

  it('normaliza el nickname anteponiendo @ si no lo tiene', () => {
    expect(normalizeWhatsAppNickname('@LucasDigital.coo')).toBe('@LucasDigital.coo');
    expect(normalizeWhatsAppNickname('LucasDigital.coo')).toBe('@LucasDigital.coo');
    expect(normalizeWhatsAppNickname('   @LucasDigital.coo  ')).toBe('@LucasDigital.coo');
    expect(normalizeWhatsAppNickname('')).toBe('@LucasDigital.coo');
  });

  it('genera la URL de wa.me con el identificador y mensaje por defecto codificado', () => {
    const url = getWhatsAppContactUrl();
    expect(url).toBe(
      'https://wa.me/@LucasDigital.coo?text=quiero%20inquirir%20sobre%20los%20cursos.'
    );
  });

  it('permite generar URLs con mensajes personalizados para rutas o soporte', () => {
    const customMessage = 'Hola, quisiera solicitar la Inscripción Completa para desbloquear la Ruta de Banca Móvil Segura.';
    const url = getWhatsAppContactUrl(customMessage);
    
    expect(url).toContain('https://wa.me/@LucasDigital.coo?text=');
    expect(url).toBe(`https://wa.me/@LucasDigital.coo?text=${encodeURIComponent(customMessage)}`);
  });

  it('maneja caracteres especiales y tildes correctamente en la codificación URL', () => {
    const messageWithAccents = '¡Hola! ¿Cómo estás? Deseo información sobre +50.';
    const url = getWhatsAppContactUrl(messageWithAccents);
    expect(url).toContain(encodeURIComponent(messageWithAccents));
  });

  it('asegura que las sesiones en vivo generen el upgradePrompt con el nickname @LucasDigital.coo', async () => {
    const { SesionEnVivoManager } = await import('../src/lib/courses/live-session');
    const { MemoryLiveSessionRepository } = await import('../src/lib/courses/live-session-repository');
    
    const repo = new MemoryLiveSessionRepository();
    const manager = new SesionEnVivoManager(repo);

    const studentRutaAbierta = {
      id: 'test-student-1',
      email: 'test@example.com',
      nombre: 'Carlos',
      rol: 'estudiante' as const,
      nivel_acceso: 'ruta_abierta' as const,
      creado_en: new Date().toISOString(),
    };

    const sessionInfo = await manager.getStudentView(studentRutaAbierta);
    expect(sessionInfo.upgradePrompt).not.toBeNull();
    expect(sessionInfo.upgradePrompt?.contactUrl).toContain('https://wa.me/@LucasDigital.coo?text=');
    expect(sessionInfo.upgradePrompt?.contactUrl).not.toContain('573000000000');
  });
});

