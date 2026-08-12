import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../entities/company.entity';
import { CompanyShare } from '../entities/company-share.entity';
import { Account } from '../entities/account.entity';
import { CompanySharePriceHistory } from '../entities/company-share-price-history.entity';
import { EconomyService } from './economy.service';

import { StateEntity } from '../../states/entities/state.entity';
import { WithdrawnShare } from '../entities/withdrawn-share.entity';
import { IpoRequest } from '../entities/ipo-request.entity';

@Injectable()
export class StockExchangeService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(CompanyShare)
    private readonly shareRepository: Repository<CompanyShare>,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(StateEntity)
    private readonly stateRepository: Repository<StateEntity>,
    @InjectRepository(CompanySharePriceHistory)
    private readonly sharePriceHistoryRepository: Repository<CompanySharePriceHistory>,
    @InjectRepository(WithdrawnShare)
    private readonly withdrawnShareRepository: Repository<WithdrawnShare>,
    @InjectRepository(IpoRequest)
    private readonly ipoRequestRepository: Repository<IpoRequest>,
    private readonly economyService: EconomyService,
  ) {}

  public async getPublicCompanies(): Promise<Company[]> {
    return this.companyRepository.find({
      where: { isPublic: true },
      order: { sharePrice: 'DESC' },
    });
  }

  public async getMyPortfolio(username: string): Promise<CompanyShare[]> {
    const identities: any[] = [{ ownerType: 'player', ownerId: username.toLowerCase() }];
    
    const states = await this.stateRepository.find({ where: { treasurerUsername: username.toLowerCase() } });
    for (const st of states) {
      identities.push({ ownerType: 'state', ownerId: st.id });
    }

    const companies = await this.companyRepository.find({ where: { ownerUsername: username.toLowerCase() } });
    for (const comp of companies) {
      identities.push({ ownerType: 'company', ownerId: comp.id });
    }

    return this.shareRepository.find({
      where: identities,
    });
  }

  public async conductIPO(
    username: string,
    companyId: string,
    dto: { totalShares?: number; initialPrice?: number; exchangeStateId: string },
  ): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException('Компания не найдена');
    }
    if (company.ownerUsername !== username.toLowerCase()) {
      throw new ForbiddenException(
        'Только владелец компании может провести IPO',
      );
    }
    if (company.isPublic) {
      throw new BadRequestException('Компания уже выведена на биржу');
    }
    if (!company.accountId) {
      throw new BadRequestException('У компании нет коммерческого счета для оплаты пошлины IPO');
    }

    const exchangeState = await this.stateRepository.findOne({ where: { id: dto.exchangeStateId } });
    if (!exchangeState) {
      throw new NotFoundException('Государство (биржа) не найдено');
    }
    if (!exchangeState.treasuryAccountNumber) {
      throw new BadRequestException('У данного государства нет Национального Банка (биржи)');
    }

    const companyAccount = await this.accountRepository.findOne({ where: { id: company.accountId as string } });
    if (!companyAccount) {
      throw new NotFoundException('Коммерческий счет компании не найден');
    }

    const existingRequest = await this.ipoRequestRepository.findOne({
      where: { companyId, status: 'pending' },
    });
    if (existingRequest) {
      throw new BadRequestException('Заявка на IPO уже подана и ожидает рассмотрения');
    }

    const ipoFee = exchangeState.ipoFee || 0;
    if (companyAccount.balance < ipoFee) {
      throw new BadRequestException(`На коммерческом счете компании недостаточно средств для оплаты пошлины (${ipoFee} ${companyAccount.currencyCode})`);
    }

    const request = this.ipoRequestRepository.create({
      companyId,
      companyName: company.name,
      stateId: dto.exchangeStateId,
      totalShares: dto.totalShares || 1000,
      initialPrice: dto.initialPrice || 10.0,
      feeAmount: ipoFee,
      status: 'pending',
    });
    await this.ipoRequestRepository.save(request);

    return company;
  }

  public async getIpoRequests(stateId: string, username: string): Promise<IpoRequest[]> {
    const state = await this.stateRepository.findOne({ where: { id: stateId } });
    if (!state) throw new NotFoundException('Государство не найдено');

    const isTreasurer = state.treasurerUsername?.toLowerCase() === username.toLowerCase();
    const isLeader = state.leaderUsername?.toLowerCase() === username.toLowerCase();
    if (!isTreasurer && !isLeader) {
      throw new ForbiddenException('Только казначей или президент могут просматривать заявки на IPO');
    }

    return this.ipoRequestRepository.find({
      where: { stateId, status: 'pending' },
      order: { createdAt: 'DESC' },
    });
  }

  public async reviewIpoRequest(
    requestId: string,
    action: 'approved' | 'rejected',
    username: string
  ): Promise<IpoRequest> {
    const request = await this.ipoRequestRepository.findOne({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Заявка не найдена');
    if (request.status !== 'pending') throw new BadRequestException('Заявка уже обработана');

    const state = await this.stateRepository.findOne({ where: { id: request.stateId } });
    if (!state) throw new NotFoundException('Государство не найдено');

    const isTreasurer = state.treasurerUsername?.toLowerCase() === username.toLowerCase();
    const isLeader = state.leaderUsername?.toLowerCase() === username.toLowerCase();
    if (!isTreasurer && !isLeader) {
      throw new ForbiddenException('Только казначей или президент могут обрабатывать заявки на IPO');
    }

    if (action === 'rejected') {
      request.status = 'rejected';
      return this.ipoRequestRepository.save(request);
    }

    const company = await this.companyRepository.findOne({ where: { id: request.companyId } });
    if (!company) throw new NotFoundException('Компания не найдена');
    
    const companyAccount = await this.accountRepository.findOne({ where: { id: company.accountId as string } });
    if (!companyAccount) throw new NotFoundException('Коммерческий счет компании не найден');

    if (!state.treasuryAccountNumber) {
      throw new BadRequestException('У данного государства нет Национального Банка (биржи)');
    }

    if (request.feeAmount > 0) {
      try {
        await this.economyService.transferMoney(company.ownerUsername, {
          fromNumber: companyAccount.accountNumber,
          toNumber: state.treasuryAccountNumber,
          amount: request.feeAmount,
          description: `Оплата пошлины за листинг на бирже государства ${state.name}`,
        });
      } catch (err) {
        throw new BadRequestException(`Не удалось списать пошлину за IPO. Возможно, на счету компании недостаточно средств. Ошибка: ${err.message}`);
      }
    }

    company.isPublic = true;
    company.exchangeStateId = request.stateId;
    company.totalShares = request.totalShares;
    company.availableShares = request.totalShares;
    company.sharePrice = request.initialPrice;
    company.priceChange24h = 0.0;

    const savedCompany = await this.companyRepository.save(company);

    const history = this.sharePriceHistoryRepository.create({
      companyId: savedCompany.id,
      price: savedCompany.sharePrice,
    });
    await this.sharePriceHistoryRepository.save(history);

    request.status = 'approved';
    return this.ipoRequestRepository.save(request);
  }

  public async buyShares(
    username: string,
    companyId: string,
    count: number,
    buyerType: 'player' | 'state' | 'company' = 'player',
    buyerId?: string,
  ): Promise<{ company: Company; portfolio: CompanyShare }> {
    await this.economyService.assertUserStateHasCurrency(username);
    if (count <= 0) {
      throw new BadRequestException('Количество акций должно быть больше 0');
    }

    if (!buyerId) buyerId = username.toLowerCase();

    // Права доступа
    if (buyerType === 'state') {
       const state = await this.stateRepository.findOne({ where: { id: buyerId } });
       if (!state || state.treasurerUsername?.toLowerCase() !== username.toLowerCase()) {
         throw new BadRequestException('У вас нет прав казначея этого государства');
       }
    } else if (buyerType === 'company') {
       const comp = await this.companyRepository.findOne({ where: { id: buyerId } });
       if (!comp || comp.ownerUsername?.toLowerCase() !== username.toLowerCase()) {
         throw new BadRequestException('У вас нет прав владельца этой компании');
       }
    } else if (buyerType === 'player' && buyerId !== username.toLowerCase()) {
       throw new BadRequestException('Неверный ID покупателя');
    }

    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company || !company.isPublic || !company.exchangeStateId) {
      throw new NotFoundException('Компания не торгуется на бирже');
    }
    if (company.availableShares < count) {
      throw new BadRequestException('Недостаточно доступных акций на бирже');
    }

    const exchangeState = await this.stateRepository.findOne({ where: { id: company.exchangeStateId } });
    if (!exchangeState || !exchangeState.treasuryAccountNumber) {
      throw new BadRequestException('Биржа недоступна (отсутствует счет казны государства)');
    }

    const companyAccount = await this.accountRepository.findOne({ where: { id: company.accountId as string } });
    if (!companyAccount) {
      throw new NotFoundException('Коммерческий счет компании не найден');
    }

    // Найти счет покупателя
    let buyerAccount: Account | null = null;
    if (buyerType === 'player') {
      buyerAccount = await this.accountRepository.findOne({
        where: { ownerUsername: buyerId, type: 'personal', currencyCode: companyAccount.currencyCode },
      });
    } else if (buyerType === 'state') {
      const state = await this.stateRepository.findOne({ where: { id: buyerId } });
      if (state?.treasuryAccountNumber) {
        buyerAccount = await this.accountRepository.findOne({ where: { accountNumber: state.treasuryAccountNumber } });
      }
    } else if (buyerType === 'company') {
      const comp = await this.companyRepository.findOne({ where: { id: buyerId } });
      if (comp?.accountId) {
        buyerAccount = await this.accountRepository.findOne({ where: { id: comp.accountId } });
      }
    }

    if (!buyerAccount || buyerAccount.currencyCode !== companyAccount.currencyCode) {
      throw new BadRequestException(`Отсутствует нужный счет в валюте биржи (${companyAccount.currencyCode})`);
    }

    const oldPrice = company.sharePrice;
    const priceMultiplier = 1 + (count / company.totalShares) * 0.4;
    const newPrice = Number((oldPrice * priceMultiplier).toFixed(2));
    const executionPrice = Number(((oldPrice + newPrice) / 2).toFixed(2));

    const totalPrice = Number((count * executionPrice).toFixed(2));
    const tradingFeeRate = exchangeState.exchangeTradingFee || 0;
    const tradingFee = Number(((totalPrice * tradingFeeRate) / 100).toFixed(2));
    const amountToCompany = Number((totalPrice - tradingFee).toFixed(2));

    if (buyerAccount.balance < totalPrice) {
      throw new BadRequestException('Недостаточно средств на личном счете');
    }

    // Перевод компании (за вычетом комиссии)
    if (amountToCompany > 0) {
      await this.economyService.transferMoney(username, {
        fromNumber: buyerAccount.accountNumber,
        toNumber: companyAccount.accountNumber,
        amount: amountToCompany,
        description: `Покупка ${count} акций компании ${company.name}`,
      });
    }

    // Перевод комиссии государству
    if (tradingFee > 0) {
      await this.economyService.transferMoney(username, {
        fromNumber: buyerAccount.accountNumber,
        toNumber: exchangeState.treasuryAccountNumber,
        amount: tradingFee,
        description: `Комиссия биржи (покупка акций ${company.name})`,
      });
    }

    // Обновляем акции инвестора
    let shareEntry = await this.shareRepository.findOne({
      where: {
        companyId: company.id,
        ownerType: buyerType,
        ownerId: buyerId,
      },
    });

    if (!shareEntry) {
      shareEntry = this.shareRepository.create({
        companyId: company.id,
        ownerType: buyerType,
        ownerId: buyerId,
        sharesCount: count,
        boughtAtPrice: executionPrice,
      });
    } else {
      const totalCount = shareEntry.sharesCount + count;
      shareEntry.boughtAtPrice = Number(
        (
          (shareEntry.boughtAtPrice * shareEntry.sharesCount +
            executionPrice * count) /
          totalCount
        ).toFixed(2),
      );
      shareEntry.sharesCount = totalCount;
    }

    await this.shareRepository.save(shareEntry);

    // Пересчет цены акции (при покупке цена растет)
    company.sharePrice = newPrice;
    company.availableShares -= count;
    company.priceChange24h = Number(
      (((company.sharePrice - oldPrice) / oldPrice) * 100).toFixed(2),
    );

    await this.companyRepository.save(company);

    const history = this.sharePriceHistoryRepository.create({
      companyId: company.id,
      price: company.sharePrice,
    });
    await this.sharePriceHistoryRepository.save(history);

    return { company, portfolio: shareEntry };
  }

  public async sellShares(
    username: string,
    companyId: string,
    count: number,
    sellerType: 'player' | 'state' | 'company' = 'player',
    sellerId?: string,
  ): Promise<{ company: Company; portfolio: CompanyShare }> {
    await this.economyService.assertUserStateHasCurrency(username);
    if (count <= 0) {
      throw new BadRequestException('Количество акций должно быть больше 0');
    }

    if (!sellerId) sellerId = username.toLowerCase();

    // Права доступа
    if (sellerType === 'state') {
       const state = await this.stateRepository.findOne({ where: { id: sellerId } });
       if (!state || state.treasurerUsername?.toLowerCase() !== username.toLowerCase()) {
         throw new BadRequestException('У вас нет прав казначея этого государства');
       }
    } else if (sellerType === 'company') {
       const comp = await this.companyRepository.findOne({ where: { id: sellerId } });
       if (!comp || comp.ownerUsername?.toLowerCase() !== username.toLowerCase()) {
         throw new BadRequestException('У вас нет прав владельца этой компании');
       }
    } else if (sellerType === 'player' && sellerId !== username.toLowerCase()) {
       throw new BadRequestException('Неверный ID продавца');
    }

    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company || !company.isPublic || !company.exchangeStateId) {
      throw new NotFoundException('Компания не торгуется на бирже');
    }

    const exchangeState = await this.stateRepository.findOne({ where: { id: company.exchangeStateId } });
    if (!exchangeState || !exchangeState.treasuryAccountNumber) {
      throw new BadRequestException('Биржа недоступна (отсутствует счет казны государства)');
    }

    const shareEntry = await this.shareRepository.findOne({
      where: {
        companyId: company.id,
        ownerType: sellerType,
        ownerId: sellerId,
      },
    });

    if (!shareEntry || shareEntry.sharesCount < count) {
      throw new BadRequestException('У вас недостаточно акций для продажи');
    }

    const companyAccount = await this.accountRepository.findOne({ where: { id: company.accountId as string } });
    if (!companyAccount) {
      throw new NotFoundException('Коммерческий счет компании не найден');
    }

    // Найти счет продавца
    let sellerAccount: Account | null = null;
    if (sellerType === 'player') {
      sellerAccount = await this.accountRepository.findOne({
        where: { ownerUsername: sellerId, type: 'personal', currencyCode: companyAccount.currencyCode },
      });
    } else if (sellerType === 'state') {
      const state = await this.stateRepository.findOne({ where: { id: sellerId } });
      if (state?.treasuryAccountNumber) {
        sellerAccount = await this.accountRepository.findOne({ where: { accountNumber: state.treasuryAccountNumber } });
      }
    } else if (sellerType === 'company') {
      const comp = await this.companyRepository.findOne({ where: { id: sellerId } });
      if (comp?.accountId) {
        sellerAccount = await this.accountRepository.findOne({ where: { id: comp.accountId } });
      }
    }

    if (!sellerAccount || sellerAccount.currencyCode !== companyAccount.currencyCode) {
      throw new BadRequestException(`Отсутствует нужный счет в валюте биржи (${companyAccount.currencyCode})`);
    }

    const oldPrice = company.sharePrice;
    const priceMultiplier = Math.max(1 - (count / company.totalShares) * 0.4, 0.1);
    const newPrice = Number((oldPrice * priceMultiplier).toFixed(2));
    const executionPrice = Number(((oldPrice + newPrice) / 2).toFixed(2));

    const totalPrice = Number((count * executionPrice).toFixed(2));
    const tradingFeeRate = exchangeState.exchangeTradingFee || 0;
    const tradingFee = Number(((totalPrice * tradingFeeRate) / 100).toFixed(2));
    const amountToSeller = Number((totalPrice - tradingFee).toFixed(2));

    if (companyAccount.balance < totalPrice) {
      throw new BadRequestException('У компании недостаточно ликвидности для выкупа акций');
    }

    // Перевод от компании продавцу (за вычетом комиссии)
    if (amountToSeller > 0) {
      await this.economyService.transferMoney(company.ownerUsername, {
        fromNumber: companyAccount.accountNumber,
        toNumber: sellerAccount.accountNumber,
        amount: amountToSeller,
        description: `Продажа ${count} акций компании ${company.name}`,
      });
    }

    // Перевод комиссии государству от компании (которая удерживается из суммы продавца)
    if (tradingFee > 0) {
      await this.economyService.transferMoney(company.ownerUsername, {
        fromNumber: companyAccount.accountNumber,
        toNumber: exchangeState.treasuryAccountNumber,
        amount: tradingFee,
        description: `Комиссия биржи (продажа акций ${company.name})`,
      });
    }

    shareEntry.sharesCount -= count;
    await this.shareRepository.save(shareEntry);

    // При продаже цена акций снижается
    company.sharePrice = newPrice;
    company.availableShares += count;
    company.priceChange24h = Number(
      (((company.sharePrice - oldPrice) / oldPrice) * 100).toFixed(2),
    );

    await this.companyRepository.save(company);

    const history = this.sharePriceHistoryRepository.create({
      companyId: company.id,
      price: company.sharePrice,
    });
    await this.sharePriceHistoryRepository.save(history);

    return { company, portfolio: shareEntry };
  }

  public async payDividends(
    username: string,
    companyId: string,
    totalAmount: number,
  ): Promise<{ distributed: number; shareholdersCount: number }> {
    if (totalAmount <= 0) {
      throw new BadRequestException('Сумма дивидендов должна быть больше 0');
    }

    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company || company.ownerUsername !== username.toLowerCase()) {
      throw new ForbiddenException(
        'Только владелец компании может выплачивать дивиденды',
      );
    }

    let companyAccount: Account | null = null;
    if (company.accountId) {
      companyAccount = await this.accountRepository.findOne({
        where: { id: company.accountId },
      });
    }
    if (!companyAccount || companyAccount.balance < totalAmount) {
      throw new BadRequestException(
        'Недостаточно средств на счете компании для выплаты дивидендов',
      );
    }

    const allShares = await this.shareRepository.find({
      where: { companyId: company.id },
    });

    const issuedShares = company.totalShares - company.availableShares;
    if (issuedShares <= 0 || allShares.length === 0) {
      throw new BadRequestException('У компании пока нет акционеров');
    }

    let distributed = 0;
    for (const share of allShares) {
      if (share.sharesCount <= 0) continue;
      const proportion = share.sharesCount / issuedShares;
      const payout = Number((totalAmount * proportion).toFixed(2));

      if (payout <= 0) continue;

      let acc: Account | null = null;
      if (share.ownerType === 'player') {
        acc = await this.accountRepository.findOne({
          where: { ownerUsername: share.ownerId, type: 'personal', currencyCode: companyAccount.currencyCode },
        });
      } else if (share.ownerType === 'state') {
        const st = await this.stateRepository.findOne({ where: { id: share.ownerId } });
        if (st?.treasuryAccountNumber) {
          acc = await this.accountRepository.findOne({ where: { accountNumber: st.treasuryAccountNumber } });
        }
      } else if (share.ownerType === 'company') {
        const comp = await this.companyRepository.findOne({ where: { id: share.ownerId } });
        if (comp?.accountId) {
          acc = await this.accountRepository.findOne({ where: { id: comp.accountId } });
        }
      }

      if (acc && acc.currencyCode === companyAccount.currencyCode) {
        try {
          await this.economyService.transferMoney(username, {
            fromNumber: companyAccount.accountNumber,
            toNumber: acc.accountNumber,
            amount: payout,
            description: `Выплата дивидендов компании ${company.name}`,
          });
          distributed += payout;
        } catch (e) {
          // Игнорируем ошибку перевода для конкретного пользователя, чтобы не прерывать цикл
        }
      }
    }

    return { distributed, shareholdersCount: allShares.length };
  }

  public async getCompanySharePriceHistory(companyId: string): Promise<CompanySharePriceHistory[]> {
    return this.sharePriceHistoryRepository.find({
      where: { companyId },
      order: { createdAt: 'ASC' },
    });
  }

  public async changeCompanySharePrice(username: string, companyId: string, newPrice: number): Promise<Company> {
    if (newPrice <= 0) {
      throw new BadRequestException('Цена должна быть больше 0');
    }

    const company = await this.companyRepository.findOne({ where: { id: companyId } });
    if (!company) {
      throw new NotFoundException('Компания не найдена');
    }
    if (!company.isPublic || !company.exchangeStateId) {
      throw new BadRequestException('Компания не торгуется на бирже');
    }

    const state = await this.stateRepository.findOne({ where: { id: company.exchangeStateId } });
    if (!state) {
      throw new NotFoundException('Государство (биржа) не найдено');
    }

    if (state.treasurerUsername?.toLowerCase() !== username.toLowerCase()) {
      throw new ForbiddenException('Только Казначей государства может менять котировки на бирже');
    }

    // Расчет изменения в %
    const oldPrice = company.sharePrice;
    let changePercentage = 0;
    if (oldPrice > 0) {
      changePercentage = ((newPrice - oldPrice) / oldPrice) * 100;
    }

    company.sharePrice = newPrice;
    company.priceChange24h = changePercentage;
    const savedCompany = await this.companyRepository.save(company);

    const history = this.sharePriceHistoryRepository.create({
      companyId: savedCompany.id,
      price: savedCompany.sharePrice,
    });
    await this.sharePriceHistoryRepository.save(history);

    return savedCompany;
  }

  public async getModPortfolio(entityId: string, entityType: 'player' | 'state' | 'company'): Promise<any[]> {
    const identities: any[] = [{ ownerType: entityType, ownerId: entityId.toLowerCase() }];
    const shares = await this.shareRepository.find({
      where: identities,
    });
    
    const companyIds = shares.map(s => s.companyId);
    let companies: Company[] = [];
    if (companyIds.length > 0) {
      companies = await this.companyRepository.createQueryBuilder('c')
        .where('c.id IN (:...companyIds)', { companyIds })
        .getMany();
    }
    
    return shares.map(s => {
      const comp = companies.find(c => c.id === s.companyId);
      return {
        ...s,
        companyName: comp?.name || 'Неизвестная компания',
        exchangeStateId: comp?.exchangeStateId
      };
    });
  }

  public async withdrawShares(entityId: string, entityType: 'player' | 'state' | 'company', companyId: string, count: number): Promise<WithdrawnShare> {
    const lowerId = entityId.toLowerCase();
    const shareRecord = await this.shareRepository.findOne({
      where: { ownerType: entityType, ownerId: lowerId, companyId }
    });
    
    if (!shareRecord || shareRecord.sharesCount < count) {
      throw new BadRequestException('Недостаточно акций для вывода');
    }
    
    shareRecord.sharesCount -= count;
    await this.shareRepository.save(shareRecord);
    
    const withdrawn = this.withdrawnShareRepository.create({
      companyId,
      sharesCount: count,
      boughtAtPrice: shareRecord.boughtAtPrice,
      issuedBy: lowerId,
      issuedByType: entityType
    });
    
    return this.withdrawnShareRepository.save(withdrawn);
  }

  public async depositShares(entityId: string, entityType: 'player' | 'state' | 'company', certificateId: string): Promise<boolean> {
    const withdrawn = await this.withdrawnShareRepository.findOne({ where: { id: certificateId } });
    if (!withdrawn) {
      throw new BadRequestException('Сертификат недействителен или уже погашен');
    }
    
    const lowerId = entityId.toLowerCase();
    
    let shareRecord = await this.shareRepository.findOne({
      where: { ownerType: entityType, ownerId: lowerId, companyId: withdrawn.companyId }
    });
    
    if (!shareRecord) {
      shareRecord = this.shareRepository.create({
        ownerType: entityType,
        ownerId: lowerId,
        companyId: withdrawn.companyId,
        sharesCount: withdrawn.sharesCount,
        boughtAtPrice: withdrawn.boughtAtPrice
      });
    } else {
      const totalCount = shareRecord.sharesCount + withdrawn.sharesCount;
      const avgPrice = ((shareRecord.sharesCount * shareRecord.boughtAtPrice) + (withdrawn.sharesCount * withdrawn.boughtAtPrice)) / totalCount;
      shareRecord.sharesCount = totalCount;
      shareRecord.boughtAtPrice = avgPrice;
    }
    
    await this.shareRepository.save(shareRecord);
    await this.withdrawnShareRepository.remove(withdrawn);
    
    return true;
  }
}
