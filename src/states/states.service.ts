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
import { CityTerritory } from './entities/city-territory.entity';
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
    @InjectRepository(CityTerritory)
    private readonly territoryRepo: Repository<CityTerritory>,
    private readonly rconService: MinecraftRconService,
    private readonly eventsService: EventsService,
    private readonly autoNewsService: AutoNewsService,
    private readonly eventEmitter: EventEmitter2,
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

    if (state.treasuryAccountNumber) {
      const account = await this.accountRepo.findOne({ where: { accountNumber: state.treasuryAccountNumber } });
      if (account && account.balance > 0) {
        throw new BadRequestException('Невозможно распустить государство, пока в казне есть деньги. Выведите средства.');
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

    await this.eventsService.createEvent({
      title: 'Отставка Президента',
      description: `Игрок ${username} сложил полномочия президента государства ${state.name}. Объявлены новые выборы!`,
      stateId: state.id,
      type: 'resignation',
    });

    await this.createElection({
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
  async getAllCities(stateId?: string): Promise<CityEntity[]> {
    const where = stateId ? { stateId } : {};
    return this.cityRepo.find({
      where,
      relations: ['state', 'citizens'],
      order: { name: 'ASC' },
    });
  }

  async getCityById(id: string): Promise<CityEntity> {
    const city = await this.cityRepo.findOne({
      where: { id },
      relations: ['state', 'citizens', 'citizenshipRequests'],
    });
    if (!city) {
      throw new NotFoundException('Город не найден');
    }
    return city;
  }

  async createCity(dto: CreateCityDto, creatorUsername?: string): Promise<CityEntity> {
    const existing = await this.cityRepo
      .createQueryBuilder('city')
      .where('LOWER(city.name) = LOWER(:name)', { name: dto.name })
      .getOne();

    if (existing) {
      throw new BadRequestException('Город с таким названием уже существует');
    }

    const mayor = dto.mayorUsername || creatorUsername;
    const city = this.cityRepo.create({
      ...dto,
      mayorUsername: mayor,
    });
    
    const saved = await this.cityRepo.save(city);

    if (creatorUsername) {
      this.eventEmitter.emit('city.created', {
        initiatorUsername: creatorUsername,
        cityId: saved.id,
      });
      if (saved.stateId) this.eventEmitter.emit('state.city.updated', { stateId: saved.stateId });
    }

    return saved;
  }

  async updateCity(id: string, dto: UpdateCityDto, username?: string): Promise<CityEntity> {
    const city = await this.getCityById(id);
    if (username) {
      const user = await this.userRepo.findOne({
        where: { username_lower: username.toLowerCase() },
      });
      const isMayor = city.mayorUsername && city.mayorUsername.toLowerCase() === username.toLowerCase();
      const isPresident =
        city.state?.leaderUsername && city.state.leaderUsername.toLowerCase() === username.toLowerCase();
      if (!isMayor && !isPresident && !user?.isAdmin) {
        throw new ForbiddenException(
          'Только мэр города, президент государства или администратор могут редактировать город',
        );
      }
    }

    Object.keys(dto).forEach((key) => {
      if (dto[key] !== undefined) {
        city[key] = dto[key];
      }
    });
    const updated = await this.cityRepo.save(city);
    if (updated.stateId) this.eventEmitter.emit('state.city.updated', { stateId: updated.stateId });
    return updated;
  }

  async deleteCity(id: string, username?: string): Promise<void> {
    const city = await this.getCityById(id);
    if (username) {
      const user = await this.userRepo.findOne({
        where: { username_lower: username.toLowerCase() },
      });
      const isMayor = city.mayorUsername && city.mayorUsername.toLowerCase() === username.toLowerCase();
      const isPresident =
        city.state?.leaderUsername && city.state.leaderUsername.toLowerCase() === username.toLowerCase();

      if (!isMayor && !isPresident && !user?.isAdmin) {
        throw new ForbiddenException('Только мэр, президент или администратор могут удалить город');
      }
    }

    const stateId = city.stateId;
    const result = await this.cityRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Город не найден');
    }
    if (stateId) this.eventEmitter.emit('state.city.updated', { stateId });
  }

  async setCityCapital(id: string, username: string): Promise<CityEntity> {
    const city = await this.getCityById(id);
    if (!city.stateId) {
      throw new BadRequestException('Город не принадлежит ни одному государству');
    }

    const state = await this.getStateById(city.stateId);
    if (state.leaderUsername?.toLowerCase() !== username.toLowerCase()) {
      const user = await this.userRepo.findOne({ where: { username_lower: username.toLowerCase() } });
      if (!user?.isAdmin) {
        throw new ForbiddenException('Только президент государства может назначать столицу');
      }
    }

    // Снимаем столицу с других городов
    await this.cityRepo.update({ stateId: city.stateId }, { isCapital: false });

    city.isCapital = true;
    return this.cityRepo.save(city);
  }

  async addCityImage(id: string, imageUrl: string, username: string): Promise<CityEntity> {
    const city = await this.getCityById(id);
    this.checkCityPermission(city, username);

    if (!city.images) city.images = [];
    if (!city.images.includes(imageUrl)) {
      city.images.push(imageUrl);
    }
    return this.cityRepo.save(city);
  }

  async removeCityImage(id: string, imageUrl: string, username: string): Promise<CityEntity> {
    const city = await this.getCityById(id);
    this.checkCityPermission(city, username);

    if (city.images) {
      city.images = city.images.filter((img) => img !== imageUrl);
    }
    return this.cityRepo.save(city);
  }

  private async checkCityPermission(city: CityEntity, username: string) {
    const user = await this.userRepo.findOne({
      where: { username_lower: username.toLowerCase() },
    });
    const isMayor = city.mayorUsername && city.mayorUsername.toLowerCase() === username.toLowerCase();
    const isPresident =
      city.state?.leaderUsername && city.state.leaderUsername.toLowerCase() === username.toLowerCase();

    if (!isMayor && !isPresident && !user?.isAdmin) {
      throw new ForbiddenException('Только мэр, президент или администратор могут управлять городом');
    }
  }

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
    return this.diplomacyRepo.save(dip);
  }

  // --- Citizenship Requests ---
  async getRequestsForCity(cityId: string): Promise<CitizenshipRequestEntity[]> {
    return this.requestRepo.find({
      where: { cityId },
      order: { createdAt: 'DESC' },
    });
  }

  async createCitizenshipRequest(
    username: string,
    dto: CreateCitizenshipRequestDto,
  ): Promise<CitizenshipRequestEntity> {
    const city = await this.getCityById(dto.cityId);
    const user = await this.userRepo.findOne({
      where: { username_lower: username.toLowerCase() },
    });

    if (user?.cityId === city.id) {
      throw new BadRequestException('Вы уже являетесь жителем этого города');
    }

    if (user?.cityId) {
      const currentCity = await this.cityRepo.findOne({
        where: { id: user.cityId },
      });
      if (currentCity?.mayorUsername && currentCity.mayorUsername.toLowerCase() === username.toLowerCase()) {
        throw new BadRequestException(
          'Вы являетесь мэром своего города и не можете переехать. Сначала сложите полномочия мэра.',
        );
      }

      if (user.stateId && city.stateId && user.stateId !== city.stateId) {
        throw new BadRequestException(
          'Вы не можете переехать в город другого государства. Заявка на переезд возможна только между городами в пределах одного государства.',
        );
      }
    }

    const anyPending = await this.requestRepo.findOne({
      where: { username, status: 'pending' },
    });
    if (anyPending) {
      throw new BadRequestException(
        'У вас уже есть активная заявка на проживание или переезд. Дождитесь её рассмотрения или отмените.',
      );
    }

    const req = this.requestRepo.create({
      username,
      cityId: city.id,
      status: 'pending',
    });
    return this.requestRepo.save(req);
  }

  async reviewCitizenshipRequest(
    requestId: string,
    dto: ReviewCitizenshipRequestDto,
    reviewerUsername: string,
  ): Promise<CitizenshipRequestEntity> {
    const req = await this.requestRepo.findOne({ where: { id: requestId } });
    if (!req) {
      throw new NotFoundException('Заявка не найдена');
    }

    const city = await this.getCityById(req.cityId);

    // Check permissions
    const reviewerUser = await this.userRepo.findOne({
      where: { username_lower: reviewerUsername.toLowerCase() },
    });

    const isAdmin = reviewerUser?.isAdmin || reviewerUser?.role === 'admin';
    const isMayor = city.mayorUsername?.toLowerCase() === reviewerUsername.toLowerCase();
    const isPresident = city.state?.leaderUsername?.toLowerCase() === reviewerUsername.toLowerCase();

    if (!isAdmin && !isMayor && !isPresident) {
      throw new ForbiddenException('У вас нет прав на рассмотрение этой заявки');
    }

    req.status = dto.status;
    const saved = await this.requestRepo.save(req);

    if (dto.status === 'approved') {
      const user = await this.userRepo.findOne({ where: { username_lower: req.username.toLowerCase() } });
      const city = await this.cityRepo.findOne({ where: { id: req.cityId } });
      if (user && city) {
        user.cityId = city.id;
        user.stateId = city.stateId;
        await this.userRepo.save(user);

        this.eventEmitter.emit('city.joined', { initiatorUsername: user.username_lower });
        this.eventEmitter.emit('state.citizens.updated', { stateId: city.stateId });

        const otherRequests = await this.requestRepo.find({
          where: { username: req.username, status: 'pending' },
        });
        for (const other of otherRequests) {
          if (other.id !== req.id) {
            other.status = 'rejected';
            await this.requestRepo.save(other);
          }
        }
      }
    }

    return saved;
  }

  async leaveCity(cityId: string, username?: string): Promise<{ success: boolean; message: string }> {
    if (!username) {
      throw new UnauthorizedException('Необходима авторизация');
    }
    const user = await this.userRepo.findOne({
      where: { username_lower: username.toLowerCase() },
    });
    if (!user || user.cityId !== cityId) {
      throw new BadRequestException('Вы не являетесь жителем этого города');
    }
    const city = await this.getCityById(cityId);
    if (city.mayorUsername && city.mayorUsername.toLowerCase() === username.toLowerCase()) {
      await this.resignMayor(cityId, username);
    }

    const stateId = city.stateId;

    user.cityId = null;
    user.stateId = null;
    await this.userRepo.save(user);

    this.eventEmitter.emit('state.citizens.updated', { stateId });

    return { success: true, message: 'Вы успешно покинули город' };
  }

  async resignMayor(cityId: string, username: string): Promise<{ success: boolean; message: string }> {
    const city = await this.getCityById(cityId);
    if (!city.mayorUsername || city.mayorUsername.toLowerCase() !== username.toLowerCase()) {
      throw new BadRequestException('Вы не являетесь мэром этого города');
    }

    city.mayorUsername = '';
    await this.cityRepo.save(city);

    await this.eventsService.createEvent({
      title: 'Отставка Мэра',
      description: `Игрок ${username} сложил полномочия мэра города ${city.name}. Объявлены новые выборы!`,
      cityId: city.id,
      type: 'resignation',
    });

    await this.createElection({
      targetType: 'city',
      targetId: city.id,
      startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      endsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return { success: true, message: 'Вы успешно сложили полномочия мэра и запустили новые выборы' };
  }

  // --- Elections ---
  async getAllElections(targetType?: string, targetId?: string): Promise<ElectionEntity[]> {
    const where: any = {};
    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = targetId;
    return this.electionRepo.find({
      where,
      relations: ['candidates'],
      order: { createdAt: 'DESC' },
    });
  }

  async getElectionById(id: string): Promise<ElectionEntity> {
    const el = await this.electionRepo.findOne({
      where: { id },
      relations: ['candidates'],
    });
    if (!el) {
      throw new NotFoundException('Выборы не найдены');
    }
    return el;
  }

  async createElection(dto: CreateElectionDto): Promise<ElectionEntity> {
    const el = this.electionRepo.create({
      targetType: dto.targetType,
      targetId: dto.targetId,
      status: 'nomination',
      startsAt: new Date(dto.startsAt),
      endsAt: new Date(dto.endsAt),
    });
    const saved = await this.electionRepo.save(el);

    // Notify about new election in calendar
    const targetName = dto.targetType === 'state' ? 'государстве' : 'городе';
    await this.eventsService.createEvent({
      title: `Выборы в ${targetName}`,
      description: `Начался этап регистрации кандидатов. Выборы завершатся ${new Date(dto.endsAt).toLocaleDateString('ru-RU')}.`,
      type: 'election',
      stateId: dto.targetType === 'state' ? dto.targetId : undefined,
      cityId: dto.targetType === 'city' ? dto.targetId : undefined,
    });

    return saved;
  }

  async nominateCandidate(
    electionId: string,
    username: string,
    dto: NominateCandidateDto,
  ): Promise<ElectionCandidateEntity> {
    const el = await this.getElectionById(electionId);
    const existing = await this.candidateRepo.findOne({
      where: { electionId, username },
    });
    if (existing) {
      throw new BadRequestException('Вы уже выдвинули свою кандидатуру на эти выборы');
    }

    const candidate = await this.userRepo.findOne({ where: { username_lower: username.toLowerCase() } });
    if (!candidate) {
      throw new NotFoundException('Игрок не найден');
    }

    // Проверяем гражданство
    if (el.targetType === 'state') {
      if (!candidate.cityId) {
        throw new ForbiddenException('Вы не состоите ни в одном городе этого государства');
      }
      const candidateCity = await this.cityRepo.findOne({ where: { id: candidate.cityId } });
      if (!candidateCity || candidateCity.stateId !== el.targetId) {
        throw new ForbiddenException('Вы не являетесь гражданином этого государства');
      }
    } else if (el.targetType === 'city') {
      if (candidate.cityId !== el.targetId) {
        throw new ForbiddenException('Вы не являетесь жителем этого города');
      }
    }
    const cand = this.candidateRepo.create({
      electionId,
      username,
      programText: dto.programText || '',
      votesCount: 0,
    });
    return this.candidateRepo.save(cand);
  }

  async voteInElection(electionId: string, voterUsername: string, dto: VoteDto): Promise<{ message: string }> {
    const el = await this.getElectionById(electionId);
    if (el.status !== 'voting' && new Date() < el.startsAt) {
      throw new BadRequestException('Голосование на этих выборах сейчас закрыто');
    }
    const existingVote = await this.voteRepo.findOne({
      where: { electionId, voterUsername },
    });
    if (existingVote) {
      throw new BadRequestException('Вы уже проголосовали на этих выборах');
    }
    const cand = await this.candidateRepo.findOne({
      where: { id: dto.candidateId, electionId },
    });
    if (!cand) {
      throw new NotFoundException('Кандидат не найден');
    }

    const voter = await this.userRepo.findOne({ where: { username_lower: voterUsername.toLowerCase() } });
    if (!voter) {
      throw new NotFoundException('Игрок не найден');
    }

    // Проверяем гражданство
    if (el.targetType === 'state') {
      if (!voter.cityId) {
        throw new ForbiddenException('Вы не состоите ни в одном городе этого государства');
      }
      const voterCity = await this.cityRepo.findOne({ where: { id: voter.cityId } });
      if (!voterCity || voterCity.stateId !== el.targetId) {
        throw new ForbiddenException('Вы не являетесь гражданином этого государства');
      }
    } else if (el.targetType === 'city') {
      if (voter.cityId !== el.targetId) {
        throw new ForbiddenException('Вы не являетесь жителем этого города');
      }
    }

    const vote = this.voteRepo.create({
      electionId,
      voterUsername,
      candidateId: dto.candidateId,
    });
    await this.voteRepo.save(vote);

    cand.votesCount = (cand.votesCount || 0) + 1;
    await this.candidateRepo.save(cand);

    if (el.targetType === 'state') {
      this.eventEmitter.emit('election.president.voted', { initiatorUsername: voterUsername.toLowerCase() });
    } else if (el.targetType === 'city') {
      this.eventEmitter.emit('election.mayor.voted', { initiatorUsername: voterUsername.toLowerCase() });
    }

    return { message: 'Ваш голос учтен!' };
  }

  async concludeElection(electionId: string): Promise<{ message: string; winner?: string }> {
    const el = await this.electionRepo.findOne({
      where: { id: electionId },
      relations: ['candidates'],
    });
    if (!el) {
      throw new NotFoundException('Выборы не найдены');
    }
    if (el.status === 'completed') {
      throw new BadRequestException('Выборы уже завершены');
    }

    let winnerUsername = '';
    let maxVotes = -1;

    if (el.candidates && el.candidates.length > 0) {
      for (const cand of el.candidates) {
        if ((cand.votesCount || 0) > maxVotes) {
          maxVotes = cand.votesCount || 0;
          winnerUsername = cand.username;
        }
      }
    }

    el.status = 'completed';
    await this.electionRepo.save(el);

    if (winnerUsername) {
      if (el.targetType === 'city') {
        const city = await this.getCityById(el.targetId);
        city.mayorUsername = winnerUsername;
        await this.cityRepo.save(city);

        await this.eventsService.createEvent({
          title: 'Итоги выборов Мэра',
          description: `Победителем выборов в городе ${city.name} стал ${winnerUsername} с результатом ${maxVotes} голосов.`,
          cityId: city.id,
          type: 'election',
        });

        this.eventEmitter.emit('election.mayor.won', { initiatorUsername: winnerUsername });
      } else if (el.targetType === 'state') {
        const state = await this.getStateById(el.targetId);
        state.leaderUsername = winnerUsername;
        await this.stateRepo.save(state);

        await this.eventsService.createEvent({
          title: 'Итоги выборов Президента',
          description: `Президентом государства ${state.name} избран ${winnerUsername} (голосов: ${maxVotes}).`,
          stateId: state.id,
          type: 'election',
        });

        this.eventEmitter.emit('election.president.won', { initiatorUsername: winnerUsername });
      }
    } else {
      // No candidates or votes
      if (el.targetType === 'city') {
        await this.eventsService.createEvent({
          title: 'Выборы Мэра несостоялись',
          description: 'На выборах не оказалось ни одного кандидата с голосами.',
          cityId: el.targetId,
          type: 'election',
        });
      } else {
        await this.eventsService.createEvent({
          title: 'Выборы Президента несостоялись',
          description: 'На выборах не оказалось ни одного кандидата с голосами.',
          stateId: el.targetId,
          type: 'election',
        });
      }
    }

    return { message: 'Выборы успешно завершены', winner: winnerUsername };
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleElectionPhases() {
    const now = new Date();
    const toVotingElections = await this.electionRepo
      .createQueryBuilder('election')
      .where('election.status = :status', { status: 'nomination' })
      .andWhere('election.startsAt <= :now', { now })
      .getMany();

    for (const el of toVotingElections) {
      el.status = 'voting';
      await this.electionRepo.save(el);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleEndedElections() {
    const now = new Date();
    const endedElections = await this.electionRepo
      .createQueryBuilder('election')
      .where('election.status != :status', { status: 'completed' })
      .andWhere('election.endsAt <= :now', { now })
      .getMany();

    for (const el of endedElections) {
      try {
        await this.concludeElection(el.id);
      } catch (err) {
        console.error(`Ошибка при завершении выборов ${el.id}:`, err);
      }
    }
  }

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
  public async addCityTerritory(
    cityId: string,
    minX: number,
    minY: number,
    minZ: number,
    maxX: number,
    maxY: number,
    maxZ: number,
  ) {
    const city = await this.cityRepo.findOne({ where: { id: cityId } });
    if (!city) {
      throw new NotFoundException('Город не найден');
    }

    // Ensure min is actually min and max is max
    const actualMinX = Math.min(minX, maxX);
    const actualMaxX = Math.max(minX, maxX);
    const actualMinY = Math.min(minY, maxY);
    const actualMaxY = Math.max(minY, maxY);
    const actualMinZ = Math.min(minZ, maxZ);
    const actualMaxZ = Math.max(minZ, maxZ);

    // AABB Collision check
    const overlapping = await this.territoryRepo
      .createQueryBuilder('t')
      .where(':minX <= t.maxX', { minX: actualMinX })
      .andWhere(':maxX >= t.minX', { maxX: actualMaxX })
      .andWhere(':minY <= t.maxY', { minY: actualMinY })
      .andWhere(':maxY >= t.minY', { maxY: actualMaxY })
      .andWhere(':minZ <= t.maxZ', { minZ: actualMinZ })
      .andWhere(':maxZ >= t.minZ', { maxZ: actualMaxZ })
      .getOne();

    if (overlapping) {
      throw new BadRequestException('Указанная зона пересекается с уже существующей территорией');
    }

    const territory = this.territoryRepo.create({
      cityId,
      minX: actualMinX,
      minY: actualMinY,
      minZ: actualMinZ,
      maxX: actualMaxX,
      maxY: actualMaxY,
      maxZ: actualMaxZ,
    });

    return this.territoryRepo.save(territory);
  }

  public async getAllTerritories() {
    return this.territoryRepo.find({
      relations: ['city', 'city.state'],
    });
  }

  private getConvexHull(points: { x: number, z: number }[]) {
    if (points.length <= 3) return points;
    
    // Сортируем точки (x, затем z)
    const sorted = [...points].sort((a, b) => a.x === b.x ? a.z - b.z : a.x - b.x);

    const cross = (o: { x: number, z: number }, a: { x: number, z: number }, b: { x: number, z: number }) => {
      return (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x);
    };

    const lower: { x: number, z: number }[] = [];
    for (let i = 0; i < sorted.length; i++) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], sorted[i]) <= 0) {
        lower.pop();
      }
      lower.push(sorted[i]);
    }

    const upper: { x: number, z: number }[] = [];
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

  private clusterTerritories(territories: any[], distanceThreshold: number): any[][] {
    if (!territories || territories.length === 0) return [];
    
    const clusters: any[][] = [];
    const visited = new Set<string>();

    const getCenter = (t: any) => ({
      x: (t.minX + t.maxX) / 2,
      z: (t.minZ + t.maxZ) / 2
    });

    const getDistance = (t1: any, t2: any) => {
      const c1 = getCenter(t1);
      const c2 = getCenter(t2);
      return Math.hypot(c1.x - c2.x, c1.z - c2.z);
    };

    for (const t of territories) {
      if (visited.has(t.id)) continue;

      const currentCluster = [t];
      visited.add(t.id);
      
      let i = 0;
      while (i < currentCluster.length) {
        const curr = currentCluster[i];
        for (const other of territories) {
          if (!visited.has(other.id) && getDistance(curr, other) <= distanceThreshold) {
            visited.add(other.id);
            currentCluster.push(other);
          }
        }
        i++;
      }
      clusters.push(currentCluster);
    }

    return clusters;
  }

  public async getBlueMapMarkers(mapName: string = 'world'): Promise<any> {
    const territories = await this.territoryRepo.find({
      relations: ['city', 'city.state'],
    });

    const markersData: Record<string, any> = {};
    const bordersData: Record<string, any> = {};
    const stateBordersData: Record<string, any> = {};
    
    const cityGroups: Record<string, { city: any, territories: any[] }> = {};
    const stateGroups: Record<string, { state: any, territories: any[] }> = {};

    territories.forEach(t => {
      if (!cityGroups[t.city.id]) {
        cityGroups[t.city.id] = { city: t.city, territories: [] };
      }
      cityGroups[t.city.id].territories.push(t);

      if (t.city.state) {
        if (!stateGroups[t.city.state.id]) {
          stateGroups[t.city.state.id] = { state: t.city.state, territories: [] };
        }
        stateGroups[t.city.state.id].territories.push(t);
      }

      const stateName = t.city.state?.name || 'Независимый город';
      
      let hash = 0;
      for (let i = 0; i < stateName.length; i++) {
        hash = stateName.charCodeAt(i) + ((hash << 5) - hash);
      }
      let hexColor = '#';
      for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xff;
        hexColor += ('00' + value.toString(16)).substr(-2);
      }
      
      const r = parseInt(hexColor.slice(1, 3), 16) || 255;
      const g = parseInt(hexColor.slice(3, 5), 16) || 0;
      const b = parseInt(hexColor.slice(5, 7), 16) || 0;

      // 1. 3D Зона (без label, чтобы избежать бага LabelPopup при клике)
      markersData[t.id + "_zone"] = {
        type: "extrude",
        position: { x: (t.minX + t.maxX) / 2, y: t.maxY ?? 64, z: (t.minZ + t.maxZ) / 2 },
        shape: [
          { x: t.minX, z: t.minZ },
          { x: t.maxX, z: t.minZ },
          { x: t.maxX, z: t.maxZ },
          { x: t.minX, z: t.maxZ }
        ],
        shapeMinY: t.minY ?? -64,
        shapeMaxY: t.maxY ?? 319,
        fillColor: { r, g, b, a: 0.15 }, // Делаем приваты прозрачнее
        lineColor: { r, g, b, a: 0.3 },  // Границы приватов мягкие
        depthTestEnabled: false,
        listed: false // Не дублируем в меню
      };

    });

    Object.values(cityGroups).forEach(group => {
      const clusters = this.clusterTerritories(group.territories, 800); // 800 блоков для города
      if (clusters.length === 0) return;

      let largestCluster = clusters[0];

      clusters.forEach((cluster, index) => {
        if (cluster.length > largestCluster.length) largestCluster = cluster;

        const points: {x: number, z: number}[] = [];
        let minY = Infinity;
        let maxY = -Infinity;

        cluster.forEach(t => {
          points.push({ x: t.minX, z: t.minZ }, { x: t.maxX, z: t.minZ }, { x: t.maxX, z: t.maxZ }, { x: t.minX, z: t.maxZ });
          const tMin = t.minY ?? -64;
          const tMax = t.maxY ?? 319;
          if (tMin < minY) minY = tMin;
          if (tMax > maxY) maxY = tMax;
        });

        const hull = this.getConvexHull(points);
        if (hull.length < 3) return;

        const stateName = group.city.state?.name || 'Независимый город';
        let hash = 0;
        for (let i = 0; i < stateName.length; i++) hash = stateName.charCodeAt(i) + ((hash << 5) - hash);
        let hexColor = '#';
        for (let i = 0; i < 3; i++) hexColor += ('00' + ((hash >> (i * 8)) & 0xff).toString(16)).substr(-2);
        
        const r = parseInt(hexColor.slice(1, 3), 16) || 255;
        const g = parseInt(hexColor.slice(3, 5), 16) || 0;
        const b = parseInt(hexColor.slice(5, 7), 16) || 0;

        bordersData[`${group.city.id}_border_${index}`] = {
          type: "extrude",
          position: { x: hull[0].x, y: (minY + maxY) / 2, z: hull[0].z },
          shape: hull,
          shapeMinY: minY,
          shapeMaxY: maxY,
          fillColor: { r, g, b, a: 0.05 },
          lineColor: { r, g, b, a: 1.0 },
          depthTestEnabled: false,
          listed: false
        };
      });

      // Лейбл города вешаем только на самый крупный кластер
      const labelPoints: {x: number, z: number}[] = [];
      let labelMaxY = -Infinity;
      largestCluster.forEach(t => {
        labelPoints.push({ x: t.minX, z: t.minZ }, { x: t.maxX, z: t.minZ }, { x: t.maxX, z: t.maxZ }, { x: t.minX, z: t.maxZ });
        const tMax = t.maxY ?? 319;
        if (tMax > labelMaxY) labelMaxY = tMax;
      });

      const centerX = (Math.min(...labelPoints.map(p => p.x)) + Math.max(...labelPoints.map(p => p.x))) / 2;
      const centerZ = (Math.min(...labelPoints.map(p => p.z)) + Math.max(...labelPoints.map(p => p.z))) / 2;

      const flagHtml = group.city.flagUrl 
        ? `<img src="${group.city.flagUrl}" style="width: 32px; height: 32px; object-fit: contain; margin-bottom: 4px; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.5)); border-radius: 4px;" /><br>` 
        : '';
      const stateNameStr = group.city.state?.name || 'Независимый город';

      bordersData[`${group.city.id}_label`] = {
        type: "html",
        html: `<div style="display: flex; flex-direction: column; align-items: center; color: white; font-weight: bold; text-shadow: 1px 1px 2px black, -1px -1px 2px black, 1px -1px 2px black, -1px 1px 2px black; font-size: 14px; text-align: center; pointer-events: none; transform: translate(-50%, -50%);">${flagHtml}<div>${group.city.name}</div><div style="font-size: 11px; color: #ccc;">${stateNameStr}</div></div>`,
        position: { x: centerX, y: labelMaxY + 10, z: centerZ },
        anchor: { x: 0.5, y: 0.5 },
        classes: [],
        listed: false
      };
    });

    Object.values(stateGroups).forEach(group => {
      const clusters = this.clusterTerritories(group.territories, 1500); // 1500 блоков для государства
      if (clusters.length === 0) return;

      let largestCluster = clusters[0];

      clusters.forEach((cluster, index) => {
        if (cluster.length > largestCluster.length) largestCluster = cluster;

        const points: {x: number, z: number}[] = [];
        let minY = Infinity;
        let maxY = -Infinity;

        cluster.forEach(t => {
          points.push({ x: t.minX, z: t.minZ }, { x: t.maxX, z: t.minZ }, { x: t.maxX, z: t.maxZ }, { x: t.minX, z: t.maxZ });
          const tMin = t.minY ?? -64;
          const tMax = t.maxY ?? 319;
          if (tMin < minY) minY = tMin;
          if (tMax > maxY) maxY = tMax;
        });

        const hull = this.getConvexHull(points);
        if (hull.length < 3) return;

        const stateName = group.state.name;
        let hash = 0;
        for (let i = 0; i < stateName.length; i++) hash = stateName.charCodeAt(i) + ((hash << 5) - hash);
        let hexColor = '#';
        for (let i = 0; i < 3; i++) hexColor += ('00' + ((hash >> (i * 8)) & 0xff).toString(16)).substr(-2);
        
        const r = parseInt(hexColor.slice(1, 3), 16) || 255;
        const g = parseInt(hexColor.slice(3, 5), 16) || 0;
        const b = parseInt(hexColor.slice(5, 7), 16) || 0;

        stateBordersData[`${group.state.id}_border_${index}`] = {
          type: "extrude",
          position: { x: hull[0].x, y: (minY + maxY) / 2, z: hull[0].z },
          shape: hull,
          shapeMinY: minY,
          shapeMaxY: maxY,
          fillColor: { r, g, b, a: 0.02 }, // ОЧЕНЬ слабая заливка для всего государства
          lineColor: { r, g, b, a: 1.0 },
          depthTestEnabled: false,
          listed: false
        };
      });

      const labelPoints: {x: number, z: number}[] = [];
      let labelMaxY = -Infinity;
      largestCluster.forEach(t => {
        labelPoints.push({ x: t.minX, z: t.minZ }, { x: t.maxX, z: t.minZ }, { x: t.maxX, z: t.maxZ }, { x: t.minX, z: t.maxZ });
        const tMax = t.maxY ?? 319;
        if (tMax > labelMaxY) labelMaxY = tMax;
      });

      const emblemUrl = group.state.coatOfArmsUrl || group.state.flagUrl;
      const flagHtml = emblemUrl
        ? `<img src="${emblemUrl}" style="width: 48px; height: 48px; object-fit: contain; margin-bottom: 4px; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.5)); border-radius: 4px;" /><br>` 
        : '';

      const centerX = (Math.min(...labelPoints.map(p => p.x)) + Math.max(...labelPoints.map(p => p.x))) / 2;
      const centerZ = (Math.min(...labelPoints.map(p => p.z)) + Math.max(...labelPoints.map(p => p.z))) / 2;

      stateBordersData[`${group.state.id}_label`] = {
        type: "html",
        html: `<div style="display: flex; flex-direction: column; align-items: center; color: white; font-weight: bold; text-shadow: 1px 1px 2px black, -1px -1px 2px black, 1px -1px 2px black, -1px 1px 2px black; font-size: 18px; text-align: center; pointer-events: none; transform: translate(-50%, -50%);">${flagHtml}<div>${group.state.name}</div></div>`,
        position: { x: centerX, y: labelMaxY + 30, z: centerZ },
        anchor: { x: 0.5, y: 0.5 },
        classes: [],
        listed: false
      };
    });

    let originalMarkers: any = {};
    try {
      // Пытаемся получить оригинальные маркеры (игроки, точки), чтобы не стереть их
      const res = await fetch(`http://minecraft_server:8100/maps/${mapName}/live/markers.json`);
      if (res.ok) {
        originalMarkers = await res.json();
      }
    } catch (e) {
      console.error('Failed to fetch original BlueMap markers', e);
    }

    originalMarkers['city_territories_layer'] = {
      label: "Приваты (зоны)",
      toggleable: true,
      defaultHide: false,
      markers: markersData
    };

    originalMarkers['city_borders_layer'] = {
      label: "Границы городов",
      toggleable: true,
      defaultHide: false,
      markers: bordersData
    };

    originalMarkers['state_borders_layer'] = {
      label: "Границы государств",
      toggleable: true,
      defaultHide: false,
      markers: stateBordersData
    };

    return originalMarkers;
  }
}
