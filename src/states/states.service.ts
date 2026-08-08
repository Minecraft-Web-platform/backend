import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
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
import { User } from '../users/entities/user.entity';
import { Account } from '../economy/entities/account.entity';
import { MinecraftRconService } from '../minecraft-rcon/minecraft-rcon.service';
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
    private readonly rconService: MinecraftRconService,
  ) {}

  // --- States ---
  async getAllStates(): Promise<StateEntity[]> {
    return this.stateRepo.find({
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
    return savedState;
  }

  async updateState(
    id: string,
    dto: UpdateStateDto,
    username?: string,
  ): Promise<StateEntity> {
    const state = await this.getStateById(id);
    if (username) {
      const user = await this.userRepo.findOne({
        where: { username_lower: username.toLowerCase() },
      });
      const isLeader =
        state.leaderUsername &&
        state.leaderUsername.toLowerCase() === username.toLowerCase();
      if (!isLeader && !user?.isAdmin) {
        throw new ForbiddenException(
          'Только президент государства или администратор могут вносить изменения в государство',
        );
      }
    }
    if (dto.taxRate !== undefined) {
      if (dto.taxRate < 0 || dto.taxRate > 100) {
        throw new BadRequestException('Ставка налога должна быть от 0 до 100%');
      }
    }
    Object.assign(state, dto);
    return this.stateRepo.save(state);
  }

  async createNationalBank(
    stateId: string,
    username: string,
    bankName?: string,
  ): Promise<Account> {
    const state = await this.getStateById(stateId);
    if (
      !state.leaderUsername ||
      state.leaderUsername.toLowerCase() !== username.toLowerCase()
    ) {
      throw new ForbiddenException(
        'Только правитель государства может учреждать Национальный банк',
      );
    }
    if (state.treasuryAccountNumber) {
      throw new BadRequestException(
        'Национальный банк этого государства уже учрежден!',
      );
    }

    const accountNumber =
      '40817' +
      Math.floor(100000000000000 + Math.random() * 900000000000000).toString();

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
    const result = await this.stateRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Государство не найдено');
    }
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

  async createCity(
    dto: CreateCityDto,
    creatorUsername?: string,
  ): Promise<CityEntity> {
    const mayor = dto.mayorUsername || creatorUsername;
    const city = this.cityRepo.create({
      ...dto,
      mayorUsername: mayor,
    });
    return this.cityRepo.save(city);
  }

  async updateCity(
    id: string,
    dto: UpdateCityDto,
    username?: string,
  ): Promise<CityEntity> {
    const city = await this.getCityById(id);
    if (username) {
      const user = await this.userRepo.findOne({
        where: { username_lower: username.toLowerCase() },
      });
      const isMayor =
        city.mayorUsername &&
        city.mayorUsername.toLowerCase() === username.toLowerCase();
      const isPresident =
        city.state?.leaderUsername &&
        city.state.leaderUsername.toLowerCase() === username.toLowerCase();
      if (!isMayor && !isPresident && !user?.isAdmin) {
        throw new ForbiddenException(
          'Только мэр города, президент государства или администратор могут редактировать город',
        );
      }
    }
    if (dto.taxRate !== undefined) {
      if (dto.taxRate < 0 || dto.taxRate > 100) {
        throw new BadRequestException('Ставка налога должна быть от 0 до 100%');
      }
    }
    Object.assign(city, dto);
    return this.cityRepo.save(city);
  }

  async deleteCity(id: string, username?: string): Promise<void> {
    const city = await this.getCityById(id);
    if (username) {
      const user = await this.userRepo.findOne({
        where: { username_lower: username.toLowerCase() },
      });
      const isMayor = city.mayorUsername && city.mayorUsername.toLowerCase() === username.toLowerCase();
      const isPresident = city.state?.leaderUsername && city.state.leaderUsername.toLowerCase() === username.toLowerCase();
      
      if (!isMayor && !isPresident && !user?.isAdmin) {
        throw new ForbiddenException('Только мэр, президент или администратор могут удалить город');
      }
    }
    
    const result = await this.cityRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Город не найден');
    }
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
    await this.cityRepo.update(
      { stateId: city.stateId },
      { isCapital: false }
    );

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
      city.images = city.images.filter(img => img !== imageUrl);
    }
    return this.cityRepo.save(city);
  }

  private async checkCityPermission(city: CityEntity, username: string) {
    const user = await this.userRepo.findOne({
      where: { username_lower: username.toLowerCase() },
    });
    const isMayor = city.mayorUsername && city.mayorUsername.toLowerCase() === username.toLowerCase();
    const isPresident = city.state?.leaderUsername && city.state.leaderUsername.toLowerCase() === username.toLowerCase();
    
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

  async createCitizenshipRequest(username: string, dto: CreateCitizenshipRequestDto): Promise<CitizenshipRequestEntity> {
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
      if (
        currentCity?.mayorUsername &&
        currentCity.mayorUsername.toLowerCase() === username.toLowerCase()
      ) {
        throw new BadRequestException(
          'Вы являетесь мэром своего города и не можете переехать. Сначала сложите полномочия мэра.',
        );
      }

      if (
        user.stateId &&
        city.stateId &&
        user.stateId !== city.stateId
      ) {
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

  async reviewCitizenshipRequest(requestId: string, dto: ReviewCitizenshipRequestDto): Promise<CitizenshipRequestEntity> {
    const req = await this.requestRepo.findOne({ where: { id: requestId } });
    if (!req) {
      throw new NotFoundException('Заявка не найдена');
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
    if (
      city.mayorUsername &&
      city.mayorUsername.toLowerCase() === username.toLowerCase()
    ) {
      throw new BadRequestException(
        'Мэр не может покинуть город. Сначала сложите или передайте полномочия.',
      );
    }

    user.cityId = null;
    user.stateId = null;
    await this.userRepo.save(user);

    return { success: true, message: 'Вы успешно покинули город' };
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
    return this.electionRepo.save(el);
  }

  async nominateCandidate(electionId: string, username: string, dto: NominateCandidateDto): Promise<ElectionCandidateEntity> {
    await this.getElectionById(electionId);
    const existing = await this.candidateRepo.findOne({
      where: { electionId, username },
    });
    if (existing) {
      throw new BadRequestException('Вы уже выдвинули свою кандидатуру на эти выборы');
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

    const vote = this.voteRepo.create({
      electionId,
      voterUsername,
      candidateId: dto.candidateId,
    });
    await this.voteRepo.save(vote);

    cand.votesCount = (cand.votesCount || 0) + 1;
    await this.candidateRepo.save(cand);

    return { message: 'Ваш голос учтен!' };
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
      return item;
    }

    return this.treasuryRepo.save(item);
  }

  async digitizeTreasury(stateId: string, accountType: string = 'state_reserve'): Promise<{ message: string; items: any[] }> {
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
          let existing = await this.treasuryRepo.findOne({
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
              })
            );
          }
        }
      }
      return { message: 'Сейф успешно оцифрован', items: parsed.items };
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException('Ошибка при парсинге ответа сервера: ' + response);
    }
  }

  async withdrawTreasury(stateId: string, accountType: string, minecraftItemId: string, quantity: number): Promise<{ message: string }> {
    // Сначала проверяем баланс в БД
    const item = await this.treasuryRepo.findOne({
      where: { stateId, minecraftItemId },
    });
    
    if (!item || item.quantity < quantity) {
      throw new BadRequestException('Недостаточно предметов в казне государства');
    }

    const response = await this.rconService.executeCommand(`safe withdraw ${stateId} ${accountType} ${minecraftItemId} ${quantity}`);
    try {
      const parsed = JSON.parse(response);
      if (!parsed.success) {
        throw new BadRequestException(parsed.reason || 'Сейф переполнен или выгружен из памяти сервера (подойдите к нему в игре).');
      }

      // Списываем баланс только если RCON вернул success
      item.quantity -= quantity;
      if (item.quantity <= 0) {
        await this.treasuryRepo.remove(item);
      } else {
        await this.treasuryRepo.save(item);
      }

      return { message: 'Предметы успешно выведены в сейф' };
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException('Ошибка при парсинге ответа сервера: ' + response);
    }
  }
}
