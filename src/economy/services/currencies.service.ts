import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Currency } from '../entities/currency.entity';
import { StateEntity } from '../../states/entities/state.entity';
import { Account } from '../entities/account.entity';

import { StateTreasuryItemEntity } from '../../states/entities/state-treasury-item.entity';

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
  ) {}

  public async getAllCurrencies(): Promise<Currency[]> {
    const currencies = await this.currencyRepository.find({
      order: { createdAt: 'ASC' },
    });

    // Автоматический пересчет курса для каждой валюты
    for (const cur of currencies) {
      if (cur.stateId) {
        await this.recalculateExchangeRate(cur);
      }
    }

    return currencies;
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
        relations: ['citizens', 'cities'],
      });
      if (!state) {
        throw new NotFoundException('Государство не найдено');
      }
      if (state.leaderUsername !== username.toLowerCase()) {
        throw new ForbiddenException(
          'Только правитель государства может создавать национальную валюту',
        );
      }
      if (!state.treasuryAccountNumber) {
        throw new BadRequestException(
          'Сначала необходимо учредить Национальный банк государства (счёт казны)!',
        );
      }
      const existingStateCur = await this.currencyRepository.findOne({
        where: { stateId: dto.stateId },
      });
      if (existingStateCur) {
        throw new BadRequestException(
          'У этого государства уже выпущена национальная валюта: ' +
            existingStateCur.code,
        );
      }
    }

    const mainItem = dto.minecraftItemId || 'createdeco:gold_coin';
    const kopeckItem = dto.kopeckItemId || 'createdeco:copper_coin';
    if (mainItem === kopeckItem) {
      throw new BadRequestException(
        'Основная и разменная монета не могут быть одинаковым предметом',
      );
    }

    const currency = this.currencyRepository.create({
      stateId: dto.stateId || null,
      code: dto.code.toUpperCase(),
      name: dto.name,
      minecraftItemId: mainItem,
      kopeckItemId: kopeckItem,
      minecraftEnchantment: dto.minecraftEnchantment || 'unbreaking:3',
      totalIssued: 1000,
      reserves: 1000,
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

    return this.recalculateExchangeRate(saved);
  }

  public async issueCurrency(
    username: string,
    currencyId: string,
    amount: number,
  ): Promise<Currency> {
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
        throw new ForbiddenException(
          'Только правитель может эмитировать национальную валюту',
        );
      }
    }

    const oldRate = currency.exchangeRate;
    currency.totalIssued = Number((currency.totalIssued + amount).toFixed(2));
    await this.currencyRepository.save(currency);

    const updated = await this.recalculateExchangeRate(currency);
    // Рассчитаем процентное изменение после эмиссии
    if (oldRate > 0) {
      updated.rateChange24h = Number(
        (((updated.exchangeRate - oldRate) / oldRate) * 100).toFixed(2),
      );
      await this.currencyRepository.save(updated);
    }

    return updated;
  }

  private async recalculateExchangeRate(currency: Currency): Promise<Currency> {
    let basePower = 0;
    let taxCoefficient = 1.0;

    if (currency.stateId) {
      const state = await this.stateRepository.findOne({
        where: { id: currency.stateId },
        relations: ['citizens', 'cities', 'cities.citizens'],
      });
      if (state) {
        const citizensCount = state.citizens?.length || 0;
        const activeCitiesCount =
          state.cities?.filter((c) => (c.citizens?.length || 0) >= 1).length ||
          0;

        const taxRate = state.taxRate || 5;
        if (taxRate <= 10) {
          taxCoefficient = 1.0;
        } else if (taxRate <= 25) {
          taxCoefficient = 0.95;
        } else {
          taxCoefficient = 0.85;
        }

        basePower += citizensCount * 10 + activeCitiesCount * 100;
      }
    }

    if (currency.createdAt) {
      const ageInDays =
        (Date.now() - new Date(currency.createdAt).getTime()) /
        (1000 * 60 * 60 * 24);
      const ageWeeks = Math.floor(Math.max(0, ageInDays) / 7);
      basePower += ageWeeks * 50;
    }

    // Calculate physical reserves from Treasury
    if (currency.stateId) {
      const treasuryItems = await this.treasuryRepo.find({
        where: { stateId: currency.stateId },
      });
      const ITEM_VALUES: Record<string, number> = {
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
    currency.exchangeRate = Number(Math.max(calculatedRate, 0.01).toFixed(4));

    return this.currencyRepository.save(currency);
  }
}
