import { Controller, Get, Post, Body, Param, Query, BadRequestException, UseGuards } from '@nestjs/common';
import { StockExchangeService } from '../services/stock-exchange.service';
import { CompaniesService } from '../services/companies.service';
import { StatesService } from '../../states/states.service';

@Controller('stock-mod')
export class StockModController {
  constructor(
    private readonly stockService: StockExchangeService,
    private readonly companiesService: CompaniesService,
    private readonly statesService: StatesService,
  ) {}

  @Get('portfolio')
  async getPortfolio(
    @Query('playerUsername') playerUsername: string,
    @Query('entityId') entityId: string,
    @Query('entityType') entityType: string,
    @Query('exchangeStateId') exchangeStateId: string,
  ) {
    if (!playerUsername || !entityId || !entityType) {
      throw new BadRequestException('Missing parameters');
    }
    
    const portfolio = await this.stockService.getModPortfolio(entityId, entityType as any);
    if (exchangeStateId) {
      return portfolio.filter(s => s.exchangeStateId === exchangeStateId);
    }
    return portfolio;
  }

  @Get('identities')
  async getIdentities(@Query('playerUsername') playerUsername: string) {
    if (!playerUsername) throw new BadRequestException('Missing parameter');
    const lower = playerUsername.toLowerCase();
    
    const identities = [
      { type: 'player', id: lower, label: 'Личный счет' }
    ];
    
    const states = await this.statesService.getAllStates();
    for (const st of states) {
      if (st.leaderUsername?.toLowerCase() === lower || st.treasurerUsername?.toLowerCase() === lower) {
        identities.push({ type: 'state', id: st.id, label: `Казна ${st.name}` });
      }
    }
    
    const companies = await this.companiesService.getAllCompanies();
    for (const comp of companies) {
      if (comp.ownerUsername?.toLowerCase() === lower) {
        identities.push({ type: 'company', id: comp.id, label: `Счет компании ${comp.name}` });
      }
    }
    
    return identities;
  }

  @Get('companies')
  async getCompanies(@Query('exchangeStateId') exchangeStateId: string) {
    const companies = await this.stockService.getPublicCompanies();
    if (exchangeStateId) {
      return companies.filter(c => c.exchangeStateId === exchangeStateId);
    }
    return companies;
  }

  @Post('withdraw')
  async withdraw(
    @Body('playerUsername') playerUsername: string,
    @Body('entityId') entityId: string,
    @Body('entityType') entityType: string,
    @Body('companyId') companyId: string,
    @Body('sharesCount') sharesCount: string,
  ) {
    if (!playerUsername || !entityId || !entityType || !companyId || !sharesCount) {
      throw new BadRequestException('Missing parameters');
    }
    const count = parseInt(sharesCount, 10);
    if (isNaN(count) || count <= 0) throw new BadRequestException('Invalid shares count');

    const certificate = await this.stockService.withdrawShares(entityId, entityType as any, companyId, count);
    const company = await this.companiesService.getCompanyById(companyId);
    let exchangeName = 'Независимая биржа';
    if (company.exchangeStateId) {
      try {
        const state = await this.statesService.getStateById(company.exchangeStateId);
        exchangeName = state.name;
      } catch (e) {}
    }

    const title = `Акции: ${company.name}`;
    const author = 'Admin';
    const dateStr = new Date().toLocaleDateString('ru-RU');
    
    // NBT format for Written Book in Minecraft 1.20+
    const pageText = JSON.stringify({
      text: `Сертификат на акции\n\nКомпания: ${company.name}\nБиржа: ${exchangeName}\nКоличество акций: ${certificate.sharesCount} шт.\n\nДата выдачи: ${dateStr}\n\nID:\n${certificate.id}`
    });

    const item = {
      id: 'minecraft:written_book',
      Count: 1,
      tag: {
        title,
        author,
        pages: [pageText],
        CompanyShare: {
          certificateId: certificate.id,
          companyId: company.id,
          sharesCount: certificate.sharesCount
        }
      }
    };
    
    return { 
      success: true, 
      item
    };
  }

  @Post('deposit')
  async deposit(
    @Body('playerUsername') playerUsername: string,
    @Body('entityId') entityId: string, // account/entity to deposit to
    @Body('entityType') entityType: string,
    @Body('certificateId') certificateId: string,
  ) {
    if (!playerUsername || !entityId || !entityType || !certificateId) {
      throw new BadRequestException('Missing parameters');
    }
    
    const success = await this.stockService.depositShares(entityId, entityType as any, certificateId);
    return { success };
  }
}
