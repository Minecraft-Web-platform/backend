import { Injectable } from '@nestjs/common';
import { EmailService } from 'src/email/email.service';
import { TicketStrategy } from 'src/email/strategies/ticket.strategy';
import { TicketDTO } from './dtos/ticket.dto';

@Injectable()
export class TicketsService {
  constructor(private readonly emailService: EmailService) {}

  public async sendTicket(body: TicketDTO) {
    const { username, email, topic, content } = body;
    const strategy = new TicketStrategy(username, topic, content, email);

    return this.emailService.send('oleksandr.shtonda.dev@gmail.com', strategy);
  }
}
