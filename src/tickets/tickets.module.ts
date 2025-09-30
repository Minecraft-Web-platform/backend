import { Module } from '@nestjs/common';
import { EmailModule } from 'src/email/email.module';
import { TicketsService } from './tickets.service';
import { EmailService } from 'src/email/email.service';
import { TicketsController } from './tickets.controller';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [EmailModule, UsersModule],
  providers: [TicketsService, EmailService],
  controllers: [TicketsController],
})
export class TicketModule {}
