import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Currency } from '../entities/currency.entity';
import { StateEntity } from '../../states/entities/state.entity';
import { Account } from '../entities/account.entity';

import { StateTreasuryItemEntity } from '../../states/entities/state-treasury-item.entity';
import { AutoNewsService } from '../../news/auto-news.service';
import { CurrencyRateHistory } from '../entities/currency-rate-history.entity';

@Injectable()
export class CurrenciesService {
  constructor(
    @InjectRepository(Currency)
    private readonly currencyRepository: Repository<Currency>,
    @InjectRepository(StateEntity)
    private readonly stateRepository: Repository<StateEntity>,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(StateTreasuryItemEntity)
    private readonly treasuryRepo: Repository<StateTreasuryItemEntity>,
    @InjectRepository(CurrencyRateHistory)
    private readonly rateHistoryRepo: Repository<CurrencyRateHistory>,
    private readonly autoNewsService: AutoNewsService,
  ) {}

  public async getAllCurrencies(): Promise<unknown[]> {
    const currencies = await this.currencyRepository.find({
      order: { createdAt: 'ASC' },
    });
    const states = await this.stateRepository.find();
    const stateMap = new Map(states.map((s) => [s.id, s]));

    return currencies.map((c) => {
      const s = c.stateId ? stateMap.get(c.stateId) : null;
      return {
        ...c,
        stateFlagUrl: s?.flagUrl || null,
      };
    });
  }

