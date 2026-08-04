import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Account, AccountType } from '../entities/account.entity';
import { CreditCard } from '../entities/credit-card.entity';
import { Transfer } from '../entities/transfer.entity';
import { Company } from '../entities/company.entity';
import { Currency } from '../entities/currency.entity';
import { User } from '../../users/entities/user.entity';
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
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(Currency)
    private readonly currencyRepository: Repository<Currency>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  public async assertUserStateHasCurrency(username: string): Promise<Currency> {
    const user = await this.userRepository.findOne({
      where: { username_lower: username.toLowerCase() },
    });
    if (!user) {
      throw new NotFoundException('Игрок не найден');
    }
    let stateId = user.stateId;
    if (!stateId && user.cityId) {
      const city = await this.cityRepository.findOne({
        where: { id: user.cityId },
      });
      if (city?.stateId) {
        stateId = city.stateId;
      }
    }
    if (!stateId) {
      throw new BadRequestException(
        'Для финансовых операций (счета, фирмы, биржа) вы должны быть гражданином государства, в котором выпущена валюта!',
      );
    }
    const currency = await this.currencyRepository.findOne({
      where: { stateId },
    });
    if (!currency) {
      throw new BadRequestException(
        'В вашем государстве ещё не создана национальная валюта! Национальному банку необходимо сначала выпустить валюту для доступа к счетам, фирмам и бирже.',
      );
    }
    return currency;
  }

  public async getCurrencyForState(stateId?: string): Promise<Currency> {
    if (!stateId) {
      throw new BadRequestException('Не указано государство юрисдикции');
    }
    const currency = await this.currencyRepository.findOne({
      where: [{ stateId }, { stateId: IsNull() }],
    });
    if (!currency) {
      throw new BadRequestException(
        'В выбранном государстве ещё не создана национальная валюта и не открыт Национальный банк!',
      );
    }
    return currency;
  }

  private async getBankNamesMap(): Promise<Map<string, string>> {
    const treasuryAccounts = await this.accountRepository.find({
      where: { type: 'treasury' },
    });
    const map = new Map<string, string>();
    for (const t of treasuryAccounts) {
      if (t.currencyCode) {
        map.set(t.currencyCode, t.ownerUsername);
      }
    }
    return map;
  }

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
        .leftJoinAndSelect('card.account', 'account')
        .where('card.accountId IN (:...ids)', { ids: accountIds })
        .orderBy('card.createdAt', 'DESC')
        .getMany();
    }

    const bankMap = await this.getBankNamesMap();
    const defaultBankName =
      bankMap.values().next().value || 'НАЦИОНАЛЬНЫЙ БАНК';

    const enrichedAccounts = accounts.map((acc) => {
      acc.bankName = bankMap.get(acc.currencyCode) || defaultBankName;
      return acc;
    });

    const enrichedCards = cards.map((card) => {
      const acc =
        card.account || accounts.find((a) => a.id === card.accountId);
      card.bankName =
        (acc && bankMap.get(acc.currencyCode)) || defaultBankName;
      return card;
    });

    return { accounts: enrichedAccounts, cards: enrichedCards };
  }

  public async createAccount(
    username: string,
    dto: { type?: AccountType; currencyCode?: string; ownerUsername?: string },
  ): Promise<Account> {
    if (dto.type && dto.type !== 'personal') {
      throw new BadRequestException(
        'Вручную можно создавать только личные счета. Коммерческий счет создается при регистрации компании, а казначейский — при учреждении Национального Банка.',
      );
    }
    let currencyCode: string;
    if (dto.currencyCode) {
      const exists = await this.currencyRepository.findOne({
        where: { code: dto.currencyCode },
      });
      if (!exists) {
        throw new NotFoundException(`Валюта ${dto.currencyCode} не найдена на сервере`);
      }
      currencyCode = exists.code;
    } else {
      const stateCurrency = await this.assertUserStateHasCurrency(username);
      currencyCode = stateCurrency.code;
    }

    const owner = dto.ownerUsername
      ? dto.ownerUsername.toLowerCase()
      : username.toLowerCase();
    const accountNumber =
      '40817' +
      Math.floor(100000000000000 + Math.random() * 900000000000000).toString();

    const account = this.accountRepository.create({
      accountNumber,
      ownerUsername: owner,
      type: 'personal',
      balance: 0,
      currencyCode,
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

  public async getMyCards(username: string): Promise<CreditCard[]> {
    const lower = username.toLowerCase();
    const accounts = await this.accountRepository.find({
      where: { ownerUsername: lower },
    });
    const accountIds = accounts.map((a) => a.id);
    if (accountIds.length === 0) return [];
    const cards = await this.cardRepository
      .createQueryBuilder('card')
      .leftJoinAndSelect('card.account', 'account')
      .where('card.accountId IN (:...ids)', { ids: accountIds })
      .orderBy('card.createdAt', 'DESC')
      .getMany();

    const bankMap = await this.getBankNamesMap();
    const defaultBankName =
      bankMap.values().next().value || 'НАЦИОНАЛЬНЫЙ БАНК';

    return cards.map((card) => {
      const acc =
        card.account || accounts.find((a) => a.id === card.accountId);
      card.bankName =
        (acc && bankMap.get(acc.currencyCode)) || defaultBankName;
      return card;
    });
  }

  public async toggleBlockCard(
    username: string,
    cardId: string,
  ): Promise<CreditCard> {
    const card = await this.cardRepository.findOne({
      where: { id: cardId },
      relations: ['account'],
    });
    if (!card) {
      throw new NotFoundException('Карта не найдена');
    }
    if (card.account?.ownerUsername !== username.toLowerCase()) {
      throw new BadRequestException('Вы не являетесь владельцем этой карты');
    }
    card.isBlocked = !card.isBlocked;
    return this.cardRepository.save(card);
  }

  public async deleteCard(
    username: string,
    cardId: string,
  ): Promise<{ success: true }> {
    const card = await this.cardRepository.findOne({
      where: { id: cardId },
      relations: ['account'],
    });
    if (!card) {
      throw new NotFoundException('Карта не найдена');
    }
    if (card.account?.ownerUsername !== username.toLowerCase()) {
      throw new BadRequestException('Вы не являетесь владельцем этой карты');
    }
    await this.cardRepository.remove(card);
    return { success: true };
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
    await this.assertUserStateHasCurrency(username);
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

    // Проверим необходимость конвертации валют
    let targetAmount = dto.amount;
    let conversionNote = '';
    if (senderAccount.currencyCode !== receiverAccount.currencyCode) {
      const senderCurr = await this.currencyRepository.findOne({
        where: { code: senderAccount.currencyCode },
      });
      const receiverCurr = await this.currencyRepository.findOne({
        where: { code: receiverAccount.currencyCode },
      });
      const senderRate = senderCurr?.exchangeRate || 1.0;
      const receiverRate = receiverCurr?.exchangeRate || 1.0;

      targetAmount = Number(
        ((dto.amount * senderRate) / receiverRate).toFixed(2),
      );
      conversionNote = ` [Конвертация: ${dto.amount} ${senderAccount.currencyCode} ➔ ${targetAmount} ${receiverAccount.currencyCode}]`;
    }

    let taxAmount = 0;
    // Если получатель - компания, проверим юрисдикцию и рассчитаем налог по ставке государства/города
    if (receiverAccount.type === 'company') {
      let taxRate = 5.0; // ставка по умолчанию 5%
      const company = await this.companyRepository.findOne({
        where: { accountId: receiverAccount.id },
      });
      if (company?.stateId) {
        const state = await this.stateRepository.findOne({
          where: { id: company.stateId },
        });
        if (state && state.taxRate !== undefined && state.taxRate !== null) {
          taxRate = Number(state.taxRate);
        }
      } else if (company?.cityId) {
        const city = await this.cityRepository.findOne({
          where: { id: company.cityId },
        });
        if (city && city.taxRate !== undefined && city.taxRate !== null) {
          taxRate = Number(city.taxRate);
        }
      }
      taxAmount = Number(((targetAmount * taxRate) / 100).toFixed(2));
    }

    const netAmount = Number((targetAmount - taxAmount).toFixed(2));

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
      description: (dto.description || 'Перевод средств') + conversionNote,
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
