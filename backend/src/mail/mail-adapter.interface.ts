export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export interface MailAdapter {
  send(options: SendMailOptions): Promise<void>;
}

export const MAIL_ADAPTER = Symbol('MAIL_ADAPTER');
