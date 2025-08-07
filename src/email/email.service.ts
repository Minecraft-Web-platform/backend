import { Injectable } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';

import { EmailServiceContract } from './email.service.contract';
import { MailTemplateStrategy } from './strategies/mail-template.strategy';

@Injectable()
export class EmailService implements EmailServiceContract {
  private readonly transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({});
  }

  async send(to: string, mailTemplate: MailTemplateStrategy): Promise<void> {
    await this.transporter.sendMail({
      to: to,
      subject: mailTemplate.getSubject(),
      html: mailTemplate.getHTML(),
      text: mailTemplate.getText(),
    });
  }
}
