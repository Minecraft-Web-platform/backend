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
    @Body() body: { totalShares?: number; initialPrice?: number; exchangeStateId: string },
  ) {
    const username = req.user.username_lower;
    return this.stockExchangeService.conductIPO(username, companyId, body);
  }

  @Get('ipo-requests/state/:stateId')
  async getIpoRequests(
    @Req() req: AuthenticatedRequest,
    @Param('stateId') stateId: string,
  ) {
    return this.stockExchangeService.getIpoRequests(stateId, req.user.username_lower);
  }

  @Post('ipo-requests/:requestId/review')
  async reviewIpoRequest(
    @Req() req: AuthenticatedRequest,
    @Param('requestId') requestId: string,
    @Body() body: { action: 'approved' | 'rejected' },
  ) {
    return this.stockExchangeService.reviewIpoRequest(requestId, body.action, req.user.username_lower);
  }

  @Post(':companyId/buy')
  async buyShares(
    @Req() req: AuthenticatedRequest,
    @Param('companyId') companyId: string,
    @Body() body: { count: number; buyerType?: 'player' | 'state' | 'company'; buyerId?: string },
  ) {
    const username = req.user.username_lower;
    return this.stockExchangeService.buyShares(
      username,
      companyId,
      body.count,
      body.buyerType,
      body.buyerId,
    );
  }

  @Post(':companyId/sell')
  async sellShares(
    @Req() req: AuthenticatedRequest,
    @Param('companyId') companyId: string,
    @Body() body: { count: number; sellerType?: 'player' | 'state' | 'company'; sellerId?: string },
  ) {
    const username = req.user.username_lower;
    return this.stockExchangeService.sellShares(
      username,
      companyId,
      body.count,
      body.sellerType,
      body.sellerId,
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

  @Get(':companyId/history')
  async getCompanySharePriceHistory(@Param('companyId') companyId: string) {
    return this.stockExchangeService.getCompanySharePriceHistory(companyId);
  }

  @Post(':companyId/price')
  async changeCompanySharePrice(
    @Req() req: AuthenticatedRequest,
    @Param('companyId') companyId: string,
    @Body() body: { newPrice: number },
  ) {
    const username = req.user.username_lower;
    return this.stockExchangeService.changeCompanySharePrice(
      username,
      companyId,
      body.newPrice,
    );
  }
}
