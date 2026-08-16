import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { CurrenciesService } from '../services/currencies.service';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { AuthenticatedRequest } from '../../auth/types/auth-request.type';

@Controller('economy/currencies')
@UseGuards(AccessTokenGuard)
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  @Get()
  async getAllCurrencies() {
    return this.currenciesService.getAllCurrencies();
  }

  @Post()
  async createCurrency(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      stateId?: string;
      code: string;
      name: string;
      minecraftItemId?: string;
      kopeckItemId?: string;
      minecraftEnchantment?: string;
    },
  ) {
    const username = req.user.username_lower;
    return this.currenciesService.createCurrency(username, body);
  }

  @Post(':id/issue')
  async issueCurrency(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: { amount: number }) {
    const username = req.user.username_lower;
    return this.currenciesService.issueCurrency(username, id, body.amount);
  }
}
