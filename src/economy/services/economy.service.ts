import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account, AccountType } from '../entities/account.entity';
import { CreditCard } from '../entities/credit-card.entity';
import { Transfer } from '../entities/transfer.entity';
import { CityEntity } from '../../states/entities/city.entity';
import { StateEntity } from '../../states/entities/state.entity';

@Injectable()
export class EconomyService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(CreditCard)
    private readonly cardRepository: Repository<CreditCard>,
    @InjectRepository(Transfer)
    private readonly transferRepository: Repository<Transfer>,
    @InjectRepository(CityEntity)
    private readonly cityRepository: Repository<CityEntity>,
    @InjectRepository(StateEntity)
    private readonly stateRepository: Repository<StateEntity>,
  ) {}

  public async getMyAccounts(username: string): Promise<{
    accounts: Account[];
    cards: CreditCard[];
  }> {
    const lower = username.toLowerCase();
    const accounts = await this.accountRepository.find({
      where: { ownerUsername: lower },
      order: { createdAt: 'DESC' },
    });
    const accountIds = accounts.map((a) => a.id);
    let cards: CreditCard[] = [];
    if (accountIds.length > 0) {
      cards = await this.cardRepository
        .createQueryBuilder('card')
        .where('card.accountId IN (:...ids)', { ids: accountIds })
        .getMany();
    }
    return { accounts, cards };
  }

  public async createAccount(
    username: string,
    dto: { type?: AccountType; currencyCode?: string; ownerUsername?: string },
  ): Promise<Account> {
    const owner = dto.ownerUsername
      ? dto.ownerUsername.toLowerCase()
      : username.toLowerCase();
    const accountNumber =
      '40817' +
      Math.floor(100000000000000 + Math.random() * 900000000000000).toString();

    const account = this.accountRepository.create({
      accountNumber,
      ownerUsername: owner,
      type: dto.type || 'personal',
      balance: 1000,
      currencyCode: dto.currencyCode || 'AR',
    });

    return this.accountRepository.save(account);
  }

  public async issueCard(
    username: string,
    accountId: string,
  ): Promise<CreditCard> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId },
    });
    if (!account) {
      throw new NotFoundException('Счет не найден');
    }
    if (account.ownerUsername !== username.toLowerCase()) {
      throw new BadRequestException('Вы не являетесь владельцем этого счета');
    }

    const cardNumber = Math.floor(
      1000000000000000 + Math.random() * 9000000000000000,
    ).toString();
    const cvv = Math.floor(100 + Math.random() * 900).toString();
    const expiresAt = '12/29';

    const card = this.cardRepository.create({
      cardNumber,
      cvv,
      expiresAt,
      accountId: account.id,
      isBlocked: false,
    });

    return this.cardRepository.save(card);
  }

  public async transferMoney(
    username: string,
    dto: {
      fromNumber: string;
      toNumber: string;
      amount: number;
      description?: string;
    },
  ): Promise<Transfer> {
    if (dto.amount <= 0) {
      throw new BadRequestException('Сумма перевода должна быть больше 0');
    }

    // Найти счет отправителя
    const senderAccount = await this.resolveAccount(dto.fromNumber);
    if (!senderAccount) {
      throw new NotFoundException('Счет отправителя не найден');
    }
    if (senderAccount.ownerUsername !== username.toLowerCase()) {
      throw new BadRequestException(
        'Вы можете переводить средства только со своего счета',
      );
    }
    if (senderAccount.balance < dto.amount) {
      throw new BadRequestException('Недостаточно средств на счете');
    }

    // Найти счет получателя (по номеру счета, номеру карты или никнейму)
    const receiverAccount = await this.resolveAccount(dto.toNumber);
    if (!receiverAccount) {
      throw new NotFoundException('Счет или получатель не найден');
    }
    if (senderAccount.id === receiverAccount.id) {
      throw new BadRequestException('Нельзя перевести средства самому себе');
    }

    let taxAmount = 0;
    // Если получатель - компания, проверим юрисдикцию и удержим налог в казну города
    if (receiverAccount.type === 'company') {
      const taxRate = 5.0; // 5% налог
      taxAmount = Number(((dto.amount * taxRate) / 100).toFixed(2));
    }

    const netAmount = Number((dto.amount - taxAmount).toFixed(2));

    senderAccount.balance = Number(
      (senderAccount.balance - dto.amount).toFixed(2),
    );
    receiverAccount.balance = Number(
      (receiverAccount.balance + netAmount).toFixed(2),
    );

    await this.accountRepository.save([senderAccount, receiverAccount]);

    const transfer = this.transferRepository.create({
      fromAccountNumber: senderAccount.accountNumber,
      toAccountNumber: receiverAccount.accountNumber,
      amount: dto.amount,
      currencyCode: senderAccount.currencyCode,
      taxAmount,
      description: dto.description || 'Перевод средств',
    });

    return this.transferRepository.save(transfer);
  }

  public async getMyTransfers(username: string): Promise<Transfer[]> {
    const accounts = await this.accountRepository.find({
      where: { ownerUsername: username.toLowerCase() },
    });
    if (accounts.length === 0) return [];
    const numbers = accounts.map((a) => a.accountNumber);

    return this.transferRepository
      .createQueryBuilder('t')
      .where('t.fromAccountNumber IN (:...nums) OR t.toAccountNumber IN (:...nums)', {
        nums: numbers,
      })
      .orderBy('t.createdAt', 'DESC')
      .getMany();
  }

  private async resolveAccount(identifier: string): Promise<Account | null> {
    // 1. По номеру счета (20 цифр)
    const byAccNum = await this.accountRepository.findOne({
      where: { accountNumber: identifier },
    });
    if (byAccNum) return byAccNum;

    // 2. По номеру карты (16 цифр)
    const card = await this.cardRepository.findOne({
      where: { cardNumber: identifier },
    });
    if (card) {
      return this.accountRepository.findOne({
        where: { id: card.accountId },
      });
    }

    // 3. По никнейму (первый личный счет игрока)
    const byUsername = await this.accountRepository.findOne({
      where: { ownerUsername: identifier.toLowerCase(), type: 'personal' },
    });
    return byUsername || null;
  }
}
