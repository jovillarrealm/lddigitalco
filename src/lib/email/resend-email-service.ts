import { Resend } from 'resend';
import type { EmailService, SendEmailOptions, SendEmailResult } from './types';

export interface ResendEmailServiceOptions {
  apiKey?: string;
  defaultFrom?: string;
}

export class ResendEmailService implements EmailService {
  private apiKey: string;
  private defaultFrom: string;
  private resendClient: Resend | null = null;

  constructor(options: ResendEmailServiceOptions = {}) {
    this.apiKey = options.apiKey || (typeof process !== 'undefined' ? process.env.RESEND_API_KEY || '' : '');
    this.defaultFrom = options.defaultFrom || 'LDDIGITALCO <no-reply@lddigitalco.com>';

    if (this.apiKey) {
      this.resendClient = new Resend(this.apiKey);
    }
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    if (!this.apiKey || !this.resendClient) {
      return {
        success: false,
        error: 'RESEND_API_KEY no está configurada.',
      };
    }

    try {
      const response = await this.resendClient.emails.send({
        from: options.from || this.defaultFrom,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (response.error) {
        return {
          success: false,
          error: response.error.message,
        };
      }

      return {
        success: true,
        id: response.data?.id,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Error desconocido al enviar correo vía Resend',
      };
    }
  }
}
