import { Injectable, UnprocessableEntityException } from '@nestjs/common';

import { EmailServiceContract } from './email.service.contract';
import { MailTemplateStrategy } from './strategies/mail-template.strategy';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService implements EmailServiceContract {
  private readonly resend: Resend;

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
  }

  async send(to: string, mailTemplate: MailTemplateStrategy): Promise<void> {
    try {
      await this.resend.emails.send({
        from: this.configService.get<string>('SMTP_FROM') ?? 'send@khroniki-kraya.com',
        to,
        subject: mailTemplate.getSubject(),
        html: mailTemplate.getHTML(),
        text: mailTemplate.getText(),
      });
    } catch (error) {
      console.error('Resend error:', error);
      throw new UnprocessableEntityException(`Email "${to}" is invalid or cannot be delivered`);
    }
  }
}
