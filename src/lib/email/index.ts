import type { EmailService } from './types';
import { FakeEmailService } from './fake-email-service';
import { ResendEmailService } from './resend-email-service';

export * from './types';
export * from './fake-email-service';
export * from './resend-email-service';

let defaultFakeEmailService: FakeEmailService | null = null;

export function getFakeEmailService(): FakeEmailService {
  if (!defaultFakeEmailService) {
    defaultFakeEmailService = new FakeEmailService();
  }
  return defaultFakeEmailService;
}

export function getEmailService(env?: {
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  EMAIL_SERVICE?: EmailService;
  emailService?: EmailService;
}): EmailService {
  if (env?.EMAIL_SERVICE) return env.EMAIL_SERVICE;
  if (env?.emailService) return env.emailService;

  const apiKey = env?.RESEND_API_KEY || (typeof process !== 'undefined' ? process.env.RESEND_API_KEY : undefined);
  if (apiKey) {
    return new ResendEmailService({
      apiKey,
      defaultFrom: env?.RESEND_FROM || (typeof process !== 'undefined' ? process.env.RESEND_FROM : undefined),
    });
  }
  // En desarrollo o testing sin API key, usar FakeEmailService
  return getFakeEmailService();
}
