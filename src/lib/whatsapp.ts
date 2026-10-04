/**
 * Configuración oficial y utilitarios de integración con WhatsApp para LDDIGITALCO.
 */

export const WHATSAPP_NICKNAME = '@LucasDigital.coo';
export const DEFAULT_WHATSAPP_MESSAGE = 'quiero inquirir sobre los cursos.';

/**
 * Normaliza el identificador de WhatsApp garantizando el formato @username.
 */
export function normalizeWhatsAppNickname(nickname?: string): string {
  if (!nickname) return WHATSAPP_NICKNAME;
  const trimmed = nickname.trim();
  if (!trimmed) return WHATSAPP_NICKNAME;
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}

/**
 * Construye una URL compatible con wa.me para abrir la conversación de WhatsApp con el mensaje predeterminado o personalizado.
 * Protocolo de formato: https://wa.me/@username?text=<mensaje_codificado>
 */
export function getWhatsAppContactUrl(
  message: string = DEFAULT_WHATSAPP_MESSAGE,
  nickname: string = WHATSAPP_NICKNAME
): string {
  const formattedNickname = normalizeWhatsAppNickname(nickname);
  const textParam = encodeURIComponent(message);
  return `https://wa.me/${formattedNickname}?text=${textParam}`;
}
