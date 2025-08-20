import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { Transporter, createTransport } from 'nodemailer';

import { EmailServiceContract } from './email.service.contract';
import { MailTemplateStrategy } from './strategies/mail-template.strategy';

@Injectable()
export class EmailService implements EmailServiceContract {
  private readonly transporter: Transporter;

  constructor() {
    this.transporter = createTransport({});
    this.transporter.verify(() => console.log('\nEmailService: Cannot connect to the SMTP server\n'));
  }

  async send(to: string, mailTemplate: MailTemplateStrategy): Promise<void> {
    try {
      await this.transporter.sendMail({
        to: to,
        subject: mailTemplate.getSubject(),
        html: mailTemplate.getHTML(),
        text: mailTemplate.getText(),
      });
    } catch {
      throw new UnprocessableEntityException(`Email "${to}" is invalid or cannot be delivered`);
    }
  }
}
