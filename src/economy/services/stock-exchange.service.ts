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

@Injectable()
export class StockExchangeService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(CompanyShare)
    private readonly shareRepository: Repository<CompanyShare>,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
  ) {}

  public async getPublicCompanies(): Promise<Company[]> {
    return this.companyRepository.find({
      where: { isPublic: true },
      order: { sharePrice: 'DESC' },
    });
  }

  public async getMyPortfolio(username: string): Promise<CompanyShare[]> {
    return this.shareRepository.find({
      where: { ownerUsername: username.toLowerCase() },
      order: { sharesCount: 'DESC' },
    });
  }

  public async conductIPO(
    username: string,
    companyId: string,
    dto: { totalShares?: number; initialPrice?: number },
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

    company.isPublic = true;
    company.totalShares = dto.totalShares || 1000;
    company.availableShares = company.totalShares;
    company.sharePrice = dto.initialPrice || 10.0;
    company.priceChange24h = 0.0;

    return this.companyRepository.save(company);
  }

  public async buyShares(
    username: string,
    companyId: string,
    count: number,
  ): Promise<{ company: Company; portfolio: CompanyShare }> {
    if (count <= 0) {
      throw new BadRequestException('Количество акций должно быть больше 0');
    }

    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company || !company.isPublic) {
      throw new NotFoundException('Компания не торгуется на бирже');
    }
    if (company.availableShares < count) {
      throw new BadRequestException('Недостаточно доступных акций на бирже');
    }

    const totalPrice = Number((count * company.sharePrice).toFixed(2));

    // Найти личный счет покупателя
    const buyerAccount = await this.accountRepository.findOne({
      where: { ownerUsername: username.toLowerCase(), type: 'personal' },
    });
    if (!buyerAccount || buyerAccount.balance < totalPrice) {
      throw new BadRequestException('Недостаточно средств на личном счете');
    }

    // Найти счет компании
    let companyAccount: Account | null = null;
    if (company.accountId) {
      companyAccount = await this.accountRepository.findOne({
        where: { id: company.accountId },
      });
    }
    if (companyAccount) {
      companyAccount.balance = Number(
        (companyAccount.balance + totalPrice).toFixed(2),
      );
      await this.accountRepository.save(companyAccount);
    }

    buyerAccount.balance = Number((buyerAccount.balance - totalPrice).toFixed(2));
    await this.accountRepository.save(buyerAccount);

    // Обновляем акции инвестора
    let shareEntry = await this.shareRepository.findOne({
      where: {
        companyId: company.id,
        ownerUsername: username.toLowerCase(),
      },
    });

    if (!shareEntry) {
      shareEntry = this.shareRepository.create({
        companyId: company.id,
        ownerUsername: username.toLowerCase(),
        sharesCount: count,
        boughtAtPrice: company.sharePrice,
      });
    } else {
      const totalCount = shareEntry.sharesCount + count;
      shareEntry.boughtAtPrice = Number(
        (
          (shareEntry.boughtAtPrice * shareEntry.sharesCount + totalPrice) /
          totalCount
        ).toFixed(2),
      );
      shareEntry.sharesCount = totalCount;
    }

    await this.shareRepository.save(shareEntry);

    // Пересчет цены акции (при покупке цена растет)
    const oldPrice = company.sharePrice;
    const priceMultiplier = 1 + (count / company.totalShares) * 0.4;
    company.sharePrice = Number((oldPrice * priceMultiplier).toFixed(2));
    company.availableShares -= count;
    company.priceChange24h = Number(
      (((company.sharePrice - oldPrice) / oldPrice) * 100).toFixed(2),
    );

    await this.companyRepository.save(company);

    return { company, portfolio: shareEntry };
  }

  public async sellShares(
    username: string,
    companyId: string,
    count: number,
  ): Promise<{ company: Company; portfolio: CompanyShare }> {
    if (count <= 0) {
      throw new BadRequestException('Количество акций должно быть больше 0');
    }

    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company || !company.isPublic) {
      throw new NotFoundException('Компания не торгуется на бирже');
    }

    const shareEntry = await this.shareRepository.findOne({
      where: {
        companyId: company.id,
        ownerUsername: username.toLowerCase(),
      },
    });

    if (!shareEntry || shareEntry.sharesCount < count) {
      throw new BadRequestException('У вас недостаточно акций для продажи');
    }

    const totalPrice = Number((count * company.sharePrice).toFixed(2));

    const buyerAccount = await this.accountRepository.findOne({
      where: { ownerUsername: username.toLowerCase(), type: 'personal' },
    });
    if (!buyerAccount) {
      throw new BadRequestException('У вас нет личного счета для зачисления');
    }

    let companyAccount: Account | null = null;
    if (company.accountId) {
      companyAccount = await this.accountRepository.findOne({
        where: { id: company.accountId },
      });
    }
    if (companyAccount) {
      if (companyAccount.balance < totalPrice) {
        throw new BadRequestException(
          'У компании недостаточно ликвидности для выкупа акций',
        );
      }
      companyAccount.balance = Number(
        (companyAccount.balance - totalPrice).toFixed(2),
      );
      await this.accountRepository.save(companyAccount);
    }

    buyerAccount.balance = Number((buyerAccount.balance + totalPrice).toFixed(2));
    await this.accountRepository.save(buyerAccount);

    shareEntry.sharesCount -= count;
    await this.shareRepository.save(shareEntry);

    // При продаже цена акций снижается
    const oldPrice = company.sharePrice;
    const priceMultiplier = Math.max(1 - (count / company.totalShares) * 0.4, 0.1);
    company.sharePrice = Number((oldPrice * priceMultiplier).toFixed(2));
    company.availableShares += count;
    company.priceChange24h = Number(
      (((company.sharePrice - oldPrice) / oldPrice) * 100).toFixed(2),
    );

    await this.companyRepository.save(company);

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

      const acc = await this.accountRepository.findOne({
        where: { ownerUsername: share.ownerUsername, type: 'personal' },
      });
      if (acc) {
        acc.balance = Number((acc.balance + payout).toFixed(2));
        await this.accountRepository.save(acc);
        distributed += payout;
      }
    }

    companyAccount.balance = Number(
      (companyAccount.balance - distributed).toFixed(2),
    );
    await this.accountRepository.save(companyAccount);

    return { distributed, shareholdersCount: allShares.length };
  }
}
