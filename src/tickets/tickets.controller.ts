import { Body, Controller, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { TicketsService } from './tickets.service';
import { TicketDTO } from './dtos/ticket.dto';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files', 3))
  public async send(
    @Body() body: TicketDTO,
    @UploadedFiles() files?: Express.Multer.File[]
  ) {
    return this.ticketsService.sendTicket(body, files);
  }
}
