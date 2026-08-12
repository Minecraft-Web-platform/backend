import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Property, PropertyCategory, PropertyOwnerType } from '../entities/property.entity';
import { Company } from '../entities/company.entity';
import { StateEntity } from '../../states/entities/state.entity';
import { EconomyService } from './economy.service';
import { CurrenciesService } from './currencies.service';
import { Account } from '../entities/account.entity';

export interface CreatePropertyDto {
  name: string;
  description?: string;
  propertyCategory: PropertyCategory;
  type: string;
  subType?: string;
  cityId?: string;
  stateId: string;
  ownerId: string;
  ownerType: PropertyOwnerType;
  centerCoordinates?: string;
  photoUrls?: string[];
  parentPropertyId?: string;
  streetId?: string;
  houseNumber?: string;
  area?: number;
}

@Injectable()
export class PropertyService {
  constructor(
    @InjectRepository(Property)
    private propertyRepo: Repository<Property>,
    @InjectRepository(Account)
    private accountRepo: Repository<Account>,
    @InjectRepository(Company)
    private companyRepo: Repository<Company>,
    @InjectRepository(StateEntity)
    private stateRepo: Repository<StateEntity>,
    private economyService: EconomyService,
    private currenciesService: CurrenciesService,
  ) {}

  private async getAccountForUser(ownerId: string, currencyCode: string): Promise<Account> {
    const acc = await this.accountRepo.findOne({
      where: { ownerUsername: ownerId, currencyCode },
    });
    if (!acc) throw new NotFoundException(`У владельца ${ownerId} нет счета в валюте ${currencyCode}`);
    return acc;
  }

  private async getTreasuryAccount(stateId: string, currencyCode: string): Promise<Account> {
    const state = await this.stateRepo.findOne({ where: { id: stateId } });
    if (!state || !state.treasuryAccountNumber) {
      throw new NotFoundException(`Государство ${stateId} не найдено или у него нет казначейского счета`);
    }
    const acc = await this.accountRepo.findOne({
      where: { accountNumber: state.treasuryAccountNumber, currencyCode },
    });
    if (!acc) throw new NotFoundException(`Казначейский счет государства ${stateId} в валюте ${currencyCode} не найден`);
    return acc;
  }

  async createProperty(creatorUsername: string, dto: CreatePropertyDto): Promise<Property> {
    // 1. Find the currency for this state
    const currency = await this.currenciesService.getCurrencyByStateId(dto.stateId);
    if (!currency) {
      throw new NotFoundException(`Валюта для государства ${dto.stateId} не найдена`);
    }

    if (dto.ownerType !== 'government') {
      const creationFee = currency.totalIssued / currency.propertyCreationFeeRate;

      // 2. Transfer fee from creator to state treasury
      let creatorAccountNumber: string;

      if (dto.ownerType === 'company') {
        const company = await this.companyRepo.findOne({ where: { id: dto.ownerId } });
        if (!company) throw new NotFoundException('Company not found');
        const acc = await this.accountRepo.findOne({ where: { id: company.accountId! } });
        if (!acc) throw new NotFoundException('Company account not found');
        creatorAccountNumber = acc.accountNumber;
      } else {
        const creatorAccount = await this.getAccountForUser(creatorUsername, currency.code);
        creatorAccountNumber = creatorAccount.accountNumber;
      }

      const treasuryAccount = await this.getTreasuryAccount(dto.stateId, currency.code);

      await this.economyService.transferMoney(creatorUsername, {
        fromNumber: creatorAccountNumber,
        toNumber: treasuryAccount.accountNumber,
        amount: creationFee,
        description: `Налог на регистрацию имущества: ${dto.name}`,
      });
    }

    // 3. Create property
    const prop = this.propertyRepo.create({
      ...dto,
      isForSale: false,
      price: null,
    });
    return this.propertyRepo.save(prop);
  }

  async listPropertyForSale(ownerUsername: string, propertyId: string, price: number): Promise<Property> {
    if (price <= 0) throw new BadRequestException('Цена должна быть больше 0');
    
    const prop = await this.propertyRepo.findOne({ where: { id: propertyId } });
    if (!prop) throw new NotFoundException('Имущество не найдено');
    
    // Note: We skip exact permission checking for company/government properties here for simplicity. 
    // Ideally, we'd check if `ownerUsername` has the right to sell `prop.ownerId`.
    
    prop.isForSale = true;
    prop.price = price;
    return this.propertyRepo.save(prop);
  }

  async cancelListing(ownerUsername: string, propertyId: string): Promise<Property> {
    const prop = await this.propertyRepo.findOne({ where: { id: propertyId } });
    if (!prop) throw new NotFoundException('Имущество не найдено');
    
    prop.isForSale = false;
    prop.price = null;
    return this.propertyRepo.save(prop);
  }

  async buyProperty(buyerUsername: string, propertyId: string, newOwnerId: string, newOwnerType: PropertyOwnerType): Promise<Property> {
    const prop = await this.propertyRepo.findOne({ where: { id: propertyId } });
    if (!prop) throw new NotFoundException('Имущество не найдено');
    if (!prop.isForSale || !prop.price) throw new BadRequestException('Это имущество не продается');

    const currency = await this.currenciesService.getCurrencyByStateId(prop.stateId);
    if (!currency) throw new NotFoundException(`Валюта для государства ${prop.stateId} не найдена`);

    const buyerAccount = await this.getAccountForUser(newOwnerId, currency.code);
    const sellerAccount = await this.getAccountForUser(prop.ownerId, currency.code);
    const treasuryAccount = await this.getTreasuryAccount(prop.stateId, currency.code);

    const tax = prop.price * currency.propertySalesTaxRate;
    const sellerGets = prop.price - tax;

    // Buyer -> Seller
    await this.economyService.transferMoney(buyerUsername, {
      fromNumber: buyerAccount.accountNumber,
      toNumber: sellerAccount.accountNumber,
      amount: sellerGets,
      description: `Покупка имущества: ${prop.name}`,
    });

    // Buyer -> Treasury (Tax)
    if (tax > 0) {
      await this.economyService.transferMoney(buyerUsername, {
        fromNumber: buyerAccount.accountNumber,
        toNumber: treasuryAccount.accountNumber,
        amount: tax,
        description: `Налог с продажи имущества: ${prop.name}`,
      });
    }

    prop.ownerId = newOwnerId;
    prop.ownerType = newOwnerType;
    prop.isForSale = false;
    prop.price = null;
    return this.propertyRepo.save(prop);
  }

  async getPropertiesByOwner(ownerId: string): Promise<Property[]> {
    return this.propertyRepo.find({ where: { ownerId }, relations: ['street'] });
  }

  async getMyProperties(username: string, uuid: string): Promise<Property[]> {
    const ownerIds: string[] = [uuid];
    
    const companies = await this.companyRepo.find({ where: { ownerUsername: username } });
    companies.forEach(c => ownerIds.push(c.id));

    const state = await this.stateRepo.findOne({ where: { leaderUsername: username } });
    if (state) ownerIds.push(state.id);

    return this.propertyRepo.find({
      where: { ownerId: In(ownerIds) },
      relations: ['street']
    });
  }

  async getMarketProperties(stateId?: string): Promise<Property[]> {
    if (stateId) {
      return this.propertyRepo.find({ where: { stateId, isForSale: true }, relations: ['street'] });
    }
    return this.propertyRepo.find({ where: { isForSale: true }, relations: ['street'] });
  }
}
