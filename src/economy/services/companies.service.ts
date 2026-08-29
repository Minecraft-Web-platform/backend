import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../entities/company.entity';
import { Account } from '../entities/account.entity';
import { SettlementEntity } from '../../states/entities/settlement.entity';
import { StateEntity } from '../../states/entities/state.entity';
import { User } from '../../users/entities/user.entity';
import { EconomyService } from './economy.service';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(SettlementEntity)
    private readonly settlementRepository: Repository<SettlementEntity>,
    @InjectRepository(StateEntity)
    private readonly stateRepository: Repository<StateEntity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly economyService: EconomyService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  public async getAllCompanies(filters?: {
    settlementId?: string;
    stateId?: string;
    ownerUsername?: string;
  }): Promise<Company[]> {
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { isArchived: false };
    if (filters?.settlementId) where.settlementId = filters.settlementId;
    if (filters?.stateId) where.stateId = filters.stateId;
    if (filters?.ownerUsername) where.ownerUsername = filters.ownerUsername;

    return this.companyRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  public async getCompanyById(id: string): Promise<Company> {
    const company = await this.companyRepository.findOne({ where: { id } });
    if (!company) {
      throw new NotFoundException('Компания не найдена');
    }
    return company;
  }

  public async createCompany(
    username: string,
    dto: {
      name: string;
      description?: string;
      logoUrl?: string;
      settlementId?: string;
      stateId?: string;
    },
  ): Promise<Company> {
    const user = await this.userRepository.findOne({
      where: { username_lower: username.toLowerCase() },
    });
    if (!user) {
      throw new NotFoundException('Игрок не найден');
    }
    if (!user.emailIsConfirmed) {
      throw new BadRequestException('Регистрировать фирму может только игрок с подтвержденной почтой');
    }
    if (!user.settlementId && !user.stateId) {
      throw new BadRequestException('Регистрировать фирму могут только граждане какого-либо государства или поселения');
    }
    let targetStateId = dto.stateId;
    if (!targetStateId && dto.settlementId) {
      const settlementObj = await this.settlementRepository.findOne({
        where: { id: dto.settlementId },
      });
      if (settlementObj?.stateId) {
        targetStateId = settlementObj.stateId;
      }
    }

    let nationalCurrency;
    if (targetStateId) {
      nationalCurrency = await this.economyService.getCurrencyForState(targetStateId);
    } else {
      nationalCurrency = await this.economyService.assertUserStateHasCurrency(username);
    }

    const existing = await this.companyRepository.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new BadRequestException('Компания с таким названием уже существует');
    }

    if (dto.settlementId) {
      const settlement = await this.settlementRepository.findOne({
        where: { id: dto.settlementId },
      });
      if (!settlement) {
        throw new NotFoundException('Поселение юрисдикции не найден');
      }
    }
    if (dto.stateId) {
      const state = await this.stateRepository.findOne({
        where: { id: dto.stateId },
      });
      if (!state) {
        throw new NotFoundException('Государство юрисдикции не найдено');
      }
    }

    // Создадим коммерческий счет для компании
    const accountNumber = '40702' + Math.floor(100000000000000 + Math.random() * 900000000000000).toString();

    const account = this.accountRepository.create({
      accountNumber,
      ownerUsername: username.toLowerCase(),
      type: 'company',
      balance: 0,
      currencyCode: nationalCurrency.code,
    });
    const savedAccount = await this.accountRepository.save(account);

    const company = this.companyRepository.create({
      name: dto.name,
      description: dto.description || '',
      // TODO: сделать загрузку лого компании на s3 хранилище, но пока что этого не будем делать.
      logoUrl: dto.logoUrl || '',
      ownerUsername: username.toLowerCase(),
      settlementId: dto.settlementId || null,
      stateId: dto.stateId || null,
      accountId: savedAccount.id,
      isPublic: false,
      totalShares: 1000,
      availableShares: 1000,
      sharePrice: 10.0,
      priceChange24h: 0.0,
    });

    const savedCompany = await this.companyRepository.save(company);

    if (user.stateId && nationalCurrency.stateId && user.stateId !== nationalCurrency.stateId) {
      this.eventEmitter.emit('bank.account.offshore.created', { initiatorUsername: username.toLowerCase() });
    }

    this.eventEmitter.emit('company.created', { initiatorUsername: username.toLowerCase() });

    const userCompaniesCount = await this.companyRepository.count({
      where: { ownerUsername: username.toLowerCase() },
    });

    if (userCompaniesCount === 5) {
      this.eventEmitter.emit('company.created.fifth', { initiatorUsername: username.toLowerCase() });
    }

    return savedCompany;
  }

  public async updateCompany(
    id: string,
    dto: { name?: string; description?: string; logoUrl?: string },
    username?: string,
  ): Promise<Company> {
    const company = await this.getCompanyById(id);
    if (username) {
      const user = await this.userRepository.findOne({ where: { username_lower: username.toLowerCase() } });
      if (company.ownerUsername !== username.toLowerCase() && !user?.isAdmin) {
        throw new ForbiddenException('Только владелец или администратор могут редактировать компанию');
      }
    }

    if (dto.name !== undefined) company.name = dto.name;
    if (dto.description !== undefined) company.description = dto.description;
    if (dto.logoUrl !== undefined) company.logoUrl = dto.logoUrl;

    return this.companyRepository.save(company);
  }

  public async archiveCompany(id: string, username?: string): Promise<void> {
    const company = await this.getCompanyById(id);
    if (username) {
      const user = await this.userRepository.findOne({ where: { username_lower: username.toLowerCase() } });
      if (company.ownerUsername !== username.toLowerCase() && !user?.isAdmin) {
        throw new ForbiddenException('Только владелец или администратор могут удалить (архивировать) компанию');
      }
    }

    if (company.accountId) {
      const account = await this.accountRepository.findOne({ where: { id: company.accountId } });
      if (account && account.balance > 0) {
        throw new BadRequestException('Невозможно закрыть компанию, пока на ее счете есть деньги. Выведите средства.');
      }
    }

    company.isArchived = true;
    await this.companyRepository.save(company);

    if (company.accountId) {
      await this.accountRepository.delete(company.accountId);
    }
  }
}
