import { describe, it, expect, beforeEach } from 'vitest';
import {
  getLiveSessionStatus,
  getUpcomingLiveSession,
  formatLiveSessionTime,
  formatStartsIn,
  type LiveSession,
} from '../src/lib/courses/live-session';
import { createInMemoryD1 } from '../src/lib/db/d1-memory';
import { findOrCreateStudent } from '../src/lib/db/estudiantes';
import { createSessionToken } from '../src/lib/auth/crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { APIContext } from 'astro';

import { GET as handleGetLiveSession } from '../src/pages/api/live-session';

describe('Live Session Service and Banner (Issue #6)', () => {
  const baseSession: LiveSession = {
    id: 'sesion-test-01',
    title: 'Taller en Directo: Práctica de Celular y Dudas en Vivo',
    description: 'Conéctese con sus tutores para practicar juntos y resolver dudas en tiempo real.',
    scheduledAt: '2026-10-07T18:00:00.000Z',
    durationMinutes: 60,
    meetUrl: 'https://meet.google.com/ldd-test-meet',
    nextScheduledAt: '2026-10-14T18:00:00.000Z',
  };

  const scheduledTime = new Date('2026-10-07T18:00:00.000Z').getTime();

  it('determines status: upcoming and disabled join button when > 15 minutes before class', () => {
    // Exactly 30 minutes before class
    const refTime = new Date(scheduledTime - 30 * 60 * 1000);
    const info = getLiveSessionStatus(baseSession, refTime);

    expect(info.status).toBe('upcoming');
    expect(info.canJoin).toBe(false);
    expect(info.startsInMinutes).toBe(30);
    expect(info.timeRemainingMessage).toContain('15 minutos antes');
  });

  it('determines status: active and enabled join button when 14 minutes before class', () => {
    // 14 minutes before class
    const refTime = new Date(scheduledTime - 14 * 60 * 1000);
    const info = getLiveSessionStatus(baseSession, refTime);

    expect(info.status).toBe('active');
    expect(info.canJoin).toBe(true);
    expect(info.session.meetUrl).toBe('https://meet.google.com/ldd-test-meet');
  });

  it('determines status: active and enabled join button during class (at start time and +30 min)', () => {
    // Exactly at start time
    const atStart = new Date(scheduledTime);
    const infoStart = getLiveSessionStatus(baseSession, atStart);
    expect(infoStart.status).toBe('active');
    expect(infoStart.canJoin).toBe(true);

    // 30 minutes into a 60-minute class
    const duringClass = new Date(scheduledTime + 30 * 60 * 1000);
    const infoDuring = getLiveSessionStatus(baseSession, duringClass);
    expect(infoDuring.status).toBe('active');
    expect(infoDuring.canJoin).toBe(true);
  });

  it('determines status: completed when > 60 minutes after scheduled class start', () => {
    // 65 minutes after class started
    const afterClass = new Date(scheduledTime + 65 * 60 * 1000);
    const infoAfter = getLiveSessionStatus(baseSession, afterClass);

    expect(infoAfter.status).toBe('completed');
    expect(infoAfter.canJoin).toBe(false);
    expect(infoAfter.timeRemainingMessage).toContain('finalizado');
    expect(infoAfter.session.nextScheduledAt).toBe('2026-10-14T18:00:00.000Z');
  });

  it('getUpcomingLiveSession returns default configured session info', () => {
    const defaultInfo = getUpcomingLiveSession();
    expect(defaultInfo.session).toBeDefined();
    expect(defaultInfo.session.title).toBeDefined();
    expect(defaultInfo.session.meetUrl).toBeDefined();
    expect(['upcoming', 'active', 'completed']).toContain(defaultInfo.status);
  });

  it('formats humane date and time when class is days away (avoids raw large minutes)', () => {
    // 3 days (4320 minutes) before Wednesday 2026-10-07 18:00 UTC -> Sunday 2026-10-04 18:00 UTC
    const refTime = new Date('2026-10-04T18:00:00.000Z');
    const info = getLiveSessionStatus(baseSession, refTime);

    expect(info.status).toBe('upcoming');
    expect(info.startsInMinutes).toBe(4320);
    // startsInDisplay must NOT contain raw 4320 min
    expect(info.startsInDisplay).not.toContain('4320');
    expect(info.startsInDisplay).toContain('Miércoles, 7 de Octubre - 18:00');
    expect(info.formattedTime).toContain('Miércoles, 7 de Octubre - 18:00');
    expect(info.timeRemainingMessage).toContain('Miércoles, 7 de Octubre - 18:00');
  });

  it('displays "Inicia en X min" when within 60 minutes', () => {
    const refTime = new Date(scheduledTime - 45 * 60 * 1000);
    const info = getLiveSessionStatus(baseSession, refTime);

    expect(info.status).toBe('upcoming');
    expect(info.startsInMinutes).toBe(45);
    expect(info.startsInDisplay).toBe('Inicia en 45 min');
    expect(info.timeRemainingMessage).toContain('inicia en aprox. 45 minutos');
  });

  it('formats "Hoy 18:00" when scheduled for later today (>60 min)', () => {
    // Scheduled for today at 18:00, reference time at 10:00 today
    const refTime = new Date('2026-10-07T10:00:00.000Z');
    const formatted = formatLiveSessionTime('2026-10-07T18:00:00.000Z', refTime);
    expect(formatted).toBe('Hoy 18:00');
  });

  it('formats "Mañana 18:00" when scheduled for tomorrow', () => {
    const refTime = new Date('2026-10-06T10:00:00.000Z');
    const formatted = formatLiveSessionTime('2026-10-07T18:00:00.000Z', refTime);
    expect(formatted).toBe('Mañana 18:00');
  });

  it('formats formatStartsIn display correctly', () => {
    const iso = '2026-10-07T18:00:00.000Z';
    const ref = new Date('2026-10-07T17:15:00.000Z');
    expect(formatStartsIn(45, iso, ref)).toBe('Inicia en 45 min');
    expect(formatStartsIn(0, iso, ref)).toBe('● En Vivo Ahora');
    expect(formatStartsIn(120, iso, new Date('2026-10-07T16:00:00.000Z'))).toBe('Hoy 18:00');
  });


  describe('Tier handling and GET /api/live-session Endpoint', () => {
    let db: ReturnType<typeof createInMemoryD1>;
    const secret = 'super-secret-key-for-live-session-testing-32-chars';
    const origin = 'http://localhost:4321';

    beforeEach(() => {
      db = createInMemoryD1();
      const schema = fs.readFileSync(path.resolve(__dirname, '../db/schema.sql'), 'utf-8');
      db.exec(schema);
    });

    function createMockContext(
      urlStr: string,
      headers: Record<string, string> = {}
    ): APIContext {
      const url = new URL(urlStr);
      const reqHeaders = new Headers(headers);
      const request = new Request(urlStr, {
        method: 'GET',
        headers: reqHeaders,
      });

      return {
        request,
        url,
        params: {},
        props: {},
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
        cookies: {} as any,
      } as unknown as APIContext;
    }

    it('returns canAccess: true and live session meet URL for student with inscripcion_completa', async () => {
      const student = await findOrCreateStudent(db, {
        email: 'alumno.completo@ejemplo.com',
        nombre: 'Alumno Completo',
        nivel_acceso: 'inscripcion_completa',
      });

      const token = await createSessionToken(student, secret);
      const ctx = createMockContext(`${origin}/api/live-session`, {
        cookie: `lms_session=${token}`,
      });

      const res = await handleGetLiveSession(ctx);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.tier).toBe('inscripcion_completa');
      expect(data.canAccess).toBe(true);
      expect(data.session).toBeDefined();
      expect(data.session.title).toBeDefined();
    });

    it('returns canAccess: false and upgrade invitation for student with ruta_abierta', async () => {
      const student = await findOrCreateStudent(db, {
        email: 'alumno.abierto@ejemplo.com',
        nombre: 'Alumno Abierto',
        nivel_acceso: 'ruta_abierta',
      });

      const token = await createSessionToken(student, secret);
      const ctx = createMockContext(`${origin}/api/live-session`, {
        cookie: `lms_session=${token}`,
      });

      const res = await handleGetLiveSession(ctx);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.tier).toBe('ruta_abierta');
      expect(data.canAccess).toBe(false);
      expect(data.meetUrl).toBeNull();
      expect(data.upgradePrompt).toBeDefined();
      expect(data.upgradePrompt.message).toContain('Inscripción Completa');
    });
  });
});
