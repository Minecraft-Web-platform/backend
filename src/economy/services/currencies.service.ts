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

@Injectable()
export class CurrenciesService {
  constructor(
    @InjectRepository(Currency)
    private readonly currencyRepository: Repository<Currency>,
    @InjectRepository(StateEntity)
    private readonly stateRepository: Repository<StateEntity>,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
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

    const currency = this.currencyRepository.create({
      stateId: dto.stateId || null,
      code: dto.code.toUpperCase(),
      name: dto.name,
      minecraftItemId: dto.minecraftItemId || 'minecraft:diamond',
      kopeckItemId: dto.kopeckItemId || 'minecraft:gold_nugget',
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
    let economicPower = 0;
    if (currency.stateId) {
      const state = await this.stateRepository.findOne({
        where: { id: currency.stateId },
        relations: ['citizens', 'cities'],
      });
      if (state) {
        const citizensCount = state.citizens?.length || 0;
        const citiesCount = state.cities?.length || 0;
        economicPower = citizensCount * 10 + citiesCount * 50;
      }
    }

    const totalIssued = Math.max(currency.totalIssued, 1);
    const calculatedRate = (currency.reserves + economicPower) / totalIssued;
    currency.exchangeRate = Number(Math.max(calculatedRate, 0.01).toFixed(4));

    return this.currencyRepository.save(currency);
  }
}
