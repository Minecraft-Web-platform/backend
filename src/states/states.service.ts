import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StateEntity } from './entities/state.entity';
import { CityEntity } from './entities/city.entity';
import { StateDiplomacyEntity } from './entities/state-diplomacy.entity';
import { StateDecreeEntity } from './entities/state-decree.entity';
import { CitizenshipRequestEntity } from './entities/citizenship-request.entity';
import { ElectionEntity } from './entities/election.entity';
import { ElectionCandidateEntity } from './entities/election-candidate.entity';
import { ElectionVoteEntity } from './entities/election-vote.entity';
import { StateTreasuryItemEntity } from './entities/state-treasury-item.entity';
import { TerritoryEntity } from './entities/territory.entity';
import { User } from '../users/entities/user.entity';

import { Account } from '../economy/entities/account.entity';
import { MinecraftRconService } from '../minecraft-rcon/minecraft-rcon.service';
import { EventsService } from '../events/events.service';
import { AutoNewsService } from '../news/auto-news.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  CreateCityDto,
  CreateCitizenshipRequestDto,
  CreateDecreeDto,
  CreateElectionDto,
  CreateStateDto,
  NominateCandidateDto,
  ReviewCitizenshipRequestDto,
  SetDiplomacyDto,
  UpdateCityDto,
  UpdateStateDto,
  VoteDto,
} from './dto/states.dto';
import { TerritoriesService } from './services/territories.service';
import { ElectionsService } from './services/elections.service';
import { CitiesService } from './services/cities.service';
import { Inject, forwardRef } from '@nestjs/common';

