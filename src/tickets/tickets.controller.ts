import { Body, Controller, Post } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketDTO } from './dtos/ticket.dto';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  public async send(@Body() body: TicketDTO) {
    return this.ticketsService.sendTicket(body);
  }
}
