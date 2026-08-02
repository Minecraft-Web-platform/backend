import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { EconomyService } from '../services/economy.service';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { AuthenticatedRequest } from '../../auth/types/auth-request.type';
import { AccountType } from '../entities/account.entity';

@Controller('economy')
@UseGuards(AccessTokenGuard)
export class EconomyController {
  constructor(private readonly economyService: EconomyService) {}

  @Get('accounts/my')
  async getMyAccounts(@Req() req: AuthenticatedRequest) {
    const username = req.user.username_lower;
    return this.economyService.getMyAccounts(username);
  }

  @Post('accounts')
  async createAccount(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: { type?: AccountType; currencyCode?: string; ownerUsername?: string },
  ) {
    const username = req.user.username_lower;
    return this.economyService.createAccount(username, body);
  }

  @Get('cards/my')
  async getMyCards(@Req() req: AuthenticatedRequest) {
    const username = req.user.username_lower;
    return this.economyService.getMyCards(username);
  }

  @Post('cards')
  async issueCard(
    @Req() req: AuthenticatedRequest,
    @Body() body: { accountId: string },
  ) {
    const username = req.user.username_lower;
    return this.economyService.issueCard(username, body.accountId);
  }

  @Patch('cards/:id/toggle-block')
  async toggleBlockCard(
    @Req() req: AuthenticatedRequest,
    @Param('id') cardId: string,
  ) {
    const username = req.user.username_lower;
    return this.economyService.toggleBlockCard(username, cardId);
  }

  @Delete('cards/:id')
  async deleteCard(
    @Req() req: AuthenticatedRequest,
    @Param('id') cardId: string,
  ) {
    const username = req.user.username_lower;
    return this.economyService.deleteCard(username, cardId);
  }

  @Post('transfers')
  async transferMoney(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      fromNumber: string;
      toNumber: string;
      amount: number;
      description?: string;
    },
  ) {
    const username = req.user.username_lower;
    return this.economyService.transferMoney(username, body);
  }

  @Get('transfers/my')
  async getMyTransfers(@Req() req: AuthenticatedRequest) {
    const username = req.user.username_lower;
    return this.economyService.getMyTransfers(username);
  }
}
