import { Controller, Get, Post, Body, Query, BadRequestException, UseGuards } from '@nestjs/common';
import { EconomyService } from '../services/economy.service';
import { ModIpGuard } from '../../auth/guards/mod-ip.guard';

import { CurrenciesService } from '../services/currencies.service';
import { CheckPermissionsDto, GetAccountsDto, DepositDto, WithdrawDto, GetAccountCurrencyDto } from '../dto/treasury-mod.dto';

@UseGuards(ModIpGuard)
@Controller('treasury-mod')
export class TreasuryModController {
  constructor(
    private readonly economyService: EconomyService,
    private readonly currenciesService: CurrenciesService,
  ) { }

  @Get('permissions')
  async checkPermissions(
    @Query() dto: CheckPermissionsDto
  ) {
    if (!dto.playerUsername || !dto.entityId || !dto.entityType) {
      throw new BadRequestException('Missing parameters');
    }

    const hasAccess = await this.economyService.checkTreasuryAccess(dto.playerUsername, dto.entityId, dto.entityType);

    return { hasAccess };
  }

  @Get('accounts')
  async getAccounts(@Query() dto: GetAccountsDto) {
    if (!dto.playerUsername) {
      throw new BadRequestException('Missing parameters');
    }

    const accounts = await this.economyService.getModAccounts(dto.playerUsername);
    const rates = await this.currenciesService.getAllCurrencies();

    return { accounts, rates };
  }

  @Post('deposit')
  async deposit(
    @Body() dto: DepositDto
  ) {
    if (!dto.playerUsername || !dto.entityId || !dto.entityType || !dto.items) {
      throw new BadRequestException('Missing parameters');
    }

    const success = await this.economyService.processDeposit(dto.playerUsername, dto.entityId, dto.entityType, dto.amount, dto.items);

    return { success };
  }

  @Post('withdraw')
  async withdraw(
    @Body() dto: WithdrawDto
  ) {
    if (!dto.playerUsername || !dto.entityId || !dto.entityType) {
      throw new BadRequestException('Missing parameters');
    }

    const items = await this.economyService.processWithdraw(dto.playerUsername, dto.entityId, dto.entityType, dto.amount);

    return { success: true, items };
  }

  @Get('account-currency')
  async getAccountCurrency(
    @Query() dto: GetAccountCurrencyDto
  ) {
    if (!dto.entityId || !dto.entityType) {
      throw new BadRequestException('Missing parameters');
    }

    const itemId = await this.economyService.getAccountCurrencyItem(dto.entityId, dto.entityType);

    return { itemId };
  }
}
