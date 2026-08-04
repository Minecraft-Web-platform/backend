import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../entities/company.entity';
import { Account } from '../entities/account.entity';
import { CityEntity } from '../../states/entities/city.entity';
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
    @InjectRepository(CityEntity)
    private readonly cityRepository: Repository<CityEntity>,
    @InjectRepository(StateEntity)
    private readonly stateRepository: Repository<StateEntity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly economyService: EconomyService,
  ) {}

  public async getAllCompanies(filters?: {
    cityId?: string;
    stateId?: string;
  }): Promise<Company[]> {
    const where: any = {};
    if (filters?.cityId) where.cityId = filters.cityId;
    if (filters?.stateId) where.stateId = filters.stateId;

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
      cityId?: string;
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
      throw new BadRequestException(
        'Регистрировать фирму может только игрок с подтвержденной почтой',
      );
    }
    if (!user.cityId && !user.stateId) {
      throw new BadRequestException(
        'Регистрировать фирму могут только граждане какого-либо государства или города',
      );
    }
    let targetStateId = dto.stateId;
    if (!targetStateId && dto.cityId) {
      const cityObj = await this.cityRepository.findOne({
        where: { id: dto.cityId },
      });
      if (cityObj?.stateId) {
        targetStateId = cityObj.stateId;
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

    if (dto.cityId) {
      const city = await this.cityRepository.findOne({
        where: { id: dto.cityId },
      });
      if (!city) {
        throw new NotFoundException('Город юрисдикции не найден');
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
    const accountNumber =
      '40702' +
      Math.floor(100000000000000 + Math.random() * 900000000000000).toString();

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
      cityId: dto.cityId || null,
      stateId: dto.stateId || null,
      accountId: savedAccount.id,
      isPublic: false,
      totalShares: 1000,
      availableShares: 1000,
      sharePrice: 10.0,
      priceChange24h: 0.0,
    });

    return this.companyRepository.save(company);
  }
}
