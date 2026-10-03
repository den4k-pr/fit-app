export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  /** Текстова версія для поштових програм без HTML */
  text: string;
}

export interface EmailSendResult {
  /** id листа в провайдера (Resend): за ним шукають доставку в дашборді */
  id?: string;
}

/** Порт для пошти: реалізації — Resend (справжні листи) та Console (dev). */
export interface EmailProvider {
  send(message: EmailMessage): Promise<EmailSendResult>;
}
