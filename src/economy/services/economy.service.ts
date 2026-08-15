import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
import { Account, AccountType } from '../entities/account.entity';
import { CreditCard } from '../entities/credit-card.entity';
import { Transfer } from '../entities/transfer.entity';
import { Company } from '../entities/company.entity';
import { Currency } from '../entities/currency.entity';
import { User } from '../../users/entities/user.entity';
import { CityEntity } from '../../states/entities/city.entity';
import { StateEntity } from '../../states/entities/state.entity';
import { AccountTreasuryItemEntity } from '../entities/account-treasury-item.entity';
import { StateTreasuryItemEntity } from '../../states/entities/state-treasury-item.entity';
import { MinecraftRconService } from '../../minecraft-rcon/minecraft-rcon.service';

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

const GOLD_TIERS = [{ id: 'minecraft:gold_block', val: 81 }, { id: 'minecraft:gold_ingot', val: 9 }, { id: 'minecraft:gold_nugget', val: 1 }];
const DIAMOND_TIERS = [{ id: 'minecraft:diamond_block', val: 180 }, { id: 'minecraft:diamond', val: 20 }];
const EMERALD_TIERS = [{ id: 'minecraft:emerald_block', val: 108 }, { id: 'minecraft:emerald', val: 12 }];
const NETHERITE_TIERS = [{ id: 'minecraft:netherite_block', val: 1350 }, { id: 'minecraft:netherite_ingot', val: 150 }, { id: 'minecraft:netherite_scrap', val: 25 }];

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
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(Currency)
    private readonly currencyRepository: Repository<Currency>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(StateEntity)
    private readonly stateRepository: Repository<StateEntity>,
    @InjectRepository(StateTreasuryItemEntity)
    private readonly stateTreasuryItemRepository: Repository<StateTreasuryItemEntity>,
    @InjectRepository(AccountTreasuryItemEntity)
    private readonly accountTreasuryItemRepository: Repository<AccountTreasuryItemEntity>,
    private readonly rconService: MinecraftRconService,
  ) { }

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

    const currencies = await this.currencyRepository.find();
    const stateIdsToFetch = new Set<string>();
    for (const c of currencies) {
      if (!map.has(c.code) && c.stateId) {
        stateIdsToFetch.add(c.stateId);
      }
    }
    
    if (stateIdsToFetch.size > 0) {
      const states = await this.stateRepository.find({
        where: { id: In([...stateIdsToFetch]) }
      });
      const stateMap = new Map(states.map(s => [s.id, s]));
      
      for (const c of currencies) {
        if (!map.has(c.code) && c.stateId) {
          const state = stateMap.get(c.stateId);
          if (state) map.set(c.code, `НАЦИОНАЛЬНЫЙ БАНК ${state.name.toUpperCase()}`);
        }
      }
    }

    return map;
  }

  public async getMyAccounts(username: string): Promise<{
    accounts: Account[];
    cards: CreditCard[];
  }> {
    const lower = username.toLowerCase();
    const userAccounts = await this.accountRepository.find({
      where: { ownerUsername: lower },
      order: { createdAt: 'DESC' },
    });

    const accounts = [...userAccounts];

    const state = await this.stateRepository.createQueryBuilder('state')
      .where('LOWER(state.leaderUsername) = :lower', { lower })
      .orWhere('LOWER(state.treasurerUsername) = :lower', { lower })
      .getOne();
    if (state) {
      const currency = await this.currencyRepository.findOne({ where: { stateId: state.id } });
      if (currency) {
        const treasuryAccount = await this.accountRepository.findOne({ where: { type: 'treasury', currencyCode: currency.code } });
        if (treasuryAccount) {
          accounts.push(treasuryAccount);
        }
      }
    }

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
    const defaultBankName = 'НАЦИОНАЛЬНЫЙ БАНК';

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

  public async getModAccounts(playerUsername: string): Promise<any[]> {
    const lower = playerUsername.toLowerCase();
    const result: any[] = [];

    const personalAccounts = await this.accountRepository.find({
      where: { ownerUsername: lower, type: 'personal' },
      order: { createdAt: 'DESC' },
    });

    const companies = await this.companyRepository.createQueryBuilder('company')
      .where('LOWER(company.ownerUsername) = :lower', { lower })
      .getMany();

    const companyAccounts: Account[] = [];
    if (companies.length > 0) {
      const accountIds = companies.map(c => c.accountId).filter(id => id);
      if (accountIds.length > 0) {
        const accs = await this.accountRepository.createQueryBuilder('account')
          .where('account.id IN (:...accountIds)', { accountIds })
          .getMany();
        companyAccounts.push(...accs);
      }
    }

    const state = await this.stateRepository.createQueryBuilder('state')
      .where('LOWER(state.leaderUsername) = :lower', { lower })
      .getOne();

    const treasuryAccounts: Account[] = [];
    if (state && state.treasuryAccountNumber) {
      const acc = await this.accountRepository.findOne({ where: { accountNumber: state.treasuryAccountNumber } });
      if (acc) treasuryAccounts.push(acc);
    }

    const currencies = await this.currencyRepository.find();
    const bankMap = await this.getBankNamesMap();
    const defaultBankName = 'НАЦИОНАЛЬНЫЙ БАНК';

    const allAccountsToProcess = [...personalAccounts, ...companyAccounts, ...treasuryAccounts];

    // Bulk fetch transactions for all accounts
    const allAccountNumbers = allAccountsToProcess.map(a => a.accountNumber);
    let allTransactions: Transfer[] = [];
    if (allAccountNumbers.length > 0) {
      // Actually we need up to 15 per account. Doing it efficiently:
      for (const acc of allAccountsToProcess) {
        const txs = await this.transferRepository.createQueryBuilder('transfer')
          .where('transfer.fromAccountNumber = :accNum OR transfer.toAccountNumber = :accNum', { accNum: acc.accountNumber })
          .orderBy('transfer.createdAt', 'DESC')
          .take(15)
          .getMany();
        allTransactions = allTransactions.concat(txs);
      }
    }

    // Collect all involved account numbers from transactions
    const txAccountNumbers = [...new Set(allTransactions.flatMap(t => [t.fromAccountNumber, t.toAccountNumber]).filter(n => !!n))];
    let txAccounts: Account[] = [];
    if (txAccountNumbers.length > 0) {
      txAccounts = await this.accountRepository.find({
        where: { accountNumber: In(txAccountNumbers) },
      });
    }

    const txAccountMap = new Map(txAccounts.map(a => [a.accountNumber, a]));
    
    // Bulk fetch companies for txAccounts
    const companyTxAccounts = txAccounts.filter(a => a.type === 'company');
    const companyTxAccountIds = [...new Set(companyTxAccounts.map(a => a.id))];
    const txCompanies = companyTxAccountIds.length > 0 ? await this.companyRepository.find({
      where: { accountId: In(companyTxAccountIds) }
    }) : [];
    const txCompanyMap = new Map(txCompanies.map(c => [c.accountId, c]));

    // Bulk fetch states for txAccounts
    const treasuryTxAccounts = txAccounts.filter(a => a.type === 'treasury');
    const treasuryTxAccNums = [...new Set(treasuryTxAccounts.map(a => a.accountNumber))];
    const txStates = treasuryTxAccNums.length > 0 ? await this.stateRepository.find({
      where: { treasuryAccountNumber: In(treasuryTxAccNums) }
    }) : [];
    const txStateMap = new Map(txStates.map(s => [s.treasuryAccountNumber, s]));

    const getAccountName = (accNum: string) => {
      const a = txAccountMap.get(accNum);
      if (!a) return 'Неизвестно';
      if (a.type === 'personal') return a.ownerUsername;
      if (a.type === 'company') {
        const comp = txCompanyMap.get(a.id);
        return comp ? `Фирма '${comp.name}'` : 'Фирма';
      }
      if (a.type === 'treasury') {
        const st = txStateMap.get(a.accountNumber);
        return st ? `Банк '${st.name}'` : 'Банк';
      }
      return a.ownerUsername;
    };

    const formatAccount = (acc: Account, title: string) => {
      const currency = currencies.find(c => c.code === acc.currencyCode);
      const itemId = currency?.minecraftItemId || 'minecraft:paper';

      const accountTransactions = allTransactions.filter(t => t.fromAccountNumber === acc.accountNumber || t.toAccountNumber === acc.accountNumber).slice(0, 15);

      const formattedTransactions = accountTransactions.map(t => {
        const fromName = getAccountName(t.fromAccountNumber);
        const toName = getAccountName(t.toAccountNumber);
        return {
          id: t.id,
          amount: t.amount,
          isIncoming: t.toAccountNumber === acc.accountNumber,
          description: t.description || (t.toAccountNumber === acc.accountNumber ? 'Пополнение' : 'Перевод'),
          fromName,
          toName,
          createdAt: t.createdAt
        };
      });

      return {
        id: acc.id,
        accountNumber: acc.accountNumber,
        type: acc.type,
        title: title,
        bankName: bankMap.get(acc.currencyCode) || defaultBankName,
        balance: acc.balance,
        currencyCode: acc.currencyCode,
        itemId: itemId,
        transactions: formattedTransactions
      };
    };

    for (const acc of personalAccounts) {
      result.push(formatAccount(acc, 'Личный счет'));
    }
    for (const acc of companyAccounts) {
      const comp = companies.find(c => c.accountId === acc.id);
      result.push(formatAccount(acc, `Счет компании ${comp?.name || ''}`));
    }
    for (const acc of treasuryAccounts) {
      result.push(formatAccount(acc, `Казначейство ${state?.name || ''}`));
    }

    return result;
  }

  private async hasAccessToAccount(account: Account, username: string): Promise<boolean> {
    const lowerUser = username.toLowerCase();
    if (account.ownerUsername === lowerUser) return true;

    if (account.type === 'treasury') {
      const state = await this.stateRepository.findOne({ where: { treasuryAccountNumber: account.accountNumber } });
      if (state && (state.leaderUsername?.toLowerCase() === lowerUser || state.treasurerUsername?.toLowerCase() === lowerUser)) {
        return true;
      }
    }

    return false;
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
    if (!(await this.hasAccessToAccount(account, username))) {
      throw new BadRequestException('Вы не являетесь владельцем этого счета');
    }

    const cardNumber = Math.floor(
      1000000000000000 + Math.random() * 9000000000000000,
    ).toString();
    const cvv = Math.floor(100 + Math.random() * 900).toString();
    const expiresAt = '12/29';

    let backgroundImageUrl: string | undefined;
    if (account.currencyCode) {
      const currency = await this.currencyRepository.findOne({ where: { code: account.currencyCode } });
      if (currency?.stateId) {
        const cities = await this.cityRepository.find({ where: { stateId: currency.stateId } });
        let allImages: string[] = [];
        for (const city of cities) {
          if (city.images && city.images.length > 0) {
            allImages = allImages.concat(city.images);
          }
        }
        if (allImages.length > 0) {
          const randomIndex = Math.floor(Math.random() * allImages.length);
          backgroundImageUrl = allImages[randomIndex];
        }
      }
    }

    const card = this.cardRepository.create({
      cardNumber,
      cvv,
      expiresAt,
      accountId: account.id,
      isBlocked: false,
      backgroundImageUrl,
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
    const defaultBankName = 'НАЦИОНАЛЬНЫЙ БАНК';

    const currencies = await this.currencyRepository.find();

    const companies = await this.companyRepository.find({
      where: { ownerUsername: lower },
    });

    return cards.map((card) => {
      const acc =
        card.account || accounts.find((a) => a.id === card.accountId);
      card.bankName =
        (acc && bankMap.get(acc.currencyCode)) || defaultBankName;

      if (acc) {
        const currency = currencies.find(c => c.code === acc.currencyCode);
        if (currency) {
          (card as any).currencyItemId = currency.minecraftItemId;
        }

        if (acc.type === 'company') {
          const company = companies.find(c => c.accountId === acc.id);
          if (company) {
            (card as any).companyName = company.name;
          }
        }
      }

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
    if (card.account && !(await this.hasAccessToAccount(card.account, username))) {
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
    if (card.account && !(await this.hasAccessToAccount(card.account, username))) {
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
    if (!(await this.hasAccessToAccount(senderAccount, username))) {
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

    if (senderAccount.currencyCode !== receiverAccount.currencyCode) {
      throw new BadRequestException(
        `Перевод отклонен: валюты счетов не совпадают (${senderAccount.currencyCode} и ${receiverAccount.currencyCode}). Прямая конвертация запрещена.`,
      );
    }

    let taxAmount = 0;
    let treasuryAccountToReceiveTax: Account | null = null;

    // Определяем государство-эмитента валюты
    const currency = await this.currencyRepository.findOne({
      where: { code: senderAccount.currencyCode },
    });

    if (currency && currency.stateId) {
      const state = await this.stateRepository.findOne({
        where: { id: currency.stateId },
      });

      if (state && state.treasuryAccountNumber) {
        let taxRate = 0;

        const isSenderCompany = senderAccount.type === 'company';
        const isReceiverCompany = receiverAccount.type === 'company';

        if (!isSenderCompany && !isReceiverCompany) {
          // Игрок -> Игрок
          taxRate = state.playerToPlayerTransferFee || 0;
        } else {
          // Игрок -> Компания, Компания -> Игрок, Компания -> Компания
          taxRate = state.playerToCompanyTransferFee || 0;
        }

        taxAmount = Number(((dto.amount * taxRate) / 100).toFixed(2));
        if (taxAmount > 0) {
          treasuryAccountToReceiveTax = await this.accountRepository.findOne({ where: { accountNumber: state.treasuryAccountNumber } });
          if (!treasuryAccountToReceiveTax) {
            taxAmount = 0;
          }
        }
      }
    }

    const netAmount = Number((dto.amount - taxAmount).toFixed(2));

    senderAccount.balance = Number(
      (senderAccount.balance - dto.amount).toFixed(2),
    );
    receiverAccount.balance = Number(
      (receiverAccount.balance + netAmount).toFixed(2),
    );

    const accountsToSave = [senderAccount, receiverAccount];

    if (taxAmount > 0 && treasuryAccountToReceiveTax) {
      if (treasuryAccountToReceiveTax.accountNumber === senderAccount.accountNumber) {
        senderAccount.balance = Number((senderAccount.balance + taxAmount).toFixed(2));
      } else if (treasuryAccountToReceiveTax.accountNumber === receiverAccount.accountNumber) {
        receiverAccount.balance = Number((receiverAccount.balance + taxAmount).toFixed(2));
      } else {
        treasuryAccountToReceiveTax.balance = Number((treasuryAccountToReceiveTax.balance + taxAmount).toFixed(2));
        accountsToSave.push(treasuryAccountToReceiveTax);
      }
    }

    await this.accountRepository.save(accountsToSave);

    const transfer = this.transferRepository.create({
      fromAccountNumber: senderAccount.accountNumber,
      toAccountNumber: receiverAccount.accountNumber,
      amount: dto.amount,
      currencyCode: senderAccount.currencyCode,
      taxAmount,
      taxAccountNumber: treasuryAccountToReceiveTax ? treasuryAccountToReceiveTax.accountNumber : null,
      description: dto.description || 'Перевод средств',
    });

    return this.transferRepository.save(transfer);
  }

  public async getMyTransfers(username: string): Promise<any[]> {
    const { accounts: myAccounts } = await this.getMyAccounts(username);
    if (myAccounts.length === 0) return [];
    const numbers = myAccounts.map((a: any) => a.accountNumber);

    const transfers = await this.transferRepository
      .createQueryBuilder('t')
      .where('t.fromAccountNumber IN (:...nums) OR t.toAccountNumber IN (:...nums) OR t.taxAccountNumber IN (:...nums)', {
        nums: numbers,
      })
      .orderBy('t.createdAt', 'DESC')
      .getMany();

    // Collect all involved account numbers
    const allAccountNumbers = [...new Set(transfers.flatMap(t => [t.fromAccountNumber, t.toAccountNumber, t.taxAccountNumber]).filter(n => !!n))];
    const allAccounts = await this.accountRepository.find({
      where: { accountNumber: In(allAccountNumbers) },
    });

    const accountMap = new Map(allAccounts.map(a => [a.accountNumber, a]));

    const personalAccounts = allAccounts.filter(a => a.type === 'personal');
    const userNames = [...new Set(personalAccounts.map(a => a.ownerUsername))];
    const users = await this.userRepository.find({
      where: { username_lower: In(userNames.map(u => u.toLowerCase())) },
      relations: ['state'],
    });
    const userMap = new Map(users.map(u => [u.username_lower, u]));

    const stateAccounts = allAccounts.filter(a => a.type === 'treasury');
    const treasuryAccNums = [...new Set(stateAccounts.map(a => a.accountNumber))];
    const states = treasuryAccNums.length > 0 ? await this.stateRepository.find({
      where: { treasuryAccountNumber: In(treasuryAccNums) },
    }) : [];
    const stateMap = new Map(states.map(s => [s.treasuryAccountNumber, s]));

    const companyAccounts = allAccounts.filter(a => a.type === 'company');
    const companyAccountIds = [...new Set(companyAccounts.map(a => a.id))];
    const companies = companyAccountIds.length > 0 ? await this.companyRepository.find({
      where: { accountId: In(companyAccountIds) },
    }) : [];
    const companyMap = new Map(companies.map(c => [c.accountId, c]));

    const stateIdsToFetch = new Set<string>();
    companies.forEach(c => {
      if (c.stateId) stateIdsToFetch.add(c.stateId);
    });
    const extraStates = stateIdsToFetch.size > 0 ? await this.stateRepository.find({
      where: { id: In([...stateIdsToFetch]) },
    }) : [];
    const stateByIdMap = new Map(extraStates.map(s => [s.id, s]));

    const enrichAccount = (accNum: string) => {
      const acc = accountMap.get(accNum);
      if (!acc) return { ownerName: accNum, coatOfArms: null };

      let ownerName = acc.ownerUsername;
      let coatOfArms: string | null = null;
      let fallbackCoatOfArms: string | null = null;

      if (acc.type === 'personal') {
        const user = userMap.get(acc.ownerUsername.toLowerCase());
        if (user) {
          ownerName = user.username;
          coatOfArms = user.state?.coatOfArmsUrl || null;
        }
      } else if (acc.type === 'treasury') {
        const state = stateMap.get(acc.accountNumber);
        if (state) {
          ownerName = `Казна: ${state.name}`;
          coatOfArms = state.coatOfArmsUrl || null;
        }
      } else if (acc.type === 'company') {
        const company = companyMap.get(acc.id);
        if (company) {
          ownerName = company.name;
          coatOfArms = company.logoUrl || null;
          if (company.stateId) {
            const s = stateByIdMap.get(company.stateId);
            if (s) fallbackCoatOfArms = s.coatOfArmsUrl || null;
          }
        }
      }
      return { ownerName, coatOfArms: coatOfArms || fallbackCoatOfArms, fallbackCoatOfArms };
    };

    return transfers.map(t => {
      const fromEnriched = enrichAccount(t.fromAccountNumber);
      const toEnriched = enrichAccount(t.toAccountNumber);
      return {
        ...t,
        fromOwnerName: fromEnriched.ownerName,
        fromCoatOfArms: fromEnriched.coatOfArms,
        fromFallbackCoatOfArms: fromEnriched.fallbackCoatOfArms,
        toOwnerName: toEnriched.ownerName,
        toCoatOfArms: toEnriched.coatOfArms,
        toFallbackCoatOfArms: toEnriched.fallbackCoatOfArms,
      };
    });
  }

  private async resolveAccount(identifier: string): Promise<Account | null> {
    const cleanIdentifier = identifier.replace(/\D/g, '');

    // 1. По номеру счета (20 цифр)
    const byAccNum = await this.accountRepository.findOne({
      where: { accountNumber: cleanIdentifier || identifier },
    });
    if (byAccNum) return byAccNum;

    // 2. По номеру карты (16 цифр)
    const card = await this.cardRepository.findOne({
      where: { cardNumber: cleanIdentifier || identifier },
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

  public async checkTreasuryAccess(playerUsername: string, entityId: string, entityType: string): Promise<boolean> {
    const usernameLower = playerUsername.toLowerCase();


    if (entityType === 'gold_reserve') {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(entityId);

      if (!isUuid) return false;
      const state = await this.stateRepository.findOne({ where: { id: entityId } });
      if (!state) return false;
      return state.leaderUsername?.toLowerCase() === usernameLower;
    }

    const cleanAccountNumber = entityId.replace(/\D/g, '');
    const account = await this.accountRepository.findOne({ where: { accountNumber: cleanAccountNumber } });

    if (!account) return false;

    if (entityType === 'personal' || entityType === 'company') {
      return account.ownerUsername === usernameLower;
    }

    if (entityType === 'state' || entityType === 'state_reserve') {
      if (account.type !== 'treasury') return false;
      const state = await this.stateRepository.findOne({ where: { treasuryAccountNumber: account.accountNumber } });

      return state?.leaderUsername?.toLowerCase() === usernameLower;
    }

    return false;
  }

  public async processDeposit(playerUsername: string, entityId: string, entityType: string, amount: string, items: { itemId: string; count: number }[]): Promise<boolean> {
    const hasAccess = await this.checkTreasuryAccess(playerUsername, entityId, entityType);
    if (!hasAccess) throw new BadRequestException('У вас нет доступа к этому счету.');

    let targetStateId: string | null = null;
    let targetAccountId: string | null = null;

    if (entityType === 'gold_reserve') {
      targetStateId = entityId; // For gold_reserve, the 'entityId' is actually the State ID
    } else if (entityType === 'state' || entityType === 'state_reserve') {
      const cleanAccountNumber = entityId.replace(/\D/g, '');
      const account = await this.accountRepository.findOne({ where: { accountNumber: cleanAccountNumber } });
      if (!account) throw new BadRequestException('Счет не найден.');
      const currency = await this.currencyRepository.findOne({ where: { code: account.currencyCode } });
      if (!currency || !currency.stateId) throw new BadRequestException('Государство счета не найдено.');
      targetStateId = currency.stateId;
      targetAccountId = account.id;
    } else {
      const cleanAccountNumber = entityId.replace(/\D/g, '');
      const account = await this.accountRepository.findOne({ where: { accountNumber: cleanAccountNumber } });
      if (!account) throw new BadRequestException('Счет не найден.');
      targetAccountId = account.id;
    }

    if (targetStateId && entityType === 'gold_reserve') {
      const itemCounts = new Map<string, number>();
      for (const item of items) {
        itemCounts.set(item.itemId, (itemCounts.get(item.itemId) || 0) + item.count);
      }
      const itemIds = Array.from(itemCounts.keys());
      
      const existingItems = await this.stateTreasuryItemRepository.find({
        where: { stateId: targetStateId, minecraftItemId: In(itemIds) }
      });
      const itemMap = new Map(existingItems.map(i => [i.minecraftItemId, i]));
      
      const toSave: any[] = [];
      for (const [itemId, count] of itemCounts.entries()) {
        let treasuryItem = itemMap.get(itemId);
        if (treasuryItem) {
          treasuryItem.quantity += count;
        } else {
          treasuryItem = this.stateTreasuryItemRepository.create({ stateId: targetStateId, minecraftItemId: itemId, quantity: count });
        }
        toSave.push(treasuryItem);
      }
      await this.stateTreasuryItemRepository.save(toSave);
      return true;
    } else if (targetAccountId) {
      const cleanAccountNumber = entityId.replace(/\D/g, '');
      const account = await this.accountRepository.findOne({ where: { accountNumber: cleanAccountNumber } });
      if (!account) throw new BadRequestException('Счет не найден.');

      const currency = await this.currencyRepository.findOne({ where: { code: account.currencyCode } });
      if (!currency) throw new BadRequestException('Валюта счета не найдена.');

      let depositedValue = 0;
      for (const item of items) {
        const val = ITEM_VALUES[item.itemId];
        if (val !== undefined) {
          depositedValue += val * item.count;
        } else if (currency) {
          if (item.itemId === currency.minecraftItemId) depositedValue += 1 * item.count;
          else if (item.itemId === currency.kopeckItemId) depositedValue += 0.01 * item.count;
          else throw new BadRequestException(`Предмет ${item.itemId} не является валютой.`);
        }
      }

      if (depositedValue > 0) {
        account.balance = Number(account.balance) + depositedValue;
        await this.accountRepository.save(account);
      } else {
        throw new BadRequestException('Внесенная сумма должна быть больше 0.');
      }
      return true;
    }

    throw new BadRequestException('Неизвестный тип сейфа.');
  }

  public async processWithdraw(playerUsername: string, entityId: string, entityType: string, amount: string): Promise<{ itemId: string; count: number; name?: string; enchantment?: string }[]> {
    const hasAccess = await this.checkTreasuryAccess(playerUsername, entityId, entityType);
    if (!hasAccess) throw new BadRequestException('У вас нет доступа к этому счету.');

    const itemsToReturn: { itemId: string; count: number; name?: string; enchantment?: string }[] = [];
    let targetStateId: string | null = null;
    let targetAccountId: string | null = null;

    if (entityType === 'gold_reserve') {
      targetStateId = entityId; // For gold_reserve, entityId is State ID
    } else if (entityType === 'state' || entityType === 'state_reserve') {
      const cleanAccountNumber = entityId.replace(/\D/g, '');
      const account = await this.accountRepository.findOne({ where: { accountNumber: cleanAccountNumber } });
      if (!account) throw new BadRequestException('Счет не найден.');
      const currency = await this.currencyRepository.findOne({ where: { code: account.currencyCode } });
      if (!currency || !currency.stateId) throw new BadRequestException('Государство счета не найдено.');
      targetStateId = currency.stateId;
      targetAccountId = account.id;
    } else {
      const cleanAccountNumber = entityId.replace(/\D/g, '');
      const account = await this.accountRepository.findOne({ where: { accountNumber: cleanAccountNumber } });
      if (!account) throw new BadRequestException('Счет не найден.');
      targetAccountId = account.id;
    }

    if (targetStateId && entityType === 'gold_reserve') {
      const treasuryItems = await this.stateTreasuryItemRepository.find({ where: { stateId: targetStateId } });
      for (const tItem of treasuryItems) {
        itemsToReturn.push({ itemId: tItem.minecraftItemId, count: tItem.quantity });
      }
      await this.stateTreasuryItemRepository.remove(treasuryItems);
      return itemsToReturn;
    } else if (targetAccountId) {
      const cleanAccountNumber = entityId.replace(/\D/g, '');
      const account = await this.accountRepository.findOne({ where: { accountNumber: cleanAccountNumber } });
      if (!account) throw new BadRequestException('Счет не найден.');

      const requestedAmount = parseFloat(amount);
      if (isNaN(requestedAmount) || requestedAmount < 0.01) throw new BadRequestException('Минимальная сумма операции — 0.01.');
      if (Number(account.balance) < requestedAmount) throw new BadRequestException('Недостаточно средств на счету.');

      account.balance = Number(account.balance) - requestedAmount;
      await this.accountRepository.save(account);

      const currency = await this.currencyRepository.findOne({ where: { code: account.currencyCode } });
      const kopeck = currency ? currency.kopeckItemId : 'minecraft:gold_nugget';
      const cName = currency ? currency.name : undefined;
      const cEnch = currency ? currency.minecraftEnchantment : undefined;

      let tiers: any[] = [];
      if (kopeck === 'minecraft:gold_nugget') tiers = GOLD_TIERS;
      else if (kopeck === 'minecraft:diamond') tiers = DIAMOND_TIERS;
      else if (kopeck === 'minecraft:emerald') tiers = EMERALD_TIERS;
      else if (kopeck === 'minecraft:netherite_scrap') tiers = NETHERITE_TIERS;
      let remaining = requestedAmount;
      if (currency && currency.minecraftItemId !== kopeck && ITEM_VALUES[currency.kopeckItemId] === undefined) {
        // It's a custom currency. Give minecraftItemId for the integer part, and kopeck for the decimal part.
        const mainCount = Math.floor(remaining);
        const kopeckCount = Math.round((remaining - mainCount) * 100);

        if (mainCount > 0) {
          const chunks = Math.floor(mainCount / 64);
          const remainder = mainCount % 64;
          for (let i = 0; i < chunks; i++) {
            itemsToReturn.push({ itemId: currency.minecraftItemId, count: 64, name: cName, enchantment: cEnch });
          }
          if (remainder > 0) {
            itemsToReturn.push({ itemId: currency.minecraftItemId, count: remainder, name: cName, enchantment: cEnch });
          }
        }

        if (kopeckCount > 0) {
          const chunks = Math.floor(kopeckCount / 64);
          const remainder = kopeckCount % 64;
          for (let i = 0; i < chunks; i++) {
            itemsToReturn.push({ itemId: currency.kopeckItemId, count: 64, name: cName, enchantment: cEnch });
          }
          if (remainder > 0) {
            itemsToReturn.push({ itemId: currency.kopeckItemId, count: remainder, name: cName, enchantment: cEnch });
          }
        }
      } else {
        // Legacy tier behavior for standard items
        for (const tier of tiers) {
          if (remaining >= tier.val) {
            const count = Math.floor(remaining / tier.val);
            const chunks = Math.floor(count / 64);
            const remainder = count % 64;
            for (let i = 0; i < chunks; i++) {
              itemsToReturn.push({ itemId: tier.id, count: 64, name: cName, enchantment: cEnch });
            }
            if (remainder > 0) {
              itemsToReturn.push({ itemId: tier.id, count: remainder, name: cName, enchantment: cEnch });
            }
            remaining = remaining % tier.val;
          }
        }

        if (remaining > 0) {
          const count = remaining;
          const chunks = Math.floor(count / 64);
          const remainder = count % 64;
          for (let i = 0; i < chunks; i++) {
            itemsToReturn.push({ itemId: kopeck, count: 64, name: cName, enchantment: cEnch });
          }
          if (remainder > 0) {
            itemsToReturn.push({ itemId: kopeck, count: remainder, name: cName, enchantment: cEnch });
          }
        }
      }

      return itemsToReturn;
    }
    throw new BadRequestException('Неизвестный тип сейфа.');
  }

  public async getAccountCurrencyItem(entityId: string, entityType: string): Promise<string> {
    let targetStateId: string | null = null;
    let targetAccountId: string | null = null;

    if (entityType === 'gold_reserve') {
      targetStateId = entityId;
    } else if (entityType === 'state' || entityType === 'state_reserve' || entityType === 'personal' || entityType === 'company') {
      const cleanAccountNumber = entityId.replace(/\D/g, '');
      const account = await this.accountRepository.findOne({ where: { accountNumber: cleanAccountNumber } });
      if (account) targetAccountId = account.id;
    }

    if (targetStateId && entityType === 'gold_reserve') {
      const currency = await this.currencyRepository.findOne({ where: { stateId: targetStateId } });
      return currency?.minecraftItemId || 'minecraft:gold_ingot';
    } else if (targetAccountId) {
      const account = await this.accountRepository.findOne({ where: { id: targetAccountId } });
      if (account) {
        const currency = await this.currencyRepository.findOne({ where: { code: account.currencyCode } });
        return currency?.minecraftItemId || 'minecraft:paper';
      }
    }

    return 'minecraft:paper';
  }
}
