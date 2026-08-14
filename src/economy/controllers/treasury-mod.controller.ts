import { Controller, Get, Post, Body, Param, Query, BadRequestException, UseGuards } from '@nestjs/common';
import { EconomyService } from '../services/economy.service';
import { ModIpGuard } from '../../auth/guards/mod-ip.guard';

@UseGuards(ModIpGuard)
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

  @Get('accounts')
  async getAccounts(@Query('playerUsername') playerUsername: string) {
    if (!playerUsername) {
      throw new BadRequestException('Missing parameters');
    }
    const accounts = await this.economyService.getModAccounts(playerUsername);
    return accounts;
  }

  @Post('deposit')
  async deposit(
    @Body('playerUsername') playerUsername: string,
    @Body('entityId') entityId: string,
    @Body('entityType') entityType: string,
    @Body('amount') amount: string,
    @Body('items') items: { itemId: string; count: number }[],
  ) {
    if (!playerUsername || !entityId || !entityType || !items) {
      throw new BadRequestException('Missing parameters');
    }
    const success = await this.economyService.processDeposit(playerUsername, entityId, entityType, amount, items);
    return { success: true };
  }

  @Post('withdraw')
  async withdraw(
    @Body('playerUsername') playerUsername: string,
    @Body('entityId') entityId: string,
    @Body('entityType') entityType: string,
    @Body('amount') amount: string,
  ) {
    if (!playerUsername || !entityId || !entityType) {
      throw new BadRequestException('Missing parameters');
    }
    const items = await this.economyService.processWithdraw(playerUsername, entityId, entityType, amount);
    return { success: true, items };
  }

  @Get('account-currency')
  async getAccountCurrency(
    @Query('entityId') entityId: string,
    @Query('entityType') entityType: string,
  ) {
    if (!entityId || !entityType) {
      throw new BadRequestException('Missing parameters');
    }
    const itemId = await this.economyService.getAccountCurrencyItem(entityId, entityType);
    return { itemId };
  }
}
