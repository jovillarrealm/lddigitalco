import { describe, it, expect, beforeEach } from 'vitest';
import {
  getLiveSessionStatus,
  getUpcomingLiveSession,
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
