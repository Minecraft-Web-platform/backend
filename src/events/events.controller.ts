import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { EventsService } from './events.service';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { AuthenticatedRequest } from '../auth/types/auth-request.type';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @UseGuards(AccessTokenGuard)
  async getMyEvents(@Req() req: AuthenticatedRequest) {
    if (!req.user?.username_lower) {
      return [];
    }
    return this.eventsService.getUserEvents(req.user.username_lower);
  }
}