  @OnEvent('state.updated')
  @OnEvent('state.treasury.updated')
  @OnEvent('state.citizens.updated')
  @OnEvent('state.settlement.updated')
  public async handleStateEconomyChanges(payload: { stateId: string }) {
    if (!payload.stateId) return;
    const currency = await this.getCurrencyByStateId(payload.stateId);
    if (currency) {
      await this.recalculateExchangeRate(currency);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  public async handleDailyCurrencyGrowth() {
    const currencies = await this.currencyRepository.find();
    for (const cur of currencies) {
      if (cur.stateId) {
        await this.recalculateExchangeRate(cur);
      }
    }
  }

  public async createCurrency(
    username: string,
    dto: {
      stateId?: string;
      code: string;
      name: string;
      minecraftItemId?: string;
      kopeckItemId?: string;
      minecraftEnchantment?: string;
    },
  ): Promise<Currency> {
    const existing = await this.currencyRepository.findOne({
      where: { code: dto.code.toUpperCase() },
    });
    if (existing) {
      throw new BadRequestException('Валюта с таким тикером уже существует');
    }

    if (dto.stateId) {
      const state = await this.stateRepository.findOne({
        where: { id: dto.stateId },
        relations: ['citizens', 'settlements'],
      });
      if (!state) {
        throw new NotFoundException('Государство не найдено');
      }
      if (state.leaderUsername !== username.toLowerCase()) {
        throw new ForbiddenException('Только правитель государства может создавать национальную валюту');
      }
      if (!state.treasuryAccountNumber) {
        throw new BadRequestException('Сначала необходимо учредить Национальный банк государства (счёт казны)!');
      }
      const existingStateCur = await this.currencyRepository.findOne({
        where: { stateId: dto.stateId },
      });
      if (existingStateCur) {
        throw new BadRequestException('У этого государства уже выпущена национальная валюта: ' + existingStateCur.code);
      }
    }

    const mainItem = dto.minecraftItemId || 'createdeco:gold_coin';
    const kopeckItem = dto.kopeckItemId || 'createdeco:copper_coin';
    if (mainItem === kopeckItem) {
      throw new BadRequestException('Основная и разменная монета не могут быть одинаковым предметом');
    }

    const currency = this.currencyRepository.create({
      stateId: dto.stateId || null,
      code: dto.code.toUpperCase(),
      name: dto.name,
      minecraftItemId: mainItem,
      kopeckItemId: kopeckItem,
      minecraftEnchantment: dto.minecraftEnchantment || 'unbreaking:3',
      totalIssued: 0,
      reserves: 0,
      exchangeRate: 1.0,
      rateChange24h: 0.0,
    });

    const saved = await this.currencyRepository.save(currency);

    if (dto.stateId) {
      const state = await this.stateRepository.findOne({
        where: { id: dto.stateId },
      });
      if (state && state.treasuryAccountNumber) {
        await this.accountRepository.update(
          { accountNumber: state.treasuryAccountNumber },
          { currencyCode: saved.code },
        );
      }
    }

    const recalculated = await this.recalculateExchangeRate(saved);

    if (dto.stateId) {
      const state = await this.stateRepository.findOne({
        where: { id: dto.stateId },
      });
      if (state) {
        await this.autoNewsService.publishCurrencyNews(saved.name, saved.code, state.name, username);
      }
    }

    return recalculated;
  }

  public async issueCurrency(username: string, currencyId: string, amount: number): Promise<Currency> {
    if (amount <= 0) {
      throw new BadRequestException('Сумма эмиссии должна быть больше 0');
    }

    const currency = await this.currencyRepository.findOne({
      where: { id: currencyId },
    });
    if (!currency) {
      throw new NotFoundException('Валюта не найдена');
    }

    if (currency.stateId) {
      const state = await this.stateRepository.findOne({
        where: { id: currency.stateId },
      });
      if (state && state.leaderUsername !== username.toLowerCase()) {
        throw new ForbiddenException('Только правитель может эмитировать национальную валюту');
      }
    }

// eslint-disable-next-line @typescript-eslint/no-unused-vars
    const oldRate = currency.exchangeRate;
    currency.totalIssued = Number((currency.totalIssued + amount).toFixed(2));
    await this.currencyRepository.save(currency);

    if (currency.stateId) {
      const state = await this.stateRepository.findOne({
        where: { id: currency.stateId },
      });
      if (state && state.treasuryAccountNumber) {
        const treasuryAccount = await this.accountRepository.findOne({
          where: { accountNumber: state.treasuryAccountNumber },
        });
        if (treasuryAccount) {
          treasuryAccount.balance = Number((treasuryAccount.balance + amount).toFixed(2));
          await this.accountRepository.save(treasuryAccount);
        }
      }
    }

    const updated = await this.recalculateExchangeRate(currency);

    return updated;
  }

  private async recalculateExchangeRate(currency: Currency): Promise<Currency> {
    let basePower = 0;
    let taxCoefficient = 1.0;

    if (currency.stateId) {
      const state = await this.stateRepository.findOne({
        where: { id: currency.stateId },
        relations: ['citizens', 'settlements', 'settlements.citizens'],
      });
      if (state) {
        const citizensCount = state.citizens?.length || 0;
        const activeSettlementsCount = state.settlements?.filter((c) => (c.citizens?.length || 0) >= 1).length || 0;

        const taxRate = state.playerToCompanyTransferFee || 5;
        if (taxRate <= 10) {
          taxCoefficient = 1.0;
        } else if (taxRate <= 25) {
          taxCoefficient = 0.95;
        } else {
          taxCoefficient = 0.85;
        }

        basePower += citizensCount * 10 + activeSettlementsCount * 100;
      }
    }

    if (currency.createdAt) {
      const ageInDays = (Date.now() - new Date(currency.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      const ageWeeks = Math.floor(Math.max(0, ageInDays) / 7);
      basePower += ageWeeks * 50;
    }

    // Calculate physical reserves from Treasury
    if (currency.stateId) {
      const treasuryItems = await this.treasuryRepo.find({
        where: { stateId: currency.stateId },
      });
      const ITEM_VALUES: Record<string, number> = {
        'minecraft:gold_nugget': 1,
        'minecraft:gold_ingot': 9,
        'minecraft:gold_block': 81,
        'minecraft:diamond': 20,
        'minecraft:diamond_block': 180,
        'minecraft:emerald': 12,
        'minecraft:emerald_block': 108,
        'minecraft:netherite_scrap': 25,
        'minecraft:netherite_ingot': 150,
        'minecraft:netherite_block': 1350,
      };
      let physicalReserves = 0;
      for (const item of treasuryItems) {
        const val = ITEM_VALUES[item.minecraftItemId] || 0;
        physicalReserves += val * item.quantity;
      }
      currency.reserves = physicalReserves;
    }

    const economicPower = Number((basePower * taxCoefficient).toFixed(2));
    const totalIssued = Math.max(currency.totalIssued, 1);
    const calculatedRate = (currency.reserves + economicPower) / totalIssued;
    const oldRate = currency.exchangeRate;
    currency.exchangeRate = Number(Math.max(calculatedRate, 0.01).toFixed(4));

    if (oldRate !== currency.exchangeRate) {
      const history = this.rateHistoryRepo.create({
        currencyId: currency.id,
        rate: currency.exchangeRate,
      });
      await this.rateHistoryRepo.save(history);
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let baseHistory = await this.rateHistoryRepo.findOne({
      where: { currencyId: currency.id, createdAt: MoreThanOrEqual(oneDayAgo) },
      order: { createdAt: 'ASC' },
    });

    if (!baseHistory) {
      baseHistory = await this.rateHistoryRepo.findOne({
        where: { currencyId: currency.id },
        order: { createdAt: 'DESC' },
      });
    }

    const baseRate = baseHistory ? baseHistory.rate : currency.exchangeRate;
    if (baseRate > 0) {
      currency.rateChange24h = Number((((currency.exchangeRate - baseRate) / baseRate) * 100).toFixed(2));
    } else {
      currency.rateChange24h = 0;
    }

    return this.currencyRepository.save(currency);
  }

  public async getCurrencyRateHistory(currencyId: string): Promise<CurrencyRateHistory[]> {
    return this.rateHistoryRepo.find({
      where: { currencyId },
      order: { createdAt: 'ASC' },
    });
  }

  public async getCurrencyByStateId(stateId: string): Promise<Currency | null> {
    return this.currencyRepository.findOne({ where: { stateId } });
  }

  public async getCurrencyById(id: string): Promise<unknown> {
    const c = await this.currencyRepository.findOne({
      where: { id },
    });
    if (!c) {
      throw new NotFoundException('Валюта не найдена');
    }

    let stateFlagUrl: string | null = null;
    if (c.stateId) {
      const state = await this.stateRepository.findOne({ where: { id: c.stateId } });
      if (state) {
        stateFlagUrl = state.flagUrl;
      }
    }

    return { ...c, stateFlagUrl };
  }
}
