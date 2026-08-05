import { Controller, Get, Param, Query, BadRequestException, UseGuards } from '@nestjs/common';
import { EconomyService } from '../services/economy.service';

@Controller('treasury-mod')
export class TreasuryModController {
  constructor(private readonly economyService: EconomyService) {}

  @Get('permissions')
  async checkPermissions(
    @Query('playerUsername') playerUsername: string,
    @Query('entityId') entityId: string,
    @Query('entityType') entityType: string,
  ) {
    if (!playerUsername || !entityId || !entityType) {
      throw new BadRequestException('Missing parameters');
    }
    const hasAccess = await this.economyService.checkTreasuryAccess(playerUsername, entityId, entityType);
    return { hasAccess };
  }
}
