import type { EmailService, SendEmailOptions, SendEmailResult } from './types';

export class FakeEmailService implements EmailService {
  public outbox: SendEmailOptions[] = [];

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    this.outbox.push({ ...options });
    return {
      success: true,
      id: `fake-email-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    };
  }

  clear(): void {
    this.outbox = [];
  }
}
