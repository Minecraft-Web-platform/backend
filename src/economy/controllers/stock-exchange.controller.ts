import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { StockExchangeService } from '../services/stock-exchange.service';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { AuthenticatedRequest } from '../../auth/types/auth-request.type';

@Controller('economy/stock-exchange')
@UseGuards(AccessTokenGuard)
export class StockExchangeController {
  constructor(private readonly stockExchangeService: StockExchangeService) {}

  @Get('companies')
  async getPublicCompanies() {
    return this.stockExchangeService.getPublicCompanies();
  }

  @Get('my-portfolio')
  async getMyPortfolio(@Req() req: AuthenticatedRequest) {
    const username = req.user.username_lower;
    return this.stockExchangeService.getMyPortfolio(username);
  }

  @Post(':companyId/ipo')
  async conductIPO(
    @Req() req: AuthenticatedRequest,
    @Param('companyId') companyId: string,
    @Body() body: { totalShares?: number; initialPrice?: number },
  ) {
    const username = req.user.username_lower;
    return this.stockExchangeService.conductIPO(username, companyId, body);
  }

  @Post(':companyId/buy')
  async buyShares(
    @Req() req: AuthenticatedRequest,
    @Param('companyId') companyId: string,
    @Body() body: { count: number },
  ) {
    const username = req.user.username_lower;
    return this.stockExchangeService.buyShares(
      username,
      companyId,
      body.count,
    );
  }

  @Post(':companyId/sell')
  async sellShares(
    @Req() req: AuthenticatedRequest,
    @Param('companyId') companyId: string,
    @Body() body: { count: number },
  ) {
    const username = req.user.username_lower;
    return this.stockExchangeService.sellShares(
      username,
      companyId,
      body.count,
    );
  }

  @Post(':companyId/dividends')
  async payDividends(
    @Req() req: AuthenticatedRequest,
    @Param('companyId') companyId: string,
    @Body() body: { totalAmount: number },
  ) {
    const username = req.user.username_lower;
    return this.stockExchangeService.payDividends(
      username,
      companyId,
      body.totalAmount,
    );
  }
}
