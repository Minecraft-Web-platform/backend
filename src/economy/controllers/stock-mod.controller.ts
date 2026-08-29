import { Controller, Get, Post, Body, Param, Query, BadRequestException, UseGuards } from '@nestjs/common';
import { StockExchangeService } from '../services/stock-exchange.service';
import { CompaniesService } from '../services/companies.service';
import { StatesService } from '../../states/states.service';
import { EconomyService } from '../services/economy.service';
import { CurrenciesService } from '../services/currencies.service';
import { ModIpGuard } from '../../auth/guards/mod-ip.guard';
import {
  CheckStatePermissionsDto,
  GetPortfolioDto,
  GetIdentitiesDto,
  GetCompaniesDto,
  WithdrawSharesDto,
  DepositSharesDto,
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  BuySharesDto,
} from '../dto/stock-mod.dto';

@UseGuards(ModIpGuard)
@Controller('stock-mod')
export class StockModController {
  constructor(
    private readonly stockService: StockExchangeService,
    private readonly companiesService: CompaniesService,
    private readonly statesService: StatesService,
    private readonly economyService: EconomyService,
    private readonly currenciesService: CurrenciesService,
  ) {}

  @Get('permissions/state/:stateId')
  async checkStatePermissions(@Param('stateId') stateId: string, @Query() dto: CheckStatePermissionsDto) {
    if (!dto.playerUsername || !stateId) throw new BadRequestException('Missing parameters');
    try {
      const state = await this.statesService.getStateById(stateId);
      if (!state) return { hasAccess: false };

      const lower = dto.playerUsername.toLowerCase();
      // For now, assuming leader and treasurer. Admins might need user fetch, but this satisfies basic needs
      const hasAccess =
        state.leaderUsername?.toLowerCase() === lower || state.treasurerUsername?.toLowerCase() === lower;
      return { hasAccess, stateName: state.name };
    } catch {
      return { hasAccess: false };
    }
  }

  @Get('portfolio')
  async getPortfolio(@Query() dto: GetPortfolioDto) {
    if (!dto.playerUsername || !dto.entityId || !dto.entityType) {
      throw new BadRequestException('Missing parameters');
    }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
    const portfolio = await this.stockService.getModPortfolio(dto.entityId, dto.entityType as any);
    if (dto.exchangeStateId) {
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      return portfolio.filter((s: any) => s.exchangeStateId === dto.exchangeStateId);
    }
    return portfolio;
  }

  @Get('identities')
  async getIdentities(@Query() dto: GetIdentitiesDto) {
    if (!dto.playerUsername) throw new BadRequestException('Missing parameter');
    const lower = dto.playerUsername.toLowerCase();

    const identities = [{ type: 'player', id: lower, label: 'Личный счет' }];

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
  async getCompanies(@Query() dto: GetCompaniesDto) {
    let companies = await this.stockService.getPublicCompanies();
    if (dto.exchangeStateId) {
      companies = companies.filter((c) => c.exchangeStateId === dto.exchangeStateId);
    }
    const result: unknown[] = [];
    for (const comp of companies) {
      const history = await this.stockService.getCompanySharePriceHistory(comp.id);
      const last9 = history.slice(-9).map((h) => h.price);
      let currencyItem = 'minecraft:gold_nugget';
      if (comp.exchangeStateId) {
        const currency = await this.currenciesService.getCurrencyByStateId(comp.exchangeStateId);
        if (currency && currency.minecraftItemId) currencyItem = currency.minecraftItemId;
      }
      result.push({ ...comp, history: last9, currencyItem });
    }
    return result;
  }

  @Post('withdraw')
  async withdraw(@Body() dto: WithdrawSharesDto) {
    if (!dto.playerUsername || !dto.entityId || !dto.entityType || !dto.companyId || !dto.sharesCount) {
      throw new BadRequestException('Missing parameters');
    }
    const count = parseInt(dto.sharesCount, 10);
    if (isNaN(count) || count <= 0) throw new BadRequestException('Invalid shares count');

    const certificate = await this.stockService.withdrawShares(
      dto.entityId,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      dto.entityType as any,
      dto.companyId,
      count,
    );
    const company = await this.companiesService.getCompanyById(dto.companyId);
    let exchangeName = 'Независимая биржа';
    if (company.exchangeStateId) {
      try {
        const state = await this.statesService.getStateById(company.exchangeStateId);
        exchangeName = state.name;
      } catch (e: unknown) {
        console.error('Failed to get state for exchangeName:', e);
      }
    }

    const title = `Акции: ${company.name}`;
    const author = 'Admin';
    const dateStr = new Date().toLocaleDateString('ru-RU');

    // NBT format for Written Book in Minecraft 1.20+
    const pageText = JSON.stringify({
      text: `Сертификат на акции\n\nКомпания: ${company.name}\nБиржа: ${exchangeName}\nКоличество акций: ${certificate.sharesCount} шт.\n\nДата выдачи: ${dateStr}\n\nID:\n${certificate.id}`,
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
          sharesCount: certificate.sharesCount,
        },
      },
    };

    return {
      success: true,
      item,
    };
  }

  @Post('deposit')
  async deposit(@Body() dto: DepositSharesDto) {
    if (!dto.playerUsername || !dto.entityId || !dto.entityType || !dto.certificateId) {
      throw new BadRequestException('Missing parameters');
    }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
    const success = await this.stockService.depositShares(dto.entityId, dto.entityType as any, dto.certificateId);
    return { success };
  }
}
