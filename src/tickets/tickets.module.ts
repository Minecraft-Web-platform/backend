import { Module } from '@nestjs/common';
import { EmailModule } from 'src/email/email.module';
import { TicketsService } from './tickets.service';
import { EmailService } from 'src/email/email.service';
import { TicketsController } from './tickets.controller';

@Module({
  imports: [EmailModule],
  providers: [TicketsService, EmailService],
  controllers: [TicketsController],
})
export class TicketModule {}
