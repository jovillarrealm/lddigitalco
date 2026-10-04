import type { Estudiante } from '../db/types';

export interface MagicLinkPayload {
  email: string;
  studentId: string;
  nonce?: string;
}

export interface SessionPayload {
  id: string;
  email: string;
  nombre: string;
  rol: 'estudiante' | 'tutor' | 'admin';
  nivel_acceso: 'ruta_abierta' | 'inscripcion_completa';
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signToken<T extends Record<string, any>>(
  payload: T,
  secret: string,
  expiresInSeconds: number
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const data = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };
  const jsonStr = JSON.stringify(data);
  const enc = new TextEncoder();
  const dataBytes = enc.encode(jsonStr);
  const dataBase64 = bytesToBase64Url(dataBytes);

  const key = await getCryptoKey(secret);
  const sigBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(dataBase64));
  const sigBase64 = bytesToBase64Url(new Uint8Array(sigBuffer));

  return `${dataBase64}.${sigBase64}`;
}

export async function verifyToken<T = Record<string, any>>(
  token: string,
  secret: string
): Promise<(T & { iat: number; exp: number }) | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [dataBase64, sigBase64] = parts;

    const key = await getCryptoKey(secret);
    const enc = new TextEncoder();
    const sigBytes = base64UrlToBytes(sigBase64);

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes as unknown as BufferSource,
      enc.encode(dataBase64)
    );

    if (!isValid) return null;

    const dataBytes = base64UrlToBytes(dataBase64);
    const dec = new TextDecoder();
    const payload = JSON.parse(dec.decode(dataBytes));

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function createMagicLinkToken(
  payload: MagicLinkPayload,
  secret: string,
  expiresInSeconds = 900 // 15 minutes
): Promise<string> {
  return signToken(payload, secret, expiresInSeconds);
}

export async function verifyMagicLinkToken(
  token: string,
  secret: string
): Promise<(MagicLinkPayload & { iat: number; exp: number }) | null> {
  return verifyToken<MagicLinkPayload>(token, secret);
}

export async function createSessionToken(
  student: Estudiante | SessionPayload,
  secret: string,
  expiresInSeconds = 30 * 24 * 3600 // 30 days
): Promise<string> {
  const sessionData: SessionPayload = {
    id: student.id,
    email: student.email,
    nombre: student.nombre,
    rol: student.rol,
    nivel_acceso: student.nivel_acceso,
  };
  return signToken(sessionData, secret, expiresInSeconds);
}

export async function verifySessionToken(
  token: string,
  secret: string
): Promise<(SessionPayload & { iat: number; exp: number }) | null> {
  return verifyToken<SessionPayload>(token, secret);
}
