import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { Transporter, createTransport } from 'nodemailer';

import { EmailServiceContract } from './email.service.contract';
import { MailTemplateStrategy } from './strategies/mail-template.strategy';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService implements EmailServiceContract {
  private readonly transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
    this.configService = configService;
    const options = {
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    };

    console.log(options);

    this.transporter = createTransport(options);
  }

  async send(to: string, mailTemplate: MailTemplateStrategy): Promise<void> {
    console.log('start sending');

    try {
      await this.transporter.sendMail({
        to: to,
        subject: mailTemplate.getSubject(),
        html: mailTemplate.getHTML(),
        text: mailTemplate.getText(),
      });

      console.log('stop sending');
    } catch {
      throw new UnprocessableEntityException(`Email "${to}" is invalid or cannot be delivered`);
    }
  }
}