@Injectable()
export class StatesService {
  constructor(
    @InjectRepository(StateEntity)
    private readonly stateRepo: Repository<StateEntity>,
    @InjectRepository(CityEntity)
    private readonly cityRepo: Repository<CityEntity>,
    @InjectRepository(StateDiplomacyEntity)
    private readonly diplomacyRepo: Repository<StateDiplomacyEntity>,
    @InjectRepository(StateDecreeEntity)
    private readonly decreeRepo: Repository<StateDecreeEntity>,
    @InjectRepository(CitizenshipRequestEntity)
    private readonly requestRepo: Repository<CitizenshipRequestEntity>,
    @InjectRepository(ElectionEntity)
    private readonly electionRepo: Repository<ElectionEntity>,
    @InjectRepository(ElectionCandidateEntity)
    private readonly candidateRepo: Repository<ElectionCandidateEntity>,
    @InjectRepository(ElectionVoteEntity)
    private readonly voteRepo: Repository<ElectionVoteEntity>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    @InjectRepository(StateTreasuryItemEntity)
    private readonly treasuryRepo: Repository<StateTreasuryItemEntity>,
    @InjectRepository(TerritoryEntity)
    private readonly territoryRepo: Repository<TerritoryEntity>,
    private readonly rconService: MinecraftRconService,
    private readonly eventsService: EventsService,
    private readonly autoNewsService: AutoNewsService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => TerritoriesService)) private readonly territoriesService: TerritoriesService,
    @Inject(forwardRef(() => ElectionsService)) private readonly electionsService: ElectionsService,
    @Inject(forwardRef(() => CitiesService)) private readonly citiesService: CitiesService,
  ) {}

  // --- States ---
  async getAllStates(): Promise<StateEntity[]> {
    return this.stateRepo.find({
      where: { isArchived: false },
      relations: ['cities', 'cities.citizens', 'citizens'],
      order: { createdAt: 'DESC' },
    });
  }

  async getStateById(id: string): Promise<StateEntity> {
    const state = await this.stateRepo.findOne({
      where: { id },
      relations: ['cities', 'cities.citizens', 'citizens', 'decrees'],
    });
    if (!state) {
      throw new NotFoundException('Государство не найдено');
    }
    return state;
  }

  async createState(dto: CreateStateDto, creatorUsername?: string): Promise<StateEntity> {
    if (!dto.leaderUsername && creatorUsername) {
      dto.leaderUsername = creatorUsername;
    }
    const state = this.stateRepo.create(dto);
    const savedState = await this.stateRepo.save(state);
    if (savedState.leaderUsername) {
      await this.userRepo.update(
        { username_lower: savedState.leaderUsername.toLowerCase() },
        { stateId: savedState.id },
      );
    }

    // Auto-news about state creation
    if (creatorUsername) {
      await this.autoNewsService.publishStateCreatedNews(savedState.name, creatorUsername);

      this.eventEmitter.emit('state.created', {
        initiatorUsername: creatorUsername,
        stateId: savedState.id,
      });
    }

    return savedState;
  }

  async updateState(id: string, dto: UpdateStateDto, username?: string): Promise<StateEntity> {
    const state = await this.getStateById(id);
    if (username) {
      const user = await this.userRepo.findOne({
        where: { username_lower: username.toLowerCase() },
      });
      const isLeader = state.leaderUsername && state.leaderUsername.toLowerCase() === username.toLowerCase();
      const isTreasurer = state.treasurerUsername && state.treasurerUsername.toLowerCase() === username.toLowerCase();

      if (!isLeader && !isTreasurer && !user?.isAdmin) {
        throw new ForbiddenException(
          'Только президент, казначей или администратор могут вносить изменения в государство',
        );
      }
    }
    if (dto.playerToPlayerTransferFee !== undefined) {
      if (dto.playerToPlayerTransferFee < 0 || dto.playerToPlayerTransferFee > 100) {
        throw new BadRequestException('Ставка налога должна быть от 0 до 100%');
      }
    }
    if (dto.playerToCompanyTransferFee !== undefined) {
      if (dto.playerToCompanyTransferFee < 0 || dto.playerToCompanyTransferFee > 100) {
        throw new BadRequestException('Ставка налога должна быть от 0 до 100%');
      }
    }
    if (dto.exchangeTradingFee !== undefined) {
      if (dto.exchangeTradingFee < 0 || dto.exchangeTradingFee > 100) {
        throw new BadRequestException('Комиссия биржи должна быть от 0 до 100%');
      }
    }
    Object.keys(dto).forEach((key) => {
      if (dto[key] !== undefined) {
        state[key] = dto[key];
      }
    });

    const updatedState = await this.stateRepo.save(state);

    this.eventEmitter.emit('state.updated', { stateId: id });

    return updatedState;
  }

  async createNationalBank(stateId: string, username: string, bankName?: string): Promise<Account> {
    const state = await this.getStateById(stateId);
    if (!state.leaderUsername || state.leaderUsername.toLowerCase() !== username.toLowerCase()) {
      throw new ForbiddenException('Только правитель государства может учреждать Национальный банк');
    }
    if (state.treasuryAccountNumber) {
      throw new BadRequestException('Национальный банк этого государства уже учрежден!');
    }

    const accountNumber = '40817' + Math.floor(100000000000000 + Math.random() * 900000000000000).toString();

    const account = this.accountRepo.create({
      accountNumber,
      ownerUsername: bankName || `Национальный Банк ${state.name}`,
      type: 'treasury',
      balance: 0,
      currencyCode: 'PENDING',
    });
    const savedAccount = await this.accountRepo.save(account);

    state.treasuryAccountNumber = savedAccount.accountNumber;
    await this.stateRepo.save(state);

    return savedAccount;
  }

  async deleteState(id: string): Promise<void> {
    const state = await this.getStateById(id);
    this.territoriesService.invalidateBlueMapCache();

    if (state.treasuryAccountNumber) {
      const account = await this.accountRepo.findOne({ where: { accountNumber: state.treasuryAccountNumber } });
      if (account && account.balance > 0) {
        throw new BadRequestException(
          'Невозможно распустить государство, пока в казне есть деньги. Выведите средства.',
        );
      }
    }

    state.isArchived = true;
    await this.stateRepo.save(state);

    if (state.treasuryAccountNumber) {
      await this.accountRepo.delete({ accountNumber: state.treasuryAccountNumber });
    }
  }

  async resignPresident(stateId: string, username: string): Promise<{ success: boolean; message: string }> {
    const state = await this.getStateById(stateId);
    if (!state.leaderUsername || state.leaderUsername.toLowerCase() !== username.toLowerCase()) {
      throw new BadRequestException('Вы не являетесь лидером этого государства');
    }

    state.leaderUsername = '';
    await this.stateRepo.save(state);
    this.territoriesService.invalidateBlueMapCache();

    await this.eventsService.createEvent({
      title: 'Отставка Президента',
      description: `Игрок ${username} сложил полномочия президента государства ${state.name}. Объявлены новые выборы!`,
      stateId: state.id,
      type: 'resignation',
    });

    await this.electionsService.createElection({
      targetType: 'state',
      targetId: state.id,
      startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      endsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return { success: true, message: 'Вы успешно сложили полномочия лидера государства и запустили новые выборы' };
  }

  async assignRoles(
    id: string,
    dto: { treasurerUsername?: string; voivodeUsername?: string },
    username: string,
  ): Promise<StateEntity> {
    const state = await this.getStateById(id);
    const user = await this.userRepo.findOne({
      where: { username_lower: username.toLowerCase() },
    });

    if ((!state.leaderUsername || state.leaderUsername.toLowerCase() !== username.toLowerCase()) && !user?.isAdmin) {
      throw new ForbiddenException('Только президент или администратор могут назначать роли');
    }

    if (dto.treasurerUsername !== undefined) {
      state.treasurerUsername = dto.treasurerUsername || null;
    }
    if (dto.voivodeUsername !== undefined) {
      state.voivodeUsername = dto.voivodeUsername || null;
    }

    if (state.treasurerUsername && state.treasurerUsername === state.voivodeUsername) {
      throw new BadRequestException('Один гражданин может занимать только одну должность');
    }
    if (state.treasurerUsername && state.treasurerUsername === state.leaderUsername) {
      throw new BadRequestException('Президент не может быть казначеем');
    }
    if (state.voivodeUsername && state.voivodeUsername === state.leaderUsername) {
      throw new BadRequestException('Президент не может быть воеводой');
    }

    return this.stateRepo.save(state);
  }

  // --- Cities ---
  // --- Decrees ---
  async getDecreesForState(stateId: string): Promise<StateDecreeEntity[]> {
    return this.decreeRepo.find({
      where: { stateId },
      order: { createdAt: 'DESC' },
    });
  }

  async createDecree(stateId: string, dto: CreateDecreeDto, authorUsername: string): Promise<StateDecreeEntity> {
    const state = await this.getStateById(stateId);
    if (!state.leaderUsername || state.leaderUsername.toLowerCase() !== authorUsername.toLowerCase()) {
      throw new ForbiddenException('Только президент государства может публиковать указы и законы');
    }
    const decree = this.decreeRepo.create({
      stateId,
      title: dto.title,
      content: dto.content,
      authorUsername,
    });
    return this.decreeRepo.save(decree);
  }

  // --- Diplomacy ---
  async getDiplomacyForState(stateId: string): Promise<StateDiplomacyEntity[]> {
    return this.diplomacyRepo.find({
      where: [{ stateAId: stateId }, { stateBId: stateId }],
    });
  }

  async setDiplomacy(stateId: string, dto: SetDiplomacyDto): Promise<StateDiplomacyEntity> {
    let dip = await this.diplomacyRepo.findOne({
      where: [
        { stateAId: stateId, stateBId: dto.stateBId },
        { stateAId: dto.stateBId, stateBId: stateId },
      ],
    });
    if (!dip) {
      dip = this.diplomacyRepo.create({
        stateAId: stateId,
        stateBId: dto.stateBId,
        status: dto.status,
      });
    } else {
      dip.status = dto.status;
    }
    this.territoriesService.invalidateBlueMapCache();
    return this.diplomacyRepo.save(dip);
  }

  // --- Citizenship Requests ---
  // --- Elections ---
  // --- Treasury ---
  async getStateTreasury(stateId: string): Promise<StateTreasuryItemEntity[]> {
    return this.treasuryRepo.find({
      where: { stateId },
      order: { minecraftItemId: 'ASC' },
    });
  }

  async updateTreasuryItem(
    stateId: string,
    minecraftItemId: string,
    quantity: number,
  ): Promise<StateTreasuryItemEntity> {
    let item = await this.treasuryRepo.findOne({
      where: { stateId, minecraftItemId },
    });

    if (!item) {
      item = this.treasuryRepo.create({
        stateId,
        minecraftItemId,
        quantity,
      });
    } else {
      item.quantity = quantity;
    }

    if (item.quantity <= 0) {
      if (item.id) {
        await this.treasuryRepo.remove(item);
      }
      this.eventEmitter.emit('state.treasury.updated', { stateId });
      return item;
    }

    const saved = await this.treasuryRepo.save(item);
    this.eventEmitter.emit('state.treasury.updated', { stateId });
    return saved;
  }

  async digitizeTreasury(
    stateId: string,
    accountType: string = 'state_reserve',
  ): Promise<{ message: string; items: any[] }> {
    const response = await this.rconService.executeCommand(`safe digitize ${stateId} ${accountType}`);
    try {
      const parsed = JSON.parse(response);
      if (!parsed.success) {
        throw new BadRequestException(parsed.reason || 'Не удалось оцифровать сейф');
      }

      // Обновляем базу данных
      for (const item of parsed.items) {
        const qty = Number(item.qty);
        if (qty > 0) {
          const existing = await this.treasuryRepo.findOne({
            where: { stateId, minecraftItemId: item.id },
          });
          if (existing) {
            existing.quantity += qty;
            await this.treasuryRepo.save(existing);
          } else {
            await this.treasuryRepo.save(
              this.treasuryRepo.create({
                stateId,
                minecraftItemId: item.id,
                quantity: qty,
              }),
            );
          }
        }
      }

      this.eventEmitter.emit('state.treasury.updated', { stateId });

      return { message: 'Сейф успешно оцифрован', items: parsed.items };
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException('Ошибка при парсинге ответа сервера: ' + response);
    }
  }

  // --- Territories ---

  private getConvexHull(points: { x: number; z: number }[]) {
    if (points.length <= 3) return points;

    // Сортируем точки (x, затем z)
    const sorted = [...points].sort((a, b) => (a.x === b.x ? a.z - b.z : a.x - b.x));

    const cross = (o: { x: number; z: number }, a: { x: number; z: number }, b: { x: number; z: number }) => {
      return (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x);
    };

    const lower: { x: number; z: number }[] = [];
    for (let i = 0; i < sorted.length; i++) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], sorted[i]) <= 0) {
        lower.pop();
      }
      lower.push(sorted[i]);
    }

    const upper: { x: number; z: number }[] = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], sorted[i]) <= 0) {
        upper.pop();
      }
      upper.push(sorted[i]);
    }

    upper.pop();
    lower.pop();
    return lower.concat(upper);
  }
}
