import { ForbiddenException, Injectable } from '@nestjs/common';
import { EmailService } from 'src/email/email.service';
import { TicketStrategy } from 'src/email/strategies/ticket.strategy';
import { TicketDTO } from './dtos/ticket.dto';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class TicketsService {
  constructor(
    private readonly emailService: EmailService,
    private readonly userService: UsersService,
  ) {}

  public async sendTicket(body: TicketDTO) {
    const { username, email, topic, content } = body;
    const userInDB = await this.userService.getByUsername(username.toLowerCase());

    if (!userInDB?.email) {
      throw new ForbiddenException('Добавь почту!');
    }

    if (!userInDB?.emailIsConfirmed) {
      throw new ForbiddenException('Подтверди почту');
    }

    const strategy = new TicketStrategy(username, topic, content, email);

    return this.emailService.send('oleksandr.shtonda.dev@gmail.com', strategy);
  }
}
