import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { StreetsService } from '../services/streets.service';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { AuthenticatedRequest } from '../../auth/types/auth-request.type';

@Controller('cities/:cityId/streets')
export class StreetsController {
  constructor(private readonly streetsService: StreetsService) {}

  @Get()
  async getStreets(@Param('cityId') cityId: string) {
    return this.streetsService.getStreetsByCity(cityId);
  }

  @UseGuards(AccessTokenGuard)
  @Post()
  async createStreet(@Req() req: AuthenticatedRequest, @Param('cityId') cityId: string, @Body('name') name: string) {
    return this.streetsService.createStreet(req.user.username_lower, cityId, name);
  }

  @UseGuards(AccessTokenGuard)
  @Put(':streetId')
  async updateStreet(
    @Req() req: AuthenticatedRequest,
    @Param('cityId') cityId: string,
    @Param('streetId') streetId: string,
    @Body('name') name: string,
  ) {
    return this.streetsService.updateStreet(req.user.username_lower, cityId, streetId, name);
  }

  @UseGuards(AccessTokenGuard)
  @Delete(':streetId')
  async deleteStreet(
    @Req() req: AuthenticatedRequest,
    @Param('cityId') cityId: string,
    @Param('streetId') streetId: string,
  ) {
    return this.streetsService.deleteStreet(req.user.username_lower, cityId, streetId);
  }
}
