import { MailTemplateStrategy } from './strategies/mail-template.strategy';

export interface EmailServiceContract {
  send(to: string, mailTemplate: MailTemplateStrategy): Promise<void>;
}
